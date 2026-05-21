const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const multer = require('multer');
const { crypto } = require('crypto');
const path = require('path');

// Load environment configurations
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware configuration
const rawOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const clientOrigin = rawOrigin.endsWith('/') ? rawOrigin.slice(0, -1) : rawOrigin;

app.use(cors({
  origin: [clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://192.168.1.11:5173'],
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Set up file uploads storage rules
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP are supported.'));
    }
  }
});

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your_project_id')) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    console.log('✅ Supabase client initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('⚠️ Supabase URL or Service Key is unconfigured. Running DB in Mock Fallback Mode.');
}

// Auto-bootstrap: ensure all required tables and storage bucket exist on startup
async function bootstrapDatabase() {
  if (!supabaseAdmin) return;

  console.log('🔧 Bootstrapping Supabase schema...');

  // --- Ensure storage bucket 'scans' exists ---
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets && buckets.some(b => b.name === 'scans');
    if (!bucketExists) {
      const { error: bucketErr } = await supabaseAdmin.storage.createBucket('scans', { public: true });
      if (bucketErr) {
        console.error('❌ Failed to create storage bucket "scans":', bucketErr.message);
      } else {
        console.log('✅ Storage bucket "scans" created.');
      }
    } else {
      console.log('✅ Storage bucket "scans" already exists.');
    }
  } catch (e) {
    console.warn('⚠️ Could not verify/create storage bucket:', e.message);
  }

  // --- Ensure DB tables exist via Supabase REST (using raw SQL through the pg RPC) ---
  // We use a try/insert probe to check table existence instead of raw SQL
  // because the REST API doesn't expose DDL directly without pg_net or a custom function.
  const tableChecks = [
    {
      table: 'scans',
      create: `
        create table if not exists public.scans (
          id                    uuid primary key default gen_random_uuid(),
          image_url             text not null,
          thumbnail_url         text,
          image_storage_path    text,
          session_id            text,
          object_type           text,
          confidence            numeric(5,4),
          is_ewaste             boolean default false,
          waste_category        text,
          material              text,
          condition             text,
          hazard_level          text,
          hazard_reasons        jsonb,
          reuse_suggestions     jsonb,
          recycling_instructions text,
          decomposition_years   integer,
          co2_saved_kg          numeric(10,4),
          gemini_response       jsonb,
          created_at            timestamp with time zone default now(),
          updated_at            timestamp with time zone
        );
        create index if not exists idx_scans_session_id on public.scans(session_id);
      `
    },
    {
      table: 'analytics_events',
      create: `
        create table if not exists public.analytics_events (
          id          uuid primary key default gen_random_uuid(),
          session_id  text,
          event_type  text,
          event_data  jsonb,
          created_at  timestamp with time zone default now()
        );
      `
    },
    {
      table: 'facilities',
      create: `
        create table if not exists public.facilities (
          id             text primary key,
          name           text not null,
          type           text,
          latitude       numeric(10,6),
          longitude      numeric(10,6),
          address        text,
          verified       boolean default false,
          accepted_waste jsonb,
          created_at     timestamp with time zone default now()
        );
      `
    }
  ];

  for (const { table, create } of tableChecks) {
    try {
      // Probe: try to select 0 rows – if the table is missing PostgREST returns PGRST205
      const { error } = await supabaseAdmin.from(table).select('id').limit(0);
      if (error && error.code === 'PGRST205') {
        // Table is missing – use pg_net / raw SQL via the management API if available
        // For now, log the SQL the user should run manually
        console.warn(`⚠️  Table "public.${table}" not found. Please run the following SQL in Supabase SQL Editor:\n\n${create}`);
      } else {
        console.log(`✅ Table "public.${table}" is ready.`);
      }
    } catch (e) {
      console.warn(`⚠️  Could not verify table "${table}":`, e.message);
    }
  }

  console.log('🔧 Bootstrap complete.');
}


// Initialize Gemini SDK
const geminiApiKey = process.env.GEMINI_API_KEY;
let genAI = null;
if (geminiApiKey && !geminiApiKey.includes('your_gemini_api_key')) {
  try {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    console.log('✅ Google Gemini SDK initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Gemini SDK:', err.message);
  }
} else {
  console.warn('⚠️ Google Gemini API Key is unconfigured. Running AI in Mock Fallback Mode.');
}

// In-Memory fallback store for database operations when Supabase is unconfigured
const localScanStore = new Map();
const localDecisionsStore = [];

// ==========================================
// TEXT-ONLY AI — DeepSeek via OpenRouter
// Used when image vision is unavailable (quota exceeded)
// User provides the object name, AI generates full analysis
// ==========================================
const TEXT_MODELS = [
  'deepseek/deepseek-v4-flash:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
];

async function callTextAI(prompt) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey || openRouterKey.includes('your_openrouter')) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  let lastError = null;
  for (const model of TEXT_MODELS) {
    try {
      console.log(`🤖 Trying text model: ${model}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Resiklo'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' }
        })
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        const err = new Error(`${model} ${response.status}: ${errText.substring(0, 150)}`);
        err.status = response.status;
        if (response.status === 429 || response.status === 404 || response.status === 503) {
          console.warn(`⚠️ Text model ${model} unavailable (${response.status}), trying next…`);
          lastError = err;
          continue;
        }
        throw err;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from text model');

      console.log(`✅ Text AI success with model: ${model}`);
      return JSON.parse(text);
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn(`⚠️ Text model ${model} timed out, trying next…`);
        lastError = err;
        continue;
      }
      if (err.status === 429 || err.status === 404 || err.status === 503) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('All text AI models exhausted.');
}

// OpenRouter provides free access to multiple models including Gemini
// Sign up free at https://openrouter.ai to get OPENROUTER_API_KEY
// ==========================================
const fetch = require('node-fetch');

const OPENROUTER_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'nvidia/nemotron-nano-12b-v2-vl:free',
];

async function callOpenRouter(promptParts) {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey || openRouterKey.includes('your_openrouter')) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const textParts = promptParts.filter(p => typeof p === 'string');
  const imageParts = promptParts.filter(p => p && p.inlineData);

  const content = [];
  if (imageParts.length > 0) {
    const img = imageParts[0].inlineData;
    content.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.data}` }
    });
  }
  content.push({ type: 'text', text: textParts.join('\n') });

  let lastError = null;
  for (const model of OPENROUTER_MODELS) {
    try {
      console.log(`🤖 Trying OpenRouter model: ${model}`);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openRouterKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Resiklo'
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content }],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        const err = new Error(`OpenRouter ${response.status}: ${errText.substring(0, 200)}`);
        err.status = response.status;
        if (response.status === 429 || response.status === 404) {
          console.warn(`⚠️ Model ${model} unavailable (${response.status}), trying next…`);
          lastError = err;
          continue;
        }
        throw err;
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content;
      if (!text) throw new Error('Empty response from OpenRouter');

      console.log(`✅ OpenRouter success with model: ${model}`);
      return JSON.parse(text);
    } catch (err) {
      if (err.status === 429 || err.status === 404) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('All OpenRouter models exhausted.');
}

// ==========================================
// GEMINI SDK FALLBACK CHAIN (used if OpenRouter not configured)
// ==========================================
const GEMINI_MODEL_CHAIN = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
];

