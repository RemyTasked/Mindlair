#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');
const svgPath = path.join(iconsDir, 'icon.svg');

console.log('Generating PWA icons from SVG...\n');

// Check if sharp is available, if not use a simple approach
try {
  const sharp = require('sharp');
  
  sizes.forEach(async (size) => {
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`Generated: icon-${size}x${size}.png`);
  });
} catch (e) {
  console.log('Sharp not installed. Installing...');
  try {
    execSync('npm install sharp --save-dev', { stdio: 'inherit' });
    console.log('\nSharp installed. Run this script again to generate icons.');
  } catch (installError) {
    console.log('\nAlternative: Use an online SVG to PNG converter or run:');
    console.log('npx svg-to-png public/icons/icon.svg --output public/icons/');
    console.log('\nOr install sharp manually: npm install sharp --save-dev');
  }
}

// Also generate apple-touch-icon
console.log('\nFor apple-touch-icon, copy icon-180x180.png to apple-touch-icon.png');
