#!/usr/bin/env node
/**
 * Interactive setup wizard for google-building-measure.
 * Run:  node setup.js
 * It will ask for your API keys, create the .env file, and run npm install.
 */

import { createInterface } from 'readline';
import { writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const DIR = dirname(fileURLToPath(import.meta.url));
const ENV_FILE = resolve(DIR, '.env');

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function maskKey(key) {
  if (!key || key.length < 8) return '(empty)';
  return key.slice(0, 8) + '...' + key.slice(-4);
}

console.log('\n');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   Google Building Measure — Setup Wizard                 ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('\nThis will create your .env file and install dependencies.');
console.log('Type or paste each key when prompted — keys stay on YOUR');
console.log('computer and are never sent anywhere except Google/Gemini.\n');

// Warn if .env already exists
if (existsSync(ENV_FILE)) {
  console.log('⚠️  A .env file already exists. We will overwrite it.\n');
}

console.log('─────────────────────────────────────────────────────────');
console.log('KEY 1: Google Maps API Key');
console.log('  Where to get it: console.cloud.google.com → Credentials');
console.log('─────────────────────────────────────────────────────────');
const mapsKey = await ask('Paste your Google Maps API key here: ');

console.log('\n─────────────────────────────────────────────────────────');
console.log('KEY 2: Google Gemini API Key (FREE)');
console.log('  Where to get it: aistudio.google.com → Get API key');
console.log('─────────────────────────────────────────────────────────');
const geminiKey = await ask('Paste your Gemini API key here: ');

rl.close();

// Validate both keys were entered
const errors = [];
if (!mapsKey || mapsKey.length < 10) errors.push('Google Maps API key looks too short or empty.');
if (!geminiKey || geminiKey.length < 10) errors.push('Gemini API key looks too short or empty.');

if (errors.length) {
  console.error('\n❌ Setup cancelled:\n' + errors.map(e => '  • ' + e).join('\n'));
  console.error('\nRun this script again and paste full keys.\n');
  process.exit(1);
}

// Write .env
const envContent = [
  '# Google Building Measure — environment config',
  '# DO NOT share this file or commit it to GitHub',
  '',
  '# Google Maps API Key (Geocoding, Static Maps, Street View, Solar, Aerial View)',
  `GOOGLE_MAPS_API_KEY=${mapsKey}`,
  '',
  '# Gemini Vision API Key (free at aistudio.google.com)',
  `GEMINI_API_KEY=${geminiKey}`,
  '',
  '# Vision provider (gemini = free default)',
  'VISION_PROVIDER=gemini',
  'GEMINI_MODEL=gemini-2.0-flash',
].join('\n');

writeFileSync(ENV_FILE, envContent, 'utf8');
console.log(`\n✅ .env file created (keys stored at: ${ENV_FILE})`);
console.log(`   Maps key:   ${maskKey(mapsKey)}`);
console.log(`   Gemini key: ${maskKey(geminiKey)}`);

// npm install
console.log('\n📦 Installing dependencies (this takes ~30 seconds)...\n');
try {
  execSync('npm install', { cwd: DIR, stdio: 'inherit' });
  console.log('\n✅ Dependencies installed.');
} catch {
  console.error('\n❌ npm install failed. Make sure Node.js is installed: https://nodejs.org');
  process.exit(1);
}

// Done
console.log('\n');
console.log('╔══════════════════════════════════════════════════════════╗');
console.log('║   ✅  Setup complete!                                    ║');
console.log('╚══════════════════════════════════════════════════════════╝');
console.log('\nNext step — add this to Claude Desktop config:');
console.log('\n  File location:');
console.log('    Mac:     ~/Library/Application Support/Claude/claude_desktop_config.json');
console.log('    Windows: %APPDATA%\\Claude\\claude_desktop_config.json');
console.log('\n  Add this block inside "mcpServers": { ... }');
console.log('\n' + JSON.stringify({
  "google-building-measure": {
    command: "node",
    args: [resolve(DIR, 'src/index.js')],
    env: {
      GOOGLE_MAPS_API_KEY: "loaded-from-env-file",
      GEMINI_API_KEY: "loaded-from-env-file",
      VISION_PROVIDER: "gemini"
    }
  }
}, null, 2));
console.log('\nThen restart Claude Desktop and ask it to run generate_roofr_report!\n');
