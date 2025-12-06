#!/usr/bin/env node

/**
 * Mind Garden Extension Builder
 * 
 * Builds Chrome (Manifest V3) and Firefox (Manifest V2) extensions
 * 
 * Usage:
 *   node scripts/build-extensions.js          # Build both
 *   node scripts/build-extensions.js chrome   # Chrome only
 *   node scripts/build-extensions.js firefox  # Firefox only
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, 'dist', 'extensions');
const CHROME_SRC = path.join(ROOT_DIR, 'src', 'extension');
const FIREFOX_SRC = path.join(ROOT_DIR, 'src', 'extension-firefox');

// Parse command line arguments
const target = process.argv[2] || 'all';

console.log('🌱 Mind Garden Extension Builder');
console.log('================================\n');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyDir(src, dest) {
  ensureDir(dest);
  
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function buildChrome() {
  console.log('📦 Building Chrome Extension (Manifest V3)...');
  
  const chromeOut = path.join(BUILD_DIR, 'chrome');
  
  // Clean and create output directory
  if (fs.existsSync(chromeOut)) {
    fs.rmSync(chromeOut, { recursive: true });
  }
  ensureDir(chromeOut);
  
  // Copy all files
  copyDir(CHROME_SRC, chromeOut);
  
  // Create ZIP file for Chrome Web Store
  const zipPath = path.join(BUILD_DIR, 'mind-garden-chrome.zip');
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  try {
    execSync(`cd "${chromeOut}" && zip -r "${zipPath}" .`, { stdio: 'inherit' });
    console.log(`   ✅ Chrome extension built: ${chromeOut}`);
    console.log(`   ✅ Chrome ZIP created: ${zipPath}\n`);
  } catch (error) {
    console.log(`   ✅ Chrome extension built: ${chromeOut}`);
    console.log(`   ⚠️  Could not create ZIP (zip command not available)\n`);
  }
  
  return chromeOut;
}

function buildFirefox() {
  console.log('📦 Building Firefox Extension (Manifest V2)...');
  
  const firefoxOut = path.join(BUILD_DIR, 'firefox');
  
  // Clean and create output directory
  if (fs.existsSync(firefoxOut)) {
    fs.rmSync(firefoxOut, { recursive: true });
  }
  ensureDir(firefoxOut);
  
  // Copy all files
  copyDir(FIREFOX_SRC, firefoxOut);
  
  // Create XPI file (just a ZIP with .xpi extension) for Firefox Add-ons
  const xpiPath = path.join(BUILD_DIR, 'mind-garden-firefox.xpi');
  if (fs.existsSync(xpiPath)) {
    fs.unlinkSync(xpiPath);
  }
  
  try {
    execSync(`cd "${firefoxOut}" && zip -r "${xpiPath}" .`, { stdio: 'inherit' });
    console.log(`   ✅ Firefox extension built: ${firefoxOut}`);
    console.log(`   ✅ Firefox XPI created: ${xpiPath}\n`);
  } catch (error) {
    console.log(`   ✅ Firefox extension built: ${firefoxOut}`);
    console.log(`   ⚠️  Could not create XPI (zip command not available)\n`);
  }
  
  return firefoxOut;
}

function generateIcons() {
  console.log('🎨 Generating extension icons...');
  
  try {
    const sharp = require('sharp');
    const svgPath = path.join(CHROME_SRC, 'icons', 'mind-garden-icon.svg');
    
    if (!fs.existsSync(svgPath)) {
      console.log('   ⚠️  SVG icon not found, skipping icon generation\n');
      return;
    }
    
    const sizes = [16, 32, 48, 128];
    const svgBuffer = fs.readFileSync(svgPath);
    
    const chromIconsDir = path.join(CHROME_SRC, 'icons');
    const firefoxIconsDir = path.join(FIREFOX_SRC, 'icons');
    
    ensureDir(chromIconsDir);
    ensureDir(firefoxIconsDir);
    
    for (const size of sizes) {
      const filename = `icon-${size}.png`;
      
      // Generate for Chrome
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(chromIconsDir, filename));
      
      // Generate for Firefox
      sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(firefoxIconsDir, filename));
    }
    
    console.log('   ✅ Icons generated for all sizes\n');
  } catch (error) {
    console.log('   ⚠️  Could not generate icons (sharp not available)\n');
  }
}

function showInstructions() {
  console.log('📋 Installation Instructions');
  console.log('============================\n');
  
  console.log('Chrome:');
  console.log('  1. Open chrome://extensions/');
  console.log('  2. Enable "Developer mode" (top right toggle)');
  console.log('  3. Click "Load unpacked"');
  console.log(`  4. Select: ${path.join(BUILD_DIR, 'chrome')}\n`);
  
  console.log('Firefox:');
  console.log('  1. Open about:debugging#/runtime/this-firefox');
  console.log('  2. Click "Load Temporary Add-on..."');
  console.log(`  3. Select: ${path.join(BUILD_DIR, 'firefox', 'manifest.json')}`);
  console.log('  (For permanent install, submit to addons.mozilla.org)\n');
}

// Main execution
ensureDir(BUILD_DIR);

if (target === 'all' || target === 'icons') {
  generateIcons();
}

if (target === 'all' || target === 'chrome') {
  buildChrome();
}

if (target === 'all' || target === 'firefox') {
  buildFirefox();
}

showInstructions();

console.log('✨ Build complete!\n');