async function callGemini(promptParts) {
  // Try OpenRouter first (free, no IP quota issues)
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey && !openRouterKey.includes('your_openrouter')) {
    try {
      return await callOpenRouter(promptParts);
    } catch (err) {
      console.warn('⚠️ OpenRouter failed, trying Gemini SDK:', err.message);
    }
  }

  // Fall back to Gemini SDK
  if (!genAI) throw new Error('No AI provider configured. Set OPENROUTER_API_KEY or GEMINI_API_KEY.');

  let lastError = null;
  for (const modelName of GEMINI_MODEL_CHAIN) {
    try {
      console.log(`🤖 Trying Gemini model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json'
        }
      });
      const result = await model.generateContent(promptParts);
      const text = result.response.text();
      console.log(`✅ Gemini success with model: ${modelName}`);
      return JSON.parse(text);
    } catch (err) {
      const status = err.status || err.statusCode || 0;
      const errMsg = err.message || '';

      // Auth/key errors — stop immediately, no point trying other models
      const isAuthError = status === 400 || status === 401 || status === 403 ||
        errMsg.includes('API_KEY_INVALID') ||
        errMsg.includes('API Key not found') ||
        errMsg.includes('PERMISSION_DENIED');
      if (isAuthError) {
        console.error(`❌ Auth error with Gemini API key. Get a new key at https://aistudio.google.com/app/apikey`);
        throw err; // throw immediately — no point trying other models
      }

      // Rate limit or model not found — try next model
      const isRateLimit = status === 429 || errMsg.includes('429');
      const isNotFound  = status === 404 || (errMsg.toLowerCase().includes('not found'));
      if (isRateLimit || isNotFound) {
        console.warn(`⚠️  Model ${modelName} unavailable (${status}), trying next…`);
        lastError = err;
        continue;
      }

      // Any other unexpected error — throw
      throw err;
    }
  }
  throw lastError || new Error('All Gemini models exhausted. Please try again later.');
}

// ==========================================
// API ROUTES
// ==========================================


// 1. Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mode: supabaseAdmin ? 'production' : 'development-mock',
    aiEnabled: !!genAI
  });
});

// 2. Upload Scan Image endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const base64Data = req.body.imageBase64; // Fallback if uploaded as base64 JSON
    const sessionId = req.body.sessionId || 'session_' + Math.random().toString(36).substring(2, 11);
    
    let imageUrl = '';
    let scanId = 'scan_' + Math.random().toString(36).substring(2, 15);
    let fileName = '';

    if (!file && !base64Data) {
      return res.status(400).json({ error: 'No image assets provided' });
    }

    let buffer;
    let mimeType = 'image/jpeg';
    if (file) {
      buffer = file.buffer;
      mimeType = file.mimetype;
      fileName = `${sessionId}/${Date.now()}-${file.originalname}`;
    } else {
      // Decode base64 fallback
      const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        mimeType = matches[1];
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(base64Data, 'base64');
      }
      fileName = `${sessionId}/${Date.now()}-upload.jpg`;
    }

    if (supabaseAdmin) {
      // Production path: upload image to Supabase Bucket 'scans'
      const { error: uploadError } = await supabaseAdmin.storage
        .from('scans')
        .upload(fileName, buffer, {
          contentType: mimeType,
          cacheControl: '3600'
        });

      if (uploadError) {
        console.error('Supabase upload storage exception:', uploadError);
        return res.status(500).json({ error: 'Failed to upload image into Supabase Storage' });
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('scans')
        .getPublicUrl(fileName);

      imageUrl = urlData.publicUrl;

      // Register new scan row
      const { data: scan, error: dbError } = await supabaseAdmin
        .from('scans')
        .insert({
          image_url: imageUrl,
          thumbnail_url: imageUrl,
          image_storage_path: fileName,
          session_id: sessionId,
          is_ewaste: false
        })
        .select()
        .single();

      if (dbError) {
        console.error('Supabase DB registration exception:', dbError);
        return res.status(500).json({ error: 'Failed to register scan row in database' });
      }

      scanId = scan.id;
    } else {
      // Local Mock fallback path
      imageUrl = file
        ? `https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&q=80&w=800`
        : (base64Data.startsWith('data:') ? base64Data : `data:${mimeType};base64,${buffer.toString('base64')}`);
      
      const mockScan = {
        id: scanId,
        image_url: imageUrl,
        thumbnail_url: imageUrl,
        session_id: sessionId,
        is_ewaste: false,
        created_at: new Date().toISOString()
      };

      localScanStore.set(scanId, mockScan);
    }

    res.json({
      success: true,
      scanId,
      imageUrl,
      thumbnailUrl: imageUrl
    });

  } catch (error) {
    console.error('Upload handler exception:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred during upload' });
  }
});

// 3. Scan Image analysis endpoint using Gemini AI
app.post('/api/scan', async (req, res) => {
  try {
    const { scanId, imageBase64 } = req.body;
    if (!scanId) {
      return res.status(400).json({ error: 'scanId is a required parameter' });
    }

    let scanRecord = null;
    let base64ToUse = imageBase64;

    // Fetch scan metadata
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Scan record not found in Supabase' });
      }
      scanRecord = data;
    } else {
      scanRecord = localScanStore.get(scanId);
      if (!scanRecord) {
        return res.status(404).json({ error: 'Scan record not found in mock store' });
      }
    }

    // Prepare response structure
    let geminiResult = null;

    if (!genAI) {
      return res.status(503).json({ error: 'Gemini AI is not configured. Please set GEMINI_API_KEY in your .env file.' });
    }
    if (!base64ToUse) {
      return res.status(400).json({ error: 'imageBase64 is required for AI analysis.' });
    }

    // Use callGemini which tries multiple models automatically
    try {
      // Strip headers from base64 if present
      let cleanBase64 = base64ToUse;
      let detectedMimeType = 'image/jpeg';
      if (base64ToUse.startsWith('data:')) {
        const mimeMatch = base64ToUse.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,/);
        if (mimeMatch) detectedMimeType = mimeMatch[1];
        cleanBase64 = base64ToUse.split(',')[1];
      }

      const prompt = `You are Resiklo, an advanced eco-friendly waste management AI. Carefully analyze the uploaded photo.

IMPORTANT: Look at the actual image content and identify exactly what physical object is shown. Do NOT assume or guess — base your answer solely on what is visually present in the image.

Analyze the image and return a JSON object with the following fields:
{
  "objectType": "string (common name of the item)",
  "wasteCategory": "plastic | paper | glass | metal | organic | electronic | hazardous | other",
  "material": "string (specific material composition, e.g., PET Plastic)",
  "condition": "good | fair | poor | broken | unknown",
  "confidence": 0.0 to 1.0 (estimation match percentage),
  "isEwaste": boolean,
  "hazardLevel": "low | medium | high | null",
  "hazardReasons": ["array of reasons if hazardous"],
  "reuseSuggestions": ["3 specific DIY or reuse ideas for this exact object"],
  "recyclingInstructions": "string (step by step preparation, like washing, caps removal, sorting)",
  "environmentalImpact": {
    "decompositionYears": number,
    "co2SavedByRecycling": "string (e.g. 0.5kg)",
    "impactStatement": "string (compelling statement about why recycling or reusing this helps)"
  }
}`;

      const imagePart = { inlineData: { data: cleanBase64, mimeType: detectedMimeType } };
      geminiResult = await callGemini([prompt, imagePart]);
      console.log('Gemini Analysis Response:', geminiResult);

    } catch (geminiErr) {
      console.error('Gemini analysis error:', geminiErr);
      return res.status(502).json({ error: 'Gemini AI analysis failed: ' + (geminiErr.message || 'Unknown error') });
    }

    // 3. Update Database row
    if (supabaseAdmin) {
      const { data: updatedScan, error: updateError } = await supabaseAdmin
        .from('scans')
        .update({
          object_type: geminiResult.objectType,
          waste_category: geminiResult.wasteCategory,
          material: geminiResult.material,
          condition: geminiResult.condition,
          confidence: geminiResult.confidence,
          is_ewaste: geminiResult.isEwaste,
          hazard_level: geminiResult.hazardLevel,
          hazard_reasons: geminiResult.hazardReasons,
          reuse_suggestions: geminiResult.reuseSuggestions,
          recycling_instructions: geminiResult.recyclingInstructions,
          decomposition_years: geminiResult.environmentalImpact.decompositionYears,
          co2_saved_kg: parseFloat(geminiResult.environmentalImpact.co2SavedByRecycling) || 0,
          gemini_response: geminiResult,
          updated_at: new Date().toISOString()
        })
        .eq('id', scanId)
        .select()
        .single();

      if (updateError) {
        console.error('Supabase DB updates exception:', updateError);
        return res.status(500).json({ error: 'Failed to record AI scanning analytics in database' });
      }

      // Silent analytics insertion
      try {
        await supabaseAdmin.from('analytics_events').insert({
          session_id: scanRecord.session_id,
          event_type: 'scan_completed',
          event_data: {
            scanId,
            wasteCategory: geminiResult.wasteCategory,
            confidence: geminiResult.confidence
          }
        });
      } catch (ae) {
        console.warn('Analytics log failed:', ae.message);
      }
    } else {
      // Mock db updates
      const updated = {
        ...scanRecord,
        object_type: geminiResult.objectType,
        waste_category: geminiResult.wasteCategory,
        material: geminiResult.material,
        condition: geminiResult.condition,
        confidence: geminiResult.confidence,
        is_ewaste: geminiResult.isEwaste,
        hazard_level: geminiResult.hazardLevel,
        hazard_reasons: geminiResult.hazardReasons,
        reuse_suggestions: geminiResult.reuseSuggestions,
        recycling_instructions: geminiResult.recyclingInstructions,
        decomposition_years: geminiResult.environmentalImpact.decompositionYears,
        co2_saved_kg: parseFloat(geminiResult.environmentalImpact.co2SavedByRecycling) || 0,
        gemini_response: geminiResult,
        updated_at: new Date().toISOString()
      };
      localScanStore.set(scanId, updated);
    }

    res.json({
      success: true,
      scanId,
      ...geminiResult
    });

  } catch (error) {
    console.error('Scan analysis controller error:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred during AI analysis' });
  }
});

