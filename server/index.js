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
  origin: [clientOrigin, 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

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
// GEMINI MODEL FALLBACK CHAIN
// Tries models in order; skips on 429 (rate-limit) or 404 (not found)
// ==========================================
const GEMINI_MODEL_CHAIN = [
  process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  'gemini-1.5-flash-002',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-1.5-pro-002',
  'gemini-2.0-flash-exp',
  'gemini-exp-1206'
];

async function callGemini(promptParts) {
  if (!genAI) throw new Error('Gemini AI SDK is not initialised. Check GEMINI_API_KEY.');

  let lastError = null;
  for (const modelName of GEMINI_MODEL_CHAIN) {
    try {
      console.log(`🤖 Trying Gemini model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json'
        }
      });
      const result = await model.generateContent(promptParts);
      const text = result.response.text();
      console.log(`✅ Gemini success with model: ${modelName}`);
      return JSON.parse(text);
    } catch (err) {
      const status = err.status || err.statusCode || 0;
      const isRateLimit = status === 429 || (err.message && err.message.includes('429'));
      const errMsgLower = err.message ? err.message.toLowerCase() : '';
      const isNotFound  = status === 404 || (errMsgLower.includes('model') && errMsgLower.includes('not found'));
      if (isRateLimit || isNotFound) {
        console.warn(`⚠️  Model ${modelName} unavailable (${status}), trying next…`);
        lastError = err;
        continue; // try the next model
      }
      // Any other error (auth, bad payload, etc.) — throw immediately
      throw err;
    }
  }
  throw lastError || new Error('All Gemini models failed or are rate-limited.');
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
      if (base64ToUse.startsWith('data:')) {
        cleanBase64 = base64ToUse.split(',')[1];
      }

      const prompt = `You are Resiklo, an advanced eco-friendly waste management AI. Analyze the uploaded photo of an object.
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

      const imagePart = { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } };
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
      fallbackToMock = true;
    } else {
      try {
        let cleanBase64 = base64ToUse;
        if (base64ToUse.startsWith('data:')) {
          cleanBase64 = base64ToUse.split(',')[1];
        }

        const prompt = `You are Resiklo, an advanced eco-friendly waste management AI. Analyze the uploaded photo.
Identify the object type and generate exactly 3 clarifying multiple-choice questions to ask the user.
These questions should help confirm the specific state, cleanliness, material structure, or details of the object to ensure a highly reliable recycling or reuse decision.
Return a JSON object with the following fields:
{
  "objectType": "string (name of identified item, e.g. Plastic Bottle, Laptop, Newspaper)",
  "confidence": number (estimated identification accuracy from 0.0 to 1.0),
  "isEwaste": boolean (true if electronic waste),
  "questions": [
    {
      "id": "string (unique question slug, e.g. cleanliness, battery_removable, label_present)",
      "title": "string (clear, user-friendly question, e.g. Is the bottle clean and rinsed?)",
      "description": "string (brief context or reason, e.g. Leftover liquids contaminate plastics.)",
      "options": [
        { "value": "string (lowercased short answer, e.g. clean, dirty)", "label": "string (user-friendly label, e.g. Yes, completely rinsed)" }
      ]
    }
  ]
}`;

        const imagePart = { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } };
        result = await callGemini([prompt, imagePart]);
        console.log('Gemini Initiate Response:', result);
      } catch (geminiErr) {
        console.warn('Gemini initiate error, falling back to mock:', geminiErr.message || geminiErr);
        fallbackToMock = true;
      }
    }

    if (fallbackToMock) {
      // High-fidelity mock question fallback
      const isEwasteMock = (scanRecord && scanRecord.image_url && (scanRecord.image_url.includes('electronics') || scanRecord.image_url.includes('battery'))) || false;
      result = {
        objectType: isEwasteMock ? "Old Mobile Phone" : "Plastic Water Bottle",
        confidence: 0.95,
        isEwaste: isEwasteMock,
        questions: isEwasteMock ? [
          {
            id: 'functional',
            title: 'Is the device still functional?',
            description: 'Can it power on or perform its original function?',
            options: [
              { value: 'yes', label: 'Yes, fully functional' },
              { value: 'partial', label: 'Partially functional / screen damaged' },
              { value: 'no', label: 'No, completely dead' }
            ]
          },
          {
            id: 'battery',
            title: 'Is the battery swollen or removable?',
            description: 'Swollen batteries are highly hazardous and require special handling.',
            options: [
              { value: 'removable', label: 'Removable and intact' },
              { value: 'non_removable', label: 'Non-removable/Built-in' },
              { value: 'swollen', label: 'Warning: Swollen or damaged' }
            ]
          },
          {
            id: 'parts',
            title: 'Are any components missing?',
            description: 'Check if screens, casings, or primary boards are removed.',
            options: [
              { value: 'complete', label: 'All components intact' },
              { value: 'minor_missing', label: 'Minor parts missing (buttons, trays)' },
              { value: 'stripped', label: 'Internal components stripped' }
            ]
          }
        ] : [
          {
            id: 'functional',
            title: 'Is the item still functional?',
            description: 'Can it still perform its primary purpose without major repairs?',
            options: [
              { value: 'yes', label: 'Yes, fully functional' },
              { value: 'partial', label: 'Partially functional' },
              { value: 'no', label: 'No, completely broken' }
            ]
          },
          {
            id: 'clean',
            title: 'Is it clean?',
            description: 'Is it free from food residue, hazardous chemicals, or heavy dirt?',
            options: [
              { value: 'yes', label: 'Yes, clean' },
              { value: 'needs_cleaning', label: 'Needs minor cleaning' },
              { value: 'no', label: 'No, heavily soiled' }
            ]
          },
          {
            id: 'parts',
            title: 'Are any parts missing?',
            description: 'Does it have all its original components?',
            options: [
              { value: 'no', label: 'All parts present' },
              { value: 'minor', label: 'Minor parts missing' },
              { value: 'major', label: 'Major components missing' }
            ]
          }
        ]
      };
    }

    // Save dynamic questions inside scan record (gemini_response JSON field)
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('scans')
        .update({
          object_type: result.objectType,
          confidence: result.confidence,
          is_ewaste: result.isEwaste,
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
        gemini_response: { ...scanRecord.gemini_response, questions: result.questions }
      });
    }

    res.json({
      success: true,
      scanId,
      objectType: result.objectType,
      confidence: Math.round(result.confidence * 100),
      isEwaste: result.isEwaste,
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
        if (base64ToUse.startsWith('data:')) {
          cleanBase64 = base64ToUse.split(',')[1];
        }

        const prompt = `You are Resiklo, an advanced eco-friendly waste management AI.
We previously identified this object as a ${objectType}.
The user has completed a short verification survey about the item. Here are their answers:
${surveyText}

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

        const imagePart = { inlineData: { data: cleanBase64, mimeType: 'image/jpeg' } };
        result = await callGemini([prompt, imagePart]);
        console.log('Gemini Finalize Response:', result);

      } catch (geminiErr) {
        console.warn('Gemini finalize error, falling back to mock:', geminiErr.message || geminiErr);
        fallbackToMock = true;
      }
    }

    if (fallbackToMock) {
      const isEwaste = scanRecord.is_ewaste;
      
      if (isEwaste) {
        result = {
          item: `${objectType} · E-Waste`,
          confidence: 94,
          condition: answers.functional === 'yes' ? 'Working Device' : 'Broken Hardware',
          hazard: answers.battery === 'swollen' ? 'High' : 'Medium',
          reuse: answers.functional === 'yes' ? [
            {
              title: "Repurpose as Offline Nav",
              desc: "Mount the phone in a car or bike to use for offline maps, dashboard telemetry, or dashcam.",
              icon: "Wrench"
            },
            {
              title: "Dedicated Media Controller",
              desc: "Set up as a dedicated player for home sound systems, smart alarms, or e-readers.",
              icon: "Heart"
            }
          ] : [
            {
              title: "Educational Teardown",
              desc: "Use the shell and non-toxic components for hardware assembly, educational labs, or craft structures.",
              icon: "Sprout"
            }
          ],
          repair: answers.functional === 'partial' ? [
            {
              title: "Screen or Port Replacement",
              desc: "Common failure points can be fixed cheaply at local kiosks. Extending phone life by 1 year saves high resources.",
              icon: "Wrench"
            }
          ] : [],
          donate: answers.functional === 'yes' ? [
            {
              title: "Donate to Education Programs",
              desc: "Provide working low-spec hardware to kids or digital literacy groups.",
              icon: "Heart"
            }
          ] : [],
          recycle: answers.battery === 'swollen'
            ? "⚠️ CRITICAL HAZARD: Store in a sand container. Deliver immediately to Makati E-Waste or specialized barangay drop points. Do not press or expose to heat."
            : "Remove SIM cards. Wipe personal data. Deliver to certified e-waste facilities to recover precious metals like gold and silver safely.",
          impact: "2.80"
        };
      } else {
        result = {
          item: `${objectType} · Standard Recyclable`,
          confidence: 96,
          condition: answers.clean === 'yes' ? 'Recyclable' : 'Needs Cleaning',
          hazard: null,
          reuse: [
            {
              title: "Self-Watering Planter",
              desc: "Cut the bottle in half, invert the top part, and place a cotton wick to irrigate soil.",
              icon: "Sprout"
            },
            {
              title: "DIY Office Organizer",
              desc: "Cut the base, file the edges, and decorate to hold crayons, pens, or small items.",
              icon: "PenTool"
            }
          ],
          repair: [],
          donate: [],
          recycle: answers.clean === 'no' 
            ? "Wash with soap to remove food residues. Contaminated plastics cannot be recycled. Crush, keep the cap separate, and drop in plastics collection bin."
            : "Rinse and crush to minimize storage space. Separate the cap and place in the plastics recovery container.",
          impact: "0.12"
        };
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
      ...result
    });

  } catch (error) {
    console.error('Scan finalize error:', error);
    res.status(500).json({ error: error.message || 'Failed to finalize dynamic analysis' });
  }
});

// 4. Localized recycling facilities search
app.get('/api/facilities', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat) || 14.5995; // Manila defaults
    const lng = parseFloat(req.query.lng) || 120.9842;
    const type = req.query.type || '';
    const radius = parseFloat(req.query.radius) || 10; // in km

    let facilities = [];

    // Production: Try calling DB
    if (supabaseAdmin) {
      try {
        let dbQuery = supabaseAdmin.from('facilities').select('*').eq('verified', true);
        if (type) {
          dbQuery = dbQuery.eq('type', type);
        }
        const { data: dbFacilities } = await dbQuery;

        if (dbFacilities && dbFacilities.length > 0) {
          facilities = dbFacilities.map(f => {
            const distance = calculateDistance(lat, lng, f.latitude, f.longitude);
            return { ...f, distance };
          }).filter(f => f.distance <= radius);
        }
      } catch (dbErr) {
        console.warn('Supabase facilities check failed:', dbErr);
      }
    }

    // Mapbox Search Box API Lookup fallback if low numbers
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (facilities.length < 5 && mapboxToken && !mapboxToken.includes('your_mapbox_access_token')) {
      try {
        const query = type === 'ewaste' ? 'electronic waste recycling' : (type || 'recycling center');
        const searchUrl = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(query)}&proximity=${lng},${lat}&limit=10&access_token=${mapboxToken}`;

        const response = await fetch(searchUrl);
        const data = await response.json();
        if (data.features) {
          const places = data.features.map(feature => {
            const featureLng = feature.geometry.coordinates[0];
            const featureLat = feature.geometry.coordinates[1];
            const distance = calculateDistance(lat, lng, featureLat, featureLng);
            return {
              id: feature.properties.mapbox_id || feature.id,
              name: feature.properties.name || feature.text || 'Recycling Center',
              type: type || 'recycling',
              latitude: featureLat,
              longitude: featureLng,
              distance: parseFloat(distance.toFixed(2)),
              address: feature.properties.full_address || feature.properties.address || 'Local Area',
              verified: false,
              accepted_waste: type === 'ewaste' ? ['electronics', 'batteries', 'chargers', 'phones'] : ['plastic', 'paper', 'glass', 'metal']
            };
          });
          facilities = [...facilities, ...places];
        }
      } catch (mapboxErr) {
        console.warn('Mapbox Places fetch failed:', mapboxErr);
      }
    }

    // Hardcoded Seed Data fallbacks if everything is empty or missing keys
    if (facilities.length === 0) {
      facilities = [
        {
          id: 'moa-recycling',
          name: 'SM Mall of Asia Recycling Center',
          type: 'recycling',
          latitude: 14.5355,
          longitude: 120.9827,
          distance: parseFloat(calculateDistance(lat, lng, 14.5355, 120.9827).toFixed(2)),
          address: 'MOA Square, Pasay City, Metro Manila',
          verified: true,
          accepted_waste: ['plastic', 'paper', 'glass', 'metal']
        },
        {
          id: 'makati-ewaste',
          name: 'Makati E-Waste Facility',
          type: 'ewaste',
          latitude: 14.5547,
          longitude: 121.0242,
          distance: parseFloat(calculateDistance(lat, lng, 14.5547, 121.0242).toFixed(2)),
          address: '123 Jupiter Street, Makati City, Metro Manila',
          verified: true,
          accepted_waste: ['electronics', 'batteries', 'chargers', 'phones']
        },
        {
          id: 'barangay-san-antonio',
          name: 'Barangay San Antonio Collection Hall',
          type: 'barangay',
          latitude: 14.5632,
          longitude: 121.0185,
          distance: parseFloat(calculateDistance(lat, lng, 14.5632, 121.0185).toFixed(2)),
          address: 'San Antonio Village, Makati City',
          verified: true,
          accepted_waste: ['plastic', 'paper', 'organic']
        }
      ];
    }

    // Sort nearest first
    facilities.sort((a, b) => a.distance - b.distance);

    res.json({
      success: true,
      facilities,
      totalResults: facilities.length
    });

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
        const searchTerms = {
          diy: `${query} DIY reuse upcycle tutorial`,
          repair: `${query} how to fix repair guide`,
          recycle: `${query} how to recycle properly sorting`
        };
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=${limit}&q=${encodeURIComponent(searchTerms[type] || query)}&type=video&key=${youtubeKey}`;
        
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
app.listen(PORT, () => {
  console.log(`🚀 Resiklo Secure Proxy Backend is running on http://localhost:${PORT}`);
  // Run startup checks: verify/create storage bucket & probe DB tables
  bootstrapDatabase().catch(e => console.error('Bootstrap error:', e.message));
});

