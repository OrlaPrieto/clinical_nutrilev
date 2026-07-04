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

  const r2AccessKey = env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const r2SecretKey = env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const r2Endpoint = env.CLOUDFLARE_R2_ENDPOINT;
  const r2Bucket = env.CLOUDFLARE_R2_BUCKET_NAME;
  const r2PublicUrl = env.CLOUDFLARE_R2_PUBLIC_URL;

  const isR2Configured = r2AccessKey && r2SecretKey && r2Endpoint && r2Bucket && r2PublicUrl;

  if (!isR2Configured) {
    console.error('❌ Error: Cloudflare R2 is not fully configured in your .env file!');
    console.log('Please configure CLOUDFLARE_R2_ACCESS_KEY_ID, SECRET_ACCESS_KEY, ENDPOINT, BUCKET_NAME and PUBLIC_URL before running this script.');
    process.exit(1);
  }

  console.log(`🚀 Starting Storage Migration from Supabase to Cloudflare R2`);
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`☁️ Cloudflare R2 Endpoint: ${r2Endpoint}`);
  console.log(`📦 Cloudflare R2 Bucket: ${r2Bucket}`);

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false }
  });

  const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: 'auto',
    endpoint: r2Endpoint,
    credentials: {
      accessKeyId: r2AccessKey,
      secretAccessKey: r2SecretKey,
    },
  });

  console.log(`\n📋 Querying patients from Database...`);
  const { data: patients, error: dbError } = await supabase
    .from('patients')
    .select('id, email, nombre, current_menus, menu_url');

  if (dbError) {
    console.error('Error fetching patients:', dbError);
    process.exit(1);
  }

  console.log(`Found ${patients.length} patients in database. Checking for files to migrate...`);

  let migratedFilesCount = 0;
  let updatedPatientsCount = 0;

  for (let i = 0; i < patients.length; i++) {
    const p = patients[i];
    let needsUpdate = false;
    let updatedMenus = p.current_menus ? [...p.current_menus] : [];
    let updatedMenuUrl = p.menu_url;

    console.log(`\n👤 [${i + 1}/${patients.length}] Checking patient: ${p.nombre} (${p.email})...`);

    // 1. Process current_menus array
    if (updatedMenus.length > 0) {
      for (let j = 0; j < updatedMenus.length; j++) {
        const menu = updatedMenus[j];
        if (menu.url && menu.url.includes('supabase.co/storage')) {
          const fileName = menu.url.substring(menu.url.lastIndexOf('/') + 1);
          console.log(`   📄 Found Supabase PDF: ${fileName}`);
          
          try {
            console.log(`      📥 Downloading from Supabase Storage...`);
            const { data: fileBlob, error: downloadError } = await supabase.storage
              .from('patient_menus')
              .download(fileName);

            if (downloadError) throw downloadError;

            const buffer = Buffer.from(await fileBlob.arrayBuffer());

            console.log(`      📤 Uploading to Cloudflare R2...`);
            const uploadCommand = new PutObjectCommand({
              Bucket: r2Bucket,
              Key: fileName,
              Body: buffer,
              ContentType: 'application/pdf',
              CacheControl: 'public, max-age=31536000, immutable',
            });

            await s3.send(uploadCommand);

            const newUrl = `${r2PublicUrl.replace(/\/$/, '')}/${fileName}`;
            menu.url = newUrl;
            needsUpdate = true;
            migratedFilesCount++;
            console.log(`      ✅ Migrated to R2 successfully: ${newUrl}`);
          } catch (err) {
            console.error(`      ❌ Error migrating file ${fileName}:`, err.message || err);
          }
        }
      }
    }

    // 2. Process legacy menu_url
    if (updatedMenuUrl && updatedMenuUrl.includes('supabase.co/storage')) {
      const fileName = updatedMenuUrl.substring(updatedMenuUrl.lastIndexOf('/') + 1);
      
      // If we already updated this URL in the array, let's find the matching new URL
      const matchingNewMenu = updatedMenus.find(m => m.url && m.url.endsWith(fileName));
      if (matchingNewMenu) {
        updatedMenuUrl = matchingNewMenu.url;
        needsUpdate = true;
        console.log(`   🔗 Updated legacy menu_url reference to R2 URL`);
      } else {
        // Otherwise migrate it directly
        console.log(`   📄 Found legacy Supabase URL: ${fileName}`);
        try {
          console.log(`      📥 Downloading legacy file...`);
          const { data: fileBlob, error: downloadError } = await supabase.storage
            .from('patient_menus')
            .download(fileName);

          if (downloadError) throw downloadError;

          const buffer = Buffer.from(await fileBlob.arrayBuffer());

          console.log(`      📤 Uploading legacy to Cloudflare R2...`);
          const uploadCommand = new PutObjectCommand({
            Bucket: r2Bucket,
            Key: fileName,
            Body: buffer,
            ContentType: 'application/pdf',
            CacheControl: 'public, max-age=31536000, immutable',
          });

          await s3.send(uploadCommand);

          const newUrl = `${r2PublicUrl.replace(/\/$/, '')}/${fileName}`;
          updatedMenuUrl = newUrl;
          needsUpdate = true;
          migratedFilesCount++;
          console.log(`      ✅ Migrated legacy file to R2 successfully: ${newUrl}`);
        } catch (err) {
          console.error(`      ❌ Error migrating legacy file ${fileName}:`, err.message || err);
        }
      }
    }

    // 3. Save updates to database
    if (needsUpdate) {
      console.log(`   💾 Saving new URLs to Supabase database...`);
      const { error: updateError } = await supabase
        .from('patients')
        .update({
          current_menus: updatedMenus,
          menu_url: updatedMenuUrl
        })
        .eq('id', p.id);

      if (updateError) {
        console.error(`   ❌ Database update failed:`, updateError);
      } else {
        console.log(`   ✅ Database updated successfully!`);
        updatedPatientsCount++;
      }
    } else {
      console.log(`   ℹ️ No files needed migration for this patient.`);
    }
  }

  console.log(`\n🎉 Storage Migration Complete!`);
  console.log(`📁 Files Migrated: ${migratedFilesCount}`);
  console.log(`👥 Patients Database Records Updated: ${updatedPatientsCount}`);
}

run();