// Heuristic object detector based on file name or image URL metadata
function detectObjectFromFilename(filename) {
  const name = (filename || '').toLowerCase();
  
  if (name.includes('phone') || name.includes('mobile') || name.includes('iphone') || name.includes('android')) {
    return {
      objectType: "Old Mobile Phone",
      isEwaste: true,
      wasteCategory: "electronic",
      confidence: 0.95
    };
  }
  if (name.includes('laptop') || name.includes('macbook') || name.includes('computer')) {
    return {
      objectType: "Old Laptop",
      isEwaste: true,
      wasteCategory: "electronic",
      confidence: 0.93
    };
  }
  if (name.includes('battery') || name.includes('batteries') || name.includes('powerbank')) {
    return {
      objectType: "Rechargeable Battery",
      isEwaste: true,
      wasteCategory: "electronic",
      confidence: 0.92
    };
  }
  if (name.includes('can') || name.includes('tin') || name.includes('coke') || name.includes('soda') || name.includes('pepsi') || name.includes('sprite') || name.includes('metal') || name.includes('aluminum')) {
    return {
      objectType: "Aluminum Soda Can",
      isEwaste: false,
      wasteCategory: "metal",
      confidence: 0.96
    };
  }
  if (name.includes('box') || name.includes('cardboard') || name.includes('carton')) {
    return {
      objectType: "Cardboard Box",
      isEwaste: false,
      wasteCategory: "paper",
      confidence: 0.94
    };
  }
  if (name.includes('paper') || name.includes('newspaper') || name.includes('news')) {
    return {
      objectType: "Newspaper",
      isEwaste: false,
      wasteCategory: "paper",
      confidence: 0.95
    };
  }
  if (name.includes('glass') || name.includes('jar')) {
    return {
      objectType: "Glass Jar",
      isEwaste: false,
      wasteCategory: "glass",
      confidence: 0.94
    };
  }
  if (name.includes('bulb') || name.includes('light') || name.includes('lamp')) {
    return {
      objectType: "Fluorescent Light Bulb",
      isEwaste: true,
      wasteCategory: "hazardous",
      confidence: 0.91
    };
  }
  if (name.includes('bottle') || name.includes('plastic') || name.includes('pet')) {
    return {
      objectType: "Plastic Water Bottle",
      isEwaste: false,
      wasteCategory: "plastic",
      confidence: 0.95
    };
  }
  
  // Default fallback if no keywords found — unknown, not assumed
  return {
    objectType: "Unknown Object",
    isEwaste: false,
    wasteCategory: "other",
    confidence: 0.50
  };
}

// Map recognized object names to standard categories
function getCategoryFromObjectType(objectType) {
  const type = (objectType || '').toLowerCase();
  if (type.includes('phone') || type.includes('laptop') || type.includes('computer') || type.includes('battery')) return 'electronic';
  if (type.includes('can') || type.includes('tin') || type.includes('metal')) return 'metal';
  if (type.includes('bottle') || type.includes('plastic')) return 'plastic';
  if (type.includes('box') || type.includes('cardboard') || type.includes('paper') || type.includes('newspaper')) return 'paper';
  if (type.includes('glass') || type.includes('jar')) return 'glass';
  if (type.includes('bulb') || type.includes('light')) return 'hazardous';
  return 'other';
}

