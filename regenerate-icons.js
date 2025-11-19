#!/usr/bin/env node

/**
 * Regenerate all PNG icons from icon-base.svg
 * This ensures all icons use the updated teal color scheme
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputSvg = path.join(__dirname, 'src/frontend/public/icons/icon-base.svg');
const outputDir = path.join(__dirname, 'src/frontend/public/icons');

// All required icon sizes
const sizes = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512];

async function generateIcons() {
  console.log('🎨 Regenerating icons from updated SVG (teal color scheme)...');
  console.log('');
  
  if (!fs.existsSync(inputSvg)) {
    console.error(`❌ SVG file not found: ${inputSvg}`);
    process.exit(1);
  }
  
  // Generate all standard icon sizes
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    try {
      await sharp(inputSvg)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      console.log(`✅ Generated: icon-${size}x${size}.png`);
    } catch (error) {
      console.error(`❌ Error generating icon-${size}x${size}.png:`, error.message);
    }
  }
  
  // Generate Apple touch icon (180x180)
  const appleTouchIconPath = path.join(outputDir, 'apple-touch-icon.png');
  try {
    await sharp(inputSvg)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(appleTouchIconPath);
    console.log(`✅ Generated: apple-touch-icon.png`);
  } catch (error) {
    console.error(`❌ Error generating apple-touch-icon.png:`, error.message);
  }
  
  // Generate meetcute-logo.png (512x512)
  const logoPath = path.join(outputDir, 'meetcute-logo.png');
  try {
    await sharp(inputSvg)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(logoPath);
    console.log(`✅ Generated: meetcute-logo.png`);
  } catch (error) {
    console.error(`❌ Error generating meetcute-logo.png:`, error.message);
  }
  
  // Generate meetcute-logo-512.png (512x512)
  const logo512Path = path.join(outputDir, 'meetcute-logo-512.png');
  try {
    await sharp(inputSvg)
      .resize(512, 512, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(logo512Path);
    console.log(`✅ Generated: meetcute-logo-512.png`);
  } catch (error) {
    console.error(`❌ Error generating meetcute-logo-512.png:`, error.message);
  }
  
  console.log('');
  console.log('🎉 All icons regenerated successfully with teal color scheme!');
  console.log('💡 Remember to update LOGO_VERSION in constants.ts to force cache refresh');
}

generateIcons().catch(console.error);

