#!/usr/bin/env node

/**
 * Generate Mind Garden PWA icons
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../src/extension/icons/mind-garden-icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../src/frontend/public/icons');

const SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  console.log('🌱 Generating Mind Garden PWA icons...');
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const svgBuffer = fs.readFileSync(SVG_PATH);
  
  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `mindgarden-icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated ${outputPath}`);
  }
  
  // Also generate favicon sizes
  const faviconSizes = [16, 32];
  const publicDir = path.join(__dirname, '../src/frontend/public');
  
  for (const size of faviconSizes) {
    const filename = size === 32 ? 'favicon.png' : `favicon-${size}x${size}.png`;
    const outputPath = path.join(publicDir, filename);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated ${outputPath}`);
  }
  
  console.log('🎉 All PWA icons generated!');
}

generateIcons().catch(console.error);