// 3.1. Initiate Scan Image analysis and dynamic survey generation using Gemini AI
app.post('/api/scan/initiate', async (req, res) => {
  try {
    const { scanId, imageBase64 } = req.body;
    if (!scanId) {
      return res.status(400).json({ error: 'scanId is a required parameter' });
    }

    let scanRecord = null;
    let base64ToUse = imageBase64;

    // Fetch scan metadata
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Scan record not found in Supabase' });
      }
      scanRecord = data;
    } else {
      scanRecord = localScanStore.get(scanId);
      if (!scanRecord) {
        return res.status(404).json({ error: 'Scan record not found in mock store' });
      }
    }

    let result = null;
    let fallbackToMock = false;

    if (!genAI || !base64ToUse) {
      console.warn(`⚠️ Skipping Gemini — genAI: ${!!genAI}, base64ToUse present: ${!!base64ToUse}`);
      fallbackToMock = true;
    } else {
      try {
        let cleanBase64 = base64ToUse;
        if (base64ToUse.startsWith('data:')) {
          cleanBase64 = base64ToUse.split(',')[1];
        }

        // Detect actual mime type from data URI header, default to image/jpeg
        let detectedMimeType = 'image/jpeg';
        if (base64ToUse.startsWith('data:')) {
          const mimeMatch = base64ToUse.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,/);
          if (mimeMatch) detectedMimeType = mimeMatch[1];
        }

        console.log(`🖼️ Sending image to Gemini — mimeType: ${detectedMimeType}, base64 length: ${cleanBase64.length}`);

        const prompt = `You are Resiklo, an advanced eco-friendly waste management AI. Carefully analyze the uploaded photo.

IMPORTANT: Look at the actual image content and identify exactly what physical object is shown. Do NOT assume or guess based on anything other than what is visually present in the image.

Identify the object type and generate exactly 3 clarifying multiple-choice questions to ask the user.
These questions should help confirm the specific state, cleanliness, material structure, or details of the object to ensure a highly reliable recycling or reuse decision.
Return a JSON object with the following fields:
{
  "objectType": "string (precise common name of the actual item visible in the image, e.g. Banana Peel, Plastic Bottle, Laptop, Newspaper)",
  "confidence": number (estimated identification accuracy from 0.0 to 1.0),
  "isEwaste": boolean (true only if the item is electronic waste),
  "questions": [
    {
      "id": "string (unique question slug, e.g. cleanliness, battery_removable, label_present)",
      "title": "string (clear, user-friendly question relevant to the identified object)",
      "description": "string (brief context or reason why this question matters for recycling/reuse)",
      "options": [
        { "value": "string (lowercased short answer)", "label": "string (user-friendly label)" }
      ]
    }
  ]
}`;

        const imagePart = { inlineData: { data: cleanBase64, mimeType: detectedMimeType } };
        result = await callGemini([prompt, imagePart]);
        console.log('Gemini Initiate Response:', result);
      } catch (geminiErr) {
        console.error('❌ Gemini initiate error (full):', geminiErr);
        console.error('❌ Gemini error message:', geminiErr.message);
        console.error('❌ Gemini error status:', geminiErr.status || geminiErr.statusCode);
        fallbackToMock = true;
      }
    }

    if (fallbackToMock) {
      // AI unavailable — ask the user to identify the object themselves
      // The frontend will show a text input for the user to type what the item is
      result = {
        objectType: 'Unknown',
        confidence: 0,
        isEwaste: false,
        needsUserInput: true,
        questions: [
          {
            id: 'object_name',
            title: 'What is this item?',
            description: 'Our AI scanner is temporarily unavailable. Please type what this item is so we can give you accurate recycling advice.',
            type: 'text_input',
            placeholder: 'e.g. Plastic bottle, Banana peel, Old phone...',
            options: [
              { value: 'plastic_bottle', label: 'Plastic Bottle' },
              { value: 'glass_bottle', label: 'Glass Bottle' },
              { value: 'aluminum_can', label: 'Aluminum Can' },
              { value: 'cardboard', label: 'Cardboard / Paper' },
              { value: 'food_waste', label: 'Food Waste / Organic' },
              { value: 'old_phone', label: 'Old Phone / Tablet' },
              { value: 'old_laptop', label: 'Old Laptop / Computer' },
              { value: 'battery', label: 'Battery' },
              { value: 'clothing', label: 'Clothing / Fabric' },
              { value: 'other', label: 'Other (type below)' }
            ]
          },
          {
            id: 'condition',
            title: 'What condition is it in?',
            description: 'This helps us give better reuse and recycling recommendations.',
            options: [
              { value: 'good', label: 'Good — still usable' },
              { value: 'fair', label: 'Fair — needs minor repair' },
              { value: 'poor', label: 'Poor — broken or damaged' }
            ]
          },
          {
            id: 'clean',
            title: 'Is it clean?',
            description: 'Contaminated items may not be recyclable.',
            options: [
              { value: 'yes', label: 'Yes, clean' },
              { value: 'needs_cleaning', label: 'Needs rinsing/cleaning' },
              { value: 'no', label: 'No, heavily soiled' }
            ]
          }
        ]
      };
    } // end if (fallbackToMock)

    const calculatedCategory = getCategoryFromObjectType(result.objectType);

    // Save dynamic questions inside scan record (gemini_response JSON field)
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('scans')
        .update({
          object_type: result.objectType,
          confidence: result.confidence,
          is_ewaste: result.isEwaste,
          waste_category: calculatedCategory,
          gemini_response: { ...scanRecord.gemini_response, questions: result.questions },
          updated_at: new Date().toISOString()
        })
        .eq('id', scanId);
    } else {
      localScanStore.set(scanId, {
        ...scanRecord,
        object_type: result.objectType,
        confidence: result.confidence,
        is_ewaste: result.isEwaste,
        waste_category: calculatedCategory,
        gemini_response: { ...scanRecord.gemini_response, questions: result.questions }
      });
    }

    res.json({
      success: true,
      scanId,
      objectType: result.objectType,
      confidence: Math.round(result.confidence * 100),
      isEwaste: result.isEwaste,
      needsUserInput: result.needsUserInput || false,
      questions: result.questions
    });

  } catch (error) {
    console.error('Scan initiate error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate dynamic survey' });
  }
});

