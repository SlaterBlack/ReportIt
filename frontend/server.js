// Serves the Angular production build and proxies /api to the shared StoreIt API.
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  process.loadEnvFile(envPath);
}

const HOST = process.env.FRONTEND_HOST?.trim() || '127.0.0.1';
const PORT = Number(process.env.FRONTEND_PORT ?? 2405);
const API_TARGET = process.env.STOREIT_API_URL?.trim();
const BROWSER_DIR = path.join(__dirname, 'dist', 'reportit', 'browser');
const INDEX_PATH = path.join(BROWSER_DIR, 'index.html');
const INSTANCE_BRAND_PATH = path.join(__dirname, 'instance-brand.json');
const INSTANCE_ASSETS_DIR = path.join(__dirname, 'instance-assets');

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error('FRONTEND_PORT must be an integer from 1 to 65535.');
}
if (!API_TARGET) {
  throw new Error('STOREIT_API_URL must be set in frontend/.env or the process environment.');
}

const targetUrl = new URL(API_TARGET);
if (!['http:', 'https:'].includes(targetUrl.protocol)) {
  throw new Error('STOREIT_API_URL must use http:// or https://.');
}
if (!fs.existsSync(INDEX_PATH)) {
  throw new Error('ReportIt production build not found. Run npm run build before npm run serve.');
}

if (!fs.existsSync(INSTANCE_BRAND_PATH)) {
  throw new Error(
    'ReportIt instance branding not found. Copy instance-brand.example.json to instance-brand.json and configure this instance.',
  );
}

const instanceBrand = JSON.parse(fs.readFileSync(INSTANCE_BRAND_PATH, 'utf8'));
const isInstanceAssetPath = (value) =>
  typeof value === 'string' &&
  /^\/instance-assets\/[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value);
if (
  typeof instanceBrand.companyName !== 'string' ||
  !instanceBrand.companyName.trim() ||
  (instanceBrand.logoPath !== null &&
    !isInstanceAssetPath(instanceBrand.logoPath)) ||
  (instanceBrand.logoLightPath !== undefined &&
    instanceBrand.logoLightPath !== null &&
    !isInstanceAssetPath(instanceBrand.logoLightPath)) ||
  (instanceBrand.logoDarkPath !== undefined &&
    instanceBrand.logoDarkPath !== null &&
    !isInstanceAssetPath(instanceBrand.logoDarkPath))
) {
  throw new Error(
    'instance-brand.json must include a companyName and only logo paths under /instance-assets/.',
  );
}
for (const logoPath of [
  instanceBrand.logoPath,
  instanceBrand.logoLightPath,
  instanceBrand.logoDarkPath,
].filter(Boolean)) {
  if (!fs.existsSync(path.join(INSTANCE_ASSETS_DIR, path.basename(logoPath)))) {
    throw new Error(`ReportIt instance logo not found: ${logoPath}`);
  }
}

const app = express();

app.use(
  '/api',
  createProxyMiddleware({
    target: API_TARGET.replace(/\/+$/, ''),
    changeOrigin: true,
    pathRewrite: (requestPath) => `/api${requestPath}`,
  }),
);
app.get('/brand-config.json', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    companyName: instanceBrand.companyName.trim(),
    logoPath: instanceBrand.logoPath,
    logoLightPath: instanceBrand.logoLightPath ?? null,
    logoDarkPath: instanceBrand.logoDarkPath ?? null,
  });
});
app.use(
  '/instance-assets',
  express.static(INSTANCE_ASSETS_DIR, { fallthrough: false }),
);
app.use(express.static(BROWSER_DIR));
app.get(/.*/, (_req, res) => {
  res.sendFile(INDEX_PATH);
});

app.listen(PORT, HOST, () => {
  console.log(`ReportIt frontend listening on http://${HOST}:${PORT}, proxying /api to ${API_TARGET}`);
});
