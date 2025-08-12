#!/usr/bin/env node
// Build script to export Expo web app to dist/web and copy the landing site to dist/landing
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function run(cmd, opts = {}) {
  console.log(`[build] ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirSync(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else if (entry.isFile()) {
      copyFileSync(srcPath, destPath);
    }
  }
}

(async () => {
  const root = process.cwd();
  const dist = path.join(root, 'dist');
  const webOut = path.join(dist, 'web');
  const landingOut = path.join(dist, 'landing');

  // Validate required env for web export so the portal doesn't crash at runtime
  const REQUIRED_ENV = [
    'APP_ENV',
    'APP_NAME',
    'APP_VERSION',
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    // optional but recommended
    // 'FIREBASE_MEASUREMENT_ID',
    'API_BASE_URL',
    'EXPO_PROJECT_ID',
  ];
  if (process.env.APP_ENV === undefined) {
    process.env.APP_ENV = 'production';
  }
  if (process.env.SKIP_WEB_ENV_CHECK !== 'true') {
    const missing = REQUIRED_ENV.filter((k) => !process.env[k] || String(process.env[k]).trim() === '');
    if (missing.length) {
      console.error('\n[build] ERROR: Missing required environment variables for web build:');
      for (const k of missing) console.error('  - ' + k);
      console.error('\nSet these in your Vercel Project (Production) Environment Variables, or create a .env file locally.');
      console.error('You can bypass this check by setting SKIP_WEB_ENV_CHECK=true, but the web portal may crash at runtime.');
      process.exit(1);
    }
  }

  // Clean previous dist
  if (fs.existsSync(dist)) {
    console.log('[build] Cleaning dist folder');
    fs.rmSync(dist, { recursive: true, force: true });
  }

  // Export Expo web to dist/web with webpack config publicPath=/web/
  run('npx expo export --platform web --output-dir dist/web');

  // Copy landing site to dist/landing
  console.log('[build] Copying landing site to dist/landing');
  copyDirSync(path.join(root, 'site'), landingOut);

  // Copy required branding assets for landing
  const assetsToCopy = [
    ['assets/logo.png', 'assets/logo.png'],
    ['assets/logo-small-icon.png', 'assets/logo-small-icon.png'],
    ['assets/favicon.png', 'assets/favicon.png'],
    ['assets/fonts/BalooBhaijaan2-Regular.ttf', 'assets/fonts/BalooBhaijaan2-Regular.ttf'],
  ];
  for (const [srcRel, destRel] of assetsToCopy) {
    const src = path.join(root, srcRel);
    const dest = path.join(landingOut, destRel);
    if (fs.existsSync(src)) {
      console.log(`[build] Copy ${srcRel} -> landing/${destRel}`);
      copyFileSync(src, dest);
    }
  }

  // Create a simple 404.html for the landing to avoid directory listing
  const notFoundPath = path.join(landingOut, '404.html');
  if (!fs.existsSync(notFoundPath)) {
    fs.writeFileSync(
      notFoundPath,
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Page Not Found</title><h1>404</h1><p>Page not found.</p>'
    );
  }

  // Patch Expo web index.html absolute paths to include /web prefix
  const webIndexPath = path.join(webOut, 'index.html');
  if (fs.existsSync(webIndexPath)) {
    console.log('[build] Patching web/index.html asset URLs to prefix with /web');
    let html = fs.readFileSync(webIndexPath, 'utf8');
    // Only prefix absolute paths that start from root
    html = html.replace(/src="\/_expo\//g, 'src="/web/_expo/');
    html = html.replace(/href="\/_expo\//g, 'href="/web/_expo/');
    html = html.replace(/href="\/favicon\.ico"/g, 'href="/web/favicon.ico"');
    fs.writeFileSync(webIndexPath, html, 'utf8');
  }

  console.log('[build] Done');
})();
