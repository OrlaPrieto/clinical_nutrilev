const fs = require('fs');
const path = require('path');

// Leer variables de entorno (provistas por Vercel o localmente)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fhzoyojghnaimmczefyc.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const apiUrl = process.env.API_URL || 'https://clinical-nutrilev.onrender.com/api';

const envConfigFile = `export const environment = {
  production: true,
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}',
  apiUrl: '${apiUrl}',
  menuDurationDays: 7,
  vapidPublicKey: 'BGkIPrJdZSc-BYUlBo9Ums7lIBO3Bh4rEVvFrgXP2hXxuvNH-BKRc5Nuf1XpT-xVNRYOM59lhRiZ2-BGRT9k2CQ',
  gaMeasurementId: 'G-CTM431SENR'
};
`;

// Ruta donde se generará el archivo de entorno en producción
const dirPath = path.join(__dirname, 'apps', 'frontend', 'src', 'environments');
const filePath = path.join(dirPath, 'environment.prod.ts');

// Asegurar que el directorio existe
if (!fs.existsSync(dirPath)) {
  fs.mkdirSync(dirPath, { recursive: true });
}

fs.writeFileSync(filePath, envConfigFile, 'utf8');
console.log(`[set-env] Generado environment.prod.ts dinámicamente:
  - URL Supabase: ${supabaseUrl}
  - URL API Backend: ${apiUrl}`);