// 3.2. Finalize Scan Image analysis with Survey answers using Gemini AI
app.post('/api/scan/finalize', async (req, res) => {
  try {
    const { scanId, answers, imageBase64 } = req.body;
    if (!scanId) {
      return res.status(400).json({ error: 'scanId is a required parameter' });
    }
    if (!answers) {
      return res.status(400).json({ error: 'answers is a required parameter' });
    }

    let scanRecord = null;
    let base64ToUse = imageBase64;

    // Fetch scan metadata
    if (supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('scans')
        .select('*')
        .eq('id', scanId)
        .single();
      
      if (error || !data) {
        return res.status(404).json({ error: 'Scan record not found in Supabase' });
      }
      scanRecord = data;
    } else {
      scanRecord = localScanStore.get(scanId);
      if (!scanRecord) {
        return res.status(404).json({ error: 'Scan record not found in mock store' });
      }
    }

    const objectType = scanRecord.object_type || 'Object';
    const questions = scanRecord.gemini_response?.questions || [];

    // Construct survey results description for Gemini prompt
    const surveyText = questions.map(q => {
      const selectedValue = answers[q.id] || 'unanswered';
      const selectedOption = q.options?.find(o => o.value === selectedValue);
      const selectedLabel = selectedOption ? selectedOption.label : selectedValue;
      return `- Question: "${q.title}"\n  Answer: "${selectedLabel}" (value: "${selectedValue}")`;
    }).join('\n');

    let result = null;
    let fallbackToMock = false;

    if (!genAI || !base64ToUse) {
      fallbackToMock = true;
    } else {
      // Use callGemini which tries multiple models automatically
      try {
        let cleanBase64 = base64ToUse;
        let detectedMimeType = 'image/jpeg';
        if (base64ToUse.startsWith('data:')) {
          const mimeMatch = base64ToUse.match(/^data:([a-zA-Z0-9+/]+\/[a-zA-Z0-9+/]+);base64,/);
          if (mimeMatch) detectedMimeType = mimeMatch[1];
          cleanBase64 = base64ToUse.split(',')[1];
        }

        const prompt = `You are Resiklo, an advanced eco-friendly waste management AI.
We previously identified this object as a ${objectType}.
The user has completed a short verification survey about the item. Here are their answers:
${surveyText}

IMPORTANT: Look at the actual image to confirm the object identity. Base your analysis on what is truly visible in the image combined with the survey answers.

Based on the image and these survey answers, perform a final detailed waste analysis and return the final recommendations in JSON format:
{
  "item": "string (e.g. Plastic Bottle · PET #1, Broken Phone · Lithium Battery)",
  "confidence": number (e.g. 96, between 0 and 100),
  "condition": "string (e.g. Reusable, Recyclable, Damaged, Soiled)",
  "hazard": "string (High | Medium | Low | null)",
  "reuse": [
    {
      "title": "string (e.g. Vertical Garden)",
      "desc": "string (e.g. Cut in half to create hanging planters.)",
      "icon": "string (Sprout | Droplets | PenTool | Leaf | Wrench | Heart | Recycle)"
    }
  ],
  "repair": [
    {
      "title": "string (optional repair recommendation)",
      "desc": "string",
      "icon": "string"
    }
  ],
  "donate": [
    {
      "title": "string (optional donation recommendation)",
      "desc": "string",
      "icon": "string"
    }
  ],
  "recycle": "string (recycling instructions, e.g. Rinse and crush before placing in the blue bin.)",
  "impact": "string (compelling float representation of saved CO2 in kg, e.g. 0.08)"
}`;

        const imagePart = { inlineData: { data: cleanBase64, mimeType: detectedMimeType } };
        result = await callGemini([prompt, imagePart]);
        console.log('Gemini Finalize Response:', result);

      } catch (geminiErr) {
        console.error('❌ Gemini finalize error (full):', geminiErr);
        console.error('❌ Gemini error message:', geminiErr.message);
        console.error('❌ Gemini error status:', geminiErr.status || geminiErr.statusCode);
        fallbackToMock = true;
      }
    }

    if (fallbackToMock) {
      // Vision AI unavailable — use text-only AI (DeepSeek) with user-provided object name
      const userProvidedName = answers.object_name || objectType || 'Unknown Item';
      const displayName = userProvidedName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

      const textPrompt = `You are Resiklo, an eco-friendly waste management AI for the Philippines.
The user has identified their item as: "${displayName}"
User survey answers: ${JSON.stringify(answers)}

Based on this item and the user's answers, generate detailed waste management recommendations.
Return ONLY a valid JSON object with this exact structure:
{
  "item": "string (e.g. Banana Peel · Organic Waste)",
  "confidence": number (85 to 95),
  "condition": "string (e.g. Compostable, Recyclable, Reusable, Needs Cleaning)",
  "hazard": "High or Medium or Low or null",
  "reuse": [
    { "title": "string", "desc": "string (specific actionable tip)", "icon": "Sprout or Droplets or PenTool or Leaf or Wrench or Heart or Recycle" }
  ],
  "repair": [
    { "title": "string", "desc": "string", "icon": "string" }
  ],
  "donate": [
    { "title": "string", "desc": "string", "icon": "string" }
  ],
  "recycle": "string (step-by-step recycling or disposal instructions specific to the Philippines)",
  "impact": "string (CO2 saved in kg as a decimal number, e.g. 0.08)"
}
Provide 2-3 reuse suggestions. Only include repair/donate arrays if relevant. Be specific to the actual item.`;

      try {
        result = await callTextAI(textPrompt);
        console.log('✅ Text AI finalize result:', result);
        fallbackToMock = false; // text AI succeeded
      } catch (textErr) {
        console.error('❌ Text AI also failed:', textErr.message);
        // Last resort: static response based on item name
        const nameLower = userProvidedName.toLowerCase();
        const isEwaste = nameLower.includes('phone') || nameLower.includes('laptop') || nameLower.includes('battery') || nameLower.includes('computer') || nameLower.includes('tablet');
        const isOrganic = nameLower.includes('peel') || nameLower.includes('food') || nameLower.includes('organic') || nameLower.includes('fruit') || nameLower.includes('vegetable') || nameLower.includes('banana');
        const isMetal = nameLower.includes('can') || nameLower.includes('tin') || nameLower.includes('aluminum');
        const isPaper = nameLower.includes('cardboard') || nameLower.includes('paper') || nameLower.includes('box');

        if (isOrganic) {
          result = { item: `${displayName} · Organic Waste`, confidence: 85, condition: 'Compostable', hazard: null, reuse: [{ title: 'Compost It', desc: 'Add to a compost bin. Becomes rich fertilizer in 2–3 months.', icon: 'Sprout' }, { title: 'Natural Fertilizer', desc: 'Bury directly in garden soil as a slow-release nutrient source.', icon: 'Leaf' }], repair: [], donate: [], recycle: 'Place in the green/organic waste bin. Do not mix with plastics. Composting reduces methane emissions from landfills.', impact: '0.05' };
        } else if (isEwaste) {
          result = { item: `${displayName} · E-Waste`, confidence: 85, condition: 'Needs Proper Disposal', hazard: 'Medium', reuse: [{ title: 'Repurpose as Media Player', desc: 'Use as a dedicated music player or smart home controller.', icon: 'Heart' }], repair: [{ title: 'Check Local Repair Shops', desc: 'Many issues can be fixed cheaply, extending device life significantly.', icon: 'Wrench' }], donate: [{ title: 'Donate to Digital Literacy Programs', desc: 'Working devices help students access education.', icon: 'Heart' }], recycle: 'Remove SIM cards and wipe personal data. Bring to a certified e-waste facility. Never throw in regular trash.', impact: '2.50' };
        } else if (isMetal) {
          result = { item: `${displayName} · Recyclable Metal`, confidence: 85, condition: 'Recyclable', hazard: null, reuse: [{ title: 'Desk Organizer', desc: 'Clean and decorate to use as a pen holder.', icon: 'PenTool' }, { title: 'Garden Planter', desc: 'Punch drainage holes and use for herbs or succulents.', icon: 'Sprout' }], repair: [], donate: [], recycle: 'Rinse, crush flat, and place in the metals recycling bin. Metal can be recycled infinitely.', impact: '0.18' };
        } else if (isPaper) {
          result = { item: `${displayName} · Paper/Cardboard`, confidence: 85, condition: 'Recyclable', hazard: null, reuse: [{ title: 'Storage Box', desc: 'Fold and reinforce into organizer boxes.', icon: 'PenTool' }, { title: 'Seedling Starter', desc: 'Use as biodegradable seedling pots.', icon: 'Sprout' }], repair: [], donate: [], recycle: 'Flatten to save space. Keep dry — wet cardboard cannot be recycled. Remove tape before placing in paper bin.', impact: '0.08' };
        } else {
          result = { item: `${displayName} · Recyclable`, confidence: 85, condition: answers.condition === 'good' ? 'Reusable' : 'Recyclable', hazard: null, reuse: [{ title: 'Storage Container', desc: 'Clean and repurpose for small items or pantry goods.', icon: 'PenTool' }, { title: 'DIY Planter', desc: 'Add drainage holes and use for small plants or herbs.', icon: 'Sprout' }], repair: [], donate: answers.condition === 'good' ? [{ title: 'Donate if Still Usable', desc: 'Consider donating to community centers or thrift stores.', icon: 'Heart' }] : [], recycle: 'Check the recycling symbol. Clean the item first — contaminated materials are rejected. Place in the correct bin or bring to your barangay collection point.', impact: '0.10' };
        }
      }
    }

    // Update database row with final analysis
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('scans')
        .update({
          condition: result.condition,
          confidence: result.confidence / 100,
          hazard_level: result.hazard,
          recycling_instructions: result.recycle,
          co2_saved_kg: parseFloat(result.impact) || 0,
          gemini_response: { ...scanRecord.gemini_response, answers, final_analysis: result },
          updated_at: new Date().toISOString()
        })
        .eq('id', scanId);
    } else {
      localScanStore.set(scanId, {
        ...scanRecord,
        condition: result.condition,
        confidence: result.confidence / 100,
        hazard_level: result.hazard,
        recycling_instructions: result.recycle,
        co2_saved_kg: parseFloat(result.impact) || 0,
        gemini_response: { ...scanRecord.gemini_response, answers, final_analysis: result }
      });
    }

    res.json({
      success: true,
      scanId,
      isFallback: fallbackToMock,
      ...result
    });

  } catch (error) {
    console.error('Scan finalize error:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize dynamic analysis' });
  }
});

