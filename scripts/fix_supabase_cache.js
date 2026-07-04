const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Helper to parse .env file
function loadEnv() {
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('No .env file found at project root!');
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      env[key] = val;
    }
  });
  return env;
}

async function run() {
  const env = loadEnv();
  const supabaseUrl = env.VITE_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error('Error: VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found in .env!');
    process.exit(1);
  }

  console.log(`🚀 Starting Cache-Control migration for Supabase Storage`);
  console.log(`🔗 Project URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  const bucketName = 'patient_menus';

  console.log(`📦 Fetching all files in bucket '${bucketName}'...`);

  // Recursively list all files
  let allFiles = [];
  let page = 0;
  const limit = 100;

  while (true) {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit,
        offset: page * limit,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error listing files:', error);
      process.exit(1);
    }

    if (!files || files.length === 0) break;
    allFiles = allFiles.concat(files.filter(f => f.name !== '.emptyFolderPlaceholder'));
    if (files.length < limit) break;
    page++;
  }

  console.log(`📋 Found ${allFiles.length} files. Starting Cache-Control update...`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < allFiles.length; i++) {
    const file = allFiles[i];
    const filePath = file.name;

    // We only want to update PDFs
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      console.log(`[Skipped] ${filePath} (not a PDF)`);
      continue;
    }

    const fileSizeMb = file.metadata ? (file.metadata.size / 1024 / 1024).toFixed(2) : 'Unknown';
    console.log(`[${i + 1}/${allFiles.length}] Processing ${filePath} (${fileSizeMb} MB)...`);

    try {
      // 1. Download
      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);

      if (downloadError) throw downloadError;

      // 2. Convert blob/data to buffer
      const buffer = Buffer.from(await fileBlob.arrayBuffer());

      // 3. Re-upload / Overwrite with new cacheControl
      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          upsert: true,
          contentType: 'application/pdf',
          cacheControl: 'public, max-age=31536000, immutable'
        });

      if (uploadError) throw uploadError;

      console.log(`   ✅ Cache-Control updated successfully!`);
      successCount++;
    } catch (err) {
      console.error(`   ❌ Failed to process ${filePath}:`, err.message || err);
      errorCount++;
    }
  }

  console.log(`\n🎉 Cache-Control Migration Finished!`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failures: ${errorCount}`);
}

run();
