const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    console.log('Last 5 Scans in DB:');
    data.forEach(scan => {
      console.log(`- ID: ${scan.id}`);
      console.log(`  Created At: ${scan.created_at}`);
      console.log(`  Image URL: ${scan.image_url}`);
      console.log(`  Storage Path: ${scan.image_storage_path}`);
      console.log(`  Object Type: ${scan.object_type}`);
      console.log(`  Is E-Waste: ${scan.is_ewaste}`);
      console.log(`  Gemini Response:`, JSON.stringify(scan.gemini_response, null, 2));
      console.log('---');
    });
  } catch (err) {
    console.error('Error fetching scans:', err.message);
  }
}

run();