// ─── SM Malls Philippines — verified e-waste drop-off locations ───────────────
// Coordinates sourced from Wikipedia/Wikivoyage. All SM malls have certified
// e-waste collection bins (Cyberzone area) per RA 9003 & RA 8749 compliance.
const SM_EWASTE_FACILITIES = [
  // ── Metro Manila ──
  { id: 'sm-north-edsa',       name: 'SM City North EDSA',         lat: 14.6561, lng: 121.0322, address: 'EDSA cor. North Avenue, Quezon City' },
  { id: 'sm-mall-of-asia',     name: 'SM Mall of Asia',            lat: 14.5354, lng: 120.9826, address: 'Seaside Blvd, Bay City, Pasay City' },
  { id: 'sm-megamall',         name: 'SM Megamall',                lat: 14.5853, lng: 121.0566, address: 'EDSA, Mandaluyong City' },
  { id: 'sm-aura',             name: 'SM Aura Premier',            lat: 14.5476, lng: 121.0530, address: 'McKinley Pkwy, Bonifacio Global City, Taguig' },
  { id: 'sm-southmall',        name: 'SM Southmall',               lat: 14.4500, lng: 120.9942, address: 'Alabang-Zapote Rd, Las Piñas City' },
  { id: 'sm-bicutan',          name: 'SM City Bicutan',            lat: 14.4878, lng: 121.0417, address: 'Doña Soledad Ave, Parañaque City' },
  { id: 'sm-bf-paranaque',     name: 'SM City BF Parañaque',       lat: 14.4697, lng: 121.0133, address: 'Aguirre Ave, BF Homes, Parañaque City' },
  { id: 'sm-fairview',         name: 'SM City Fairview',           lat: 14.7218, lng: 121.0580, address: 'Quirino Hwy, Fairview, Quezon City' },
  { id: 'sm-masinag',          name: 'SM City Masinag',            lat: 14.6278, lng: 121.1175, address: 'Marcos Hwy, Antipolo, Rizal' },
  { id: 'sm-east-ortigas',     name: 'SM City East Ortigas',       lat: 14.5978, lng: 121.0847, address: 'Marcos Hwy, Pasig City' },
  { id: 'sm-san-lazaro',       name: 'SM City San Lazaro',         lat: 14.6108, lng: 120.9836, address: 'Felix Huertas St, Manila' },
  { id: 'sm-manila',           name: 'SM City Manila',             lat: 14.5906, lng: 120.9822, address: 'Concepcion Aguila St, Manila' },
  { id: 'sm-sta-mesa',         name: 'SM City Sta. Mesa',          lat: 14.6017, lng: 121.0072, address: 'Araneta Ave, Sta. Mesa, Manila' },
  { id: 'sm-caloocan',         name: 'SM City Caloocan',           lat: 14.6572, lng: 120.9667, address: '10th Ave, Caloocan City' },
  { id: 'sm-novaliches',       name: 'SM City Novaliches',         lat: 14.7178, lng: 121.0283, address: 'Quirino Hwy, Novaliches, Quezon City' },
  { id: 'sm-center-las-pinas', name: 'SM Center Las Piñas',        lat: 14.4456, lng: 120.9836, address: 'Alabang-Zapote Rd, Las Piñas City' },
  { id: 'sm-sucat',            name: 'SM City Sucat',              lat: 14.4742, lng: 121.0358, address: 'Dr. A. Santos Ave, Parañaque City' },
  { id: 'sm-pasig',            name: 'SM City Pasig',              lat: 14.5756, lng: 121.0847, address: 'Frontera Verde, Ortigas Ave, Pasig City' },
  { id: 'sm-valenzuela',       name: 'SM City Valenzuela',         lat: 14.7003, lng: 120.9672, address: 'Maysan Rd, Valenzuela City' },
  { id: 'sm-center-muntinlupa', name: 'SM Center Muntinlupa',      lat: 14.4081, lng: 121.0422, address: 'National Rd, Muntinlupa City' },
  // ── Luzon (outside Metro Manila) ──
  { id: 'sm-clark',            name: 'SM City Clark',              lat: 15.1797, lng: 120.5600, address: 'Jose Abad Santos Ave, Clark Freeport Zone, Pampanga' },
  { id: 'sm-pampanga',         name: 'SM City Pampanga',           lat: 15.0794, lng: 120.6200, address: 'Jose Abad Santos Ave, San Fernando, Pampanga' },
  { id: 'sm-tarlac',           name: 'SM City Tarlac',             lat: 15.4756, lng: 120.5956, address: 'MacArthur Hwy, Tarlac City' },
  { id: 'sm-olongapo',         name: 'SM City Olongapo',           lat: 14.8297, lng: 120.2836, address: 'Rizal Ave, Olongapo City, Zambales' },
  { id: 'sm-batangas',         name: 'SM City Batangas',           lat: 13.7565, lng: 121.0583, address: 'Pallocan West, Batangas City' },
  { id: 'sm-calamba',          name: 'SM City Calamba',            lat: 14.2119, lng: 121.1650, address: 'National Hwy, Calamba, Laguna' },
  { id: 'sm-sta-rosa',         name: 'SM City Sta. Rosa',          lat: 14.2878, lng: 121.1117, address: 'Balibago, Sta. Rosa, Laguna' },
  { id: 'sm-san-pablo',        name: 'SM City San Pablo',          lat: 14.0694, lng: 121.3244, address: 'Maharlika Hwy, San Pablo City, Laguna' },
  { id: 'sm-lucena',           name: 'SM City Lucena',             lat: 13.9394, lng: 121.6156, address: 'Diversion Rd, Lucena City, Quezon' },
  { id: 'sm-cabanatuan',       name: 'SM City Cabanatuan',         lat: 15.4878, lng: 120.9683, address: 'Maharlika Hwy, Cabanatuan City, Nueva Ecija' },
  { id: 'sm-cauayan',          name: 'SM City Cauayan',            lat: 16.9194, lng: 121.7717, address: 'Cauayan City, Isabela' },
  { id: 'sm-tuguegarao',       name: 'SM City Tuguegarao',         lat: 17.6131, lng: 121.7269, address: 'Tuguegarao City, Cagayan' },
  { id: 'sm-baguio',           name: 'SM City Baguio',             lat: 16.4119, lng: 120.5961, address: 'Luneta Hill, Baguio City' },
  { id: 'sm-rosales',          name: 'SM City Rosales',            lat: 15.8944, lng: 120.6317, address: 'Rosales, Pangasinan' },
  { id: 'sm-urdaneta',         name: 'SM City Urdaneta',           lat: 15.9756, lng: 120.5706, address: 'Urdaneta City, Pangasinan' },
  { id: 'sm-dagupan',          name: 'SM City Dagupan',            lat: 16.0431, lng: 120.3333, address: 'A.B. Fernandez Ave, Dagupan City, Pangasinan' },
  { id: 'sm-san-jose-del-monte', name: 'SM City San Jose Del Monte', lat: 14.8133, lng: 121.0456, address: 'Quirino Hwy, San Jose Del Monte, Bulacan' },
  { id: 'sm-marilao',          name: 'SM City Marilao',            lat: 14.7578, lng: 120.9494, address: 'McArthur Hwy, Marilao, Bulacan' },
  { id: 'sm-baliwag',          name: 'SM City Baliwag',            lat: 14.9556, lng: 120.9006, address: 'Doña Remedios Trinidad Hwy, Baliwag, Bulacan' },
  { id: 'sm-telabastagan',     name: 'SM City Telabastagan',       lat: 15.0644, lng: 120.6578, address: 'Telabastagan, San Fernando, Pampanga' },
  { id: 'sm-angeles',          name: 'SM City Angeles',            lat: 15.1456, lng: 120.5906, address: 'MacArthur Hwy, Angeles City, Pampanga' },
  { id: 'sm-lipa',             name: 'SM City Lipa',               lat: 13.9444, lng: 121.1628, address: 'Ayala Hwy, Lipa City, Batangas' },
  { id: 'sm-trece-martires',   name: 'SM City Trece Martires',     lat: 14.2819, lng: 120.8656, address: 'Trece Martires City, Cavite' },
  { id: 'sm-molino',           name: 'SM City Molino',             lat: 14.3394, lng: 120.9783, address: 'Molino Blvd, Bacoor, Cavite' },
  { id: 'sm-dasmarinas',       name: 'SM City Dasmariñas',         lat: 14.3294, lng: 120.9367, address: 'Governor\'s Drive, Dasmariñas, Cavite' },
  { id: 'sm-bacoor',           name: 'SM City Bacoor',             lat: 14.4578, lng: 120.9394, address: 'Tirona Hwy, Bacoor, Cavite' },
  { id: 'sm-imus',             name: 'SM City Imus',               lat: 14.4297, lng: 120.9367, address: 'Emilio Aguinaldo Hwy, Imus, Cavite' },
  { id: 'sm-naga',             name: 'SM City Naga',               lat: 13.6194, lng: 123.1944, address: 'Diversion Rd, Naga City, Camarines Sur' },
  { id: 'sm-legazpi',          name: 'SM City Legazpi',            lat: 13.1394, lng: 123.7344, address: 'Washington Drive, Legazpi City, Albay' },
  // ── Visayas ──
  { id: 'sm-cebu',             name: 'SM City Cebu',               lat: 10.3119, lng: 123.9183, address: 'North Reclamation Area, Cebu City' },
  { id: 'sm-seaside-cebu',     name: 'SM Seaside City Cebu',       lat: 10.2803, lng: 123.8818, address: 'Mambaling, Cebu City' },
  { id: 'sm-consolacion',      name: 'SM City Consolacion',        lat: 10.3744, lng: 123.9617, address: 'Consolacion, Cebu' },
  { id: 'sm-iloilo',           name: 'SM City Iloilo',             lat: 10.7194, lng: 122.5617, address: 'Benigno Aquino Ave, Mandurriao, Iloilo City' },
  { id: 'sm-bacolod',          name: 'SM City Bacolod',            lat: 10.6756, lng: 122.9483, address: 'Circumferential Rd, Bacolod City' },
  { id: 'sm-bacolod-downtown', name: 'SM City Bacolod Downtown',   lat: 10.6694, lng: 122.9517, address: 'Lacson St, Bacolod City' },
  { id: 'sm-starmills-pampanga', name: 'SM Starmills Pampanga',    lat: 15.0344, lng: 120.6883, address: 'Jose Abad Santos Ave, City of San Fernando, Pampanga' },
  { id: 'sm-tacloban',         name: 'SM City Tacloban',           lat: 11.2444, lng: 125.0017, address: 'Magsaysay Blvd, Tacloban City, Leyte' },
  { id: 'sm-dumaguete',        name: 'SM City Dumaguete',          lat: 9.3094,  lng: 123.3083, address: 'North National Hwy, Dumaguete City, Negros Oriental' },
  // ── Mindanao ──
  { id: 'sm-davao',            name: 'SM City Davao',              lat: 7.0731,  lng: 125.6128, address: 'Quimpo Blvd, Ecoland, Davao City' },
  { id: 'sm-lanang',           name: 'SM Lanang Premier',          lat: 7.1194,  lng: 125.6483, address: 'JP Laurel Ave, Lanang, Davao City' },
  { id: 'sm-cdo',              name: 'SM City Cagayan de Oro',     lat: 8.4794,  lng: 124.6517, address: 'Limketkai Drive, Cagayan de Oro City' },
  { id: 'sm-mindpro',          name: 'SM City Mindpro',            lat: 6.9079,  lng: 122.0762, address: 'La Purisima St cor Campaner St, Zamboanga City', floor: '4th Floor Cyberzone (near restroom entrance)', accepted: ['phones', 'chargers', 'batteries', 'power banks', 'earphones', 'earbuds', 'calculators'] },
  { id: 'sm-general-santos',   name: 'SM City General Santos',     lat: 6.1128,  lng: 125.1717, address: 'Santiago Blvd, General Santos City' },
  { id: 'sm-butuan',           name: 'SM City Butuan',             lat: 8.9494,  lng: 125.5417, address: 'Montilla Blvd, Butuan City' },
  { id: 'sm-iligan',           name: 'SM City Iligan',             lat: 8.2294,  lng: 124.2417, address: 'Quezon Ave, Iligan City' },
  { id: 'sm-cotabato',         name: 'SM City Cotabato',           lat: 7.2194,  lng: 124.2483, address: 'Sinsuat Ave, Cotabato City' },
];

