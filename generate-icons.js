#!/usr/bin/env node

/**
 * Icon Generator for PWA
 * 
 * This script generates app icons in multiple sizes from the base SVG.
 * 
 * MANUAL STEPS REQUIRED:
 * 1. Install sharp: npm install sharp
 * 2. Run this script: node generate-icons.js
 * 3. Icons will be generated in src/frontend/public/icons/
 * 
 * Alternatively, use an online tool:
 * - https://realfavicongenerator.net/
 * - https://www.pwabuilder.com/imageGenerator
 * 
 * Upload src/frontend/public/icons/icon-base.svg and download all sizes.
 */

const fs = require('fs');
const path = require('path');

console.log('🎬 Meet Cute PWA Icon Generator');
console.log('');
console.log('📋 MANUAL ICON GENERATION STEPS:');
console.log('');
console.log('Option 1: Use Online Tool (Recommended)');
console.log('  1. Visit: https://www.pwabuilder.com/imageGenerator');
console.log('  2. Upload: src/frontend/public/icons/icon-base.svg');
console.log('  3. Download all generated icons');
console.log('  4. Place them in: src/frontend/public/icons/');
console.log('');
console.log('Option 2: Use Sharp (Node.js)');
console.log('  1. Install: npm install sharp');
console.log('  2. Uncomment the code below in this file');
console.log('  3. Run: node generate-icons.js');
console.log('');
console.log('Required icon sizes:');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
sizes.forEach(size => {
  console.log(`  - ${size}x${size}px → icon-${size}x${size}.png`);
});
console.log('');
console.log('iOS-specific icons (optional but recommended):');
console.log('  - 180x180px → apple-touch-icon.png');
console.log('  - 1170x2532px → splash-screen.png');
console.log('');

// Uncomment this section if you have sharp installed:
/*
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, 'src/frontend/public/icons/icon-base.svg');
const outputDir = path.join(__dirname, 'src/frontend/public/icons');

async function generateIcons() {
  console.log('🎨 Generating icons...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(inputSvg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  }
  
  // Generate Apple touch icon
  const appleTouchIconPath = path.join(outputDir, 'apple-touch-icon.png');
  await sharp(inputSvg)
    .resize(180, 180)
    .png()
    .toFile(appleTouchIconPath);
  console.log(`✅ Generated: apple-touch-icon.png`);
  
  console.log('');
  console.log('🎉 All icons generated successfully!');
}

generateIcons().catch(console.error);
*/