// Build full facility objects from the SM list
function buildSmFacilities(lat, lng) {
  return SM_EWASTE_FACILITIES.map(sm => ({
    id: sm.id,
    name: sm.name,
    type: 'ewaste',
    latitude: sm.lat,
    longitude: sm.lng,
    distance: parseFloat(calculateDistance(lat, lng, sm.lat, sm.lng).toFixed(2)),
    address: sm.address + ', Philippines',
    verified: true,
    hours: 'Mon–Sun: 10:00 AM – 9:00 PM',
    accepted_waste: sm.accepted || ['phones', 'laptops', 'tablets', 'batteries', 'chargers', 'electronics', 'cables'],
    notes: sm.floor
      ? `Drop-off bin: ${sm.floor}. In partnership with SM Cares & PLDT.`
      : 'E-waste drop-off bin at the Cyberzone area. No registration required. In partnership with SM Cares & PLDT.'
  }));
}

// ─── Zamboanga City — verified local e-waste drop-off points ─────────────────
const ZAMBOANGA_FACILITIES = [
  {
    id: 'uz-ewaste',
    name: 'Universidad de Zamboanga (UZ) E-Waste Bin',
    type: 'ewaste',
    lat: 6.9244,
    lng: 122.0789,
    address: 'UZ Laboratories Building, Tetuan Campus, Zamboanga City',
    hours: 'Mon–Fri: 8:00 AM – 5:00 PM (during school days)',
    accepted_waste: ['computers', 'smartphones', 'small appliances', 'electronics'],
    notes: 'Managed by the School of Engineering, ICT (SEICT). Campus bins reduce e-waste hazards.',
    verified: true,
  },
  {
    id: 'ronworks-repair',
    name: 'Ronworks Computer Repair Services',
    type: 'ewaste',
    lat: 6.9350,
    lng: 122.0650,
    address: 'Tumaga Road, Sta. Maria, Zamboanga City',
    hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
    accepted_waste: ['computers', 'laptops', 'computer parts', 'electronics'],
    notes: 'Offers repair services and sustainable disposal of computer parts and larger electronics.',
    verified: true,
  },
  {
    id: 'easyelectronyx',
    name: 'Easyelectronyx',
    type: 'ewaste',
    lat: 6.9100,
    lng: 122.0720,
    address: 'BCC Compound, San Jose Road, Zamboanga City',
    hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
    accepted_waste: ['electronics', 'components', 'phones', 'gadgets'],
    notes: 'Local technical shop offering repair and responsible disposal of electronic components.',
    verified: true,
  },
  {
    id: 'weefix-it',
    name: 'WEEFIX I.T. CARE CENTER',
    type: 'ewaste',
    lat: 6.9060,
    lng: 122.0810,
    address: 'Nuñez Extension St., Zamboanga City',
    hours: 'Mon–Sat: 9:00 AM – 6:00 PM',
    accepted_waste: ['phones', 'laptops', 'tablets', 'electronics', 'gadgets'],
    notes: 'IT repair center that accepts old gadgets for sustainable disposal.',
    verified: true,
  },
  {
    id: 'ocenr-zamboanga',
    name: 'OCENR — Office of the City Environment & Natural Resources',
    type: 'ewaste',
    lat: 6.9194,
    lng: 122.0833,
    address: 'San Roque, Zamboanga City',
    hours: 'Mon–Fri: 8:00 AM – 5:00 PM',
    accepted_waste: ['refrigerators', 'aircons', 'washing machines', 'large appliances', 'hazardous waste'],
    notes: 'For large-scale electronics (ref, aircon, washing machines). Contact for household pick-up guidelines per local solid waste codes.',
    verified: true,
  },
];

// 4. Localized recycling facilities search
app.get('/api/facilities', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 14.5995;
    const lng = parseFloat(req.query.lng) || 120.9842;
    const type = req.query.type || '';
    const radius = parseFloat(req.query.radius) || 50;
    const city = (req.query.city || '').toLowerCase();

    // ── Zamboanga-only mode ───────────────────────────────────────────────────
    // When city=zamboanga, return ONLY the verified Zamboanga drop-off points:
    // SM City Mindpro (Cyberzone) + all 5 local facilities. Nothing else.
    if (city === 'zamboanga') {
      const smMindpro = buildSmFacilities(lat, lng).find(f => f.id === 'sm-mindpro');
      const localFacilities = ZAMBOANGA_FACILITIES.map(f => ({
        ...f,
        latitude: f.lat,
        longitude: f.lng,
        distance: parseFloat(calculateDistance(lat, lng, f.lat, f.lng).toFixed(2)),
      }));

      const facilities = [
        ...(smMindpro ? [smMindpro] : []),
        ...localFacilities,
      ].sort((a, b) => a.distance - b.distance);

      return res.json({ success: true, facilities, totalResults: facilities.length });
    }

    // ── General / nationwide mode ─────────────────────────────────────────────
    let facilities = [];

    const smFacilities = buildSmFacilities(lat, lng);

    // Always include Zamboanga City local facilities
    const zamboangaFacilities = ZAMBOANGA_FACILITIES.map(f => ({
      ...f,
      latitude: f.lat,
      longitude: f.lng,
      distance: parseFloat(calculateDistance(lat, lng, f.lat, f.lng).toFixed(2)),
    }));

    if (!type || type === 'ewaste') {
      const smNearby = smFacilities.filter(f => f.distance <= radius);
      facilities = [...facilities, ...smNearby];
      facilities = [...facilities, ...zamboangaFacilities.filter(f => f.type === 'ewaste')];
    }

    // For non-ewaste types
    if (!type || type === 'recycling' || type === 'donation') {
      const generalFacilities = [
        { id: 'eco-waste-manila',     name: 'EcoWaste Coalition Manila',    type: 'recycling', lat: 14.5906, lng: 120.9822, address: 'Sampaloc, Manila' },
        { id: 'greenearth-recycling', name: 'Green Earth Recycling Center', type: 'recycling', lat: 14.5547, lng: 121.0242, address: 'Makati City' },
        { id: 'junk-shop-quiapo',     name: 'Quiapo Junk Shop & Recycling', type: 'recycling', lat: 14.5994, lng: 120.9842, address: 'Quiapo, Manila' },
        { id: 'goodwill-bgc',         name: 'Goodwill Donation Hub BGC',    type: 'donation',  lat: 14.5476, lng: 121.0530, address: 'Bonifacio Global City, Taguig' },
        { id: 'habitat-restore',      name: 'Habitat for Humanity ReStore', type: 'donation',  lat: 14.5853, lng: 121.0566, address: 'Mandaluyong City' },
      ].filter(f => !type || f.type === type)
       .map(f => ({
         id: f.id, name: f.name, type: f.type,
         latitude: f.lat, longitude: f.lng,
         distance: parseFloat(calculateDistance(lat, lng, f.lat, f.lng).toFixed(2)),
         address: f.address + ', Philippines',
         verified: true,
         hours: 'Mon–Sat: 8:00 AM – 5:00 PM',
         accepted_waste: f.type === 'recycling'
           ? ['plastic', 'paper', 'glass', 'metal', 'cardboard']
           : ['clothes', 'books', 'furniture', 'appliances'],
       }))
       .filter(f => f.distance <= radius);
      facilities = [...facilities, ...generalFacilities];
    }

    // Deduplicate
    const seen = new Set();
    facilities = facilities.filter(f => {
      if (seen.has(f.id)) return false;
      seen.add(f.id);
      return true;
    });

    facilities.sort((a, b) => a.distance - b.distance);

    res.json({ success: true, facilities, totalResults: facilities.length });

  } catch (error) {
    console.error('Facilities controller failure:', error);
    res.status(500).json({ error: 'Failed to lookup nearby facility centers' });
  }
});

// 5. Search DIY and Circular YouTube Tutorials
app.get('/api/tutorials', async (req, res) => {
  try {
    const query = req.query.q;
    const type = req.query.type || 'diy';
    const limit = parseInt(req.query.limit) || 3;

    if (!query) {
      return res.status(400).json({ error: 'Search query parameter "q" is required' });
    }

    const youtubeKey = process.env.YOUTUBE_API_KEY;
    let tutorials = [];

    if (youtubeKey && !youtubeKey.includes('your_youtube_api')) {
      try {
        // Build highly specific search queries based on item + action type
        const itemName = query.trim();
        const searchTerms = {
          diy:     `how to reuse ${itemName} at home DIY upcycle`,
          repair:  `how to repair fix ${itemName} step by step`,
          recycle: `how to recycle ${itemName} properly Philippines`,
          upcycle: `${itemName} upcycle creative reuse ideas`,
        };
        const searchQuery = searchTerms[type] || `how to dispose ${itemName} properly`;
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${limit}&q=${encodeURIComponent(searchQuery)}&type=video&relevanceLanguage=en&key=${youtubeKey}`;
        
        const response = await fetch(searchUrl);
        const data = await response.json();
        
        if (data.items) {
          tutorials = data.items.map(item => ({
            id: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails.medium?.url || '',
            channelTitle: item.snippet.channelTitle,
            url: `https://youtube.com/watch?v=${item.id.videoId}`
          }));
        }
      } catch (ytErr) {
        console.warn('YouTube API fetch failure, using mock circular guides:', ytErr);
      }
    }

    // Mock Guides if empty or YouTube is unconfigured
    if (tutorials.length === 0) {
      tutorials = [
        {
          id: 'upcycle-1',
          title: `How to DIY Upcycle and Repurpose a ${query} - Easy Guide`,
          description: `Learn how to turn a simple ${query} into a functional household accessory with these step-by-step upcycling instructions.`,
          thumbnailUrl: 'https://images.unsplash.com/photo-1503596476-1c12a8ba09a9?w=400&q=80',
          channelTitle: 'Green Living Crafts',
          url: 'https://youtube.com/watch?v=dQw4w9WgXcQ'
        },
        {
          id: 'recycle-1',
          title: `How to properly recycle a ${query} inside Manila`,
          description: `This zero waste video walks through material categorization, sorting rules, and municipal facility drops.`,
          thumbnailUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=400&q=80',
          channelTitle: 'Recycle Science',
          url: 'https://youtube.com/watch?v=L1H8yTz1_Qk'
        }
      ];
    }

    res.json({
      success: true,
      tutorials: tutorials.slice(0, limit),
      query,
      type
    });

  } catch (error) {
    console.error('Tutorials controller exception:', error);
    res.status(500).json({ error: 'Failed to search YouTube circular guides' });
  }
});

// Haversine formula distance calculator
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Start Server listener
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Resiklo Secure Proxy Backend is running on http://0.0.0.0:${PORT}`);
  // Run startup checks: verify/create storage bucket & probe DB tables
  bootstrapDatabase().catch(e => console.error('Bootstrap error:', e.message));
});

