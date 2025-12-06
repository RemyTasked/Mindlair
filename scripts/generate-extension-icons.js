/**
 * Generate extension icons from SVG
 * Run: node scripts/generate-extension-icons.js
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../src/extension/icons/mind-garden-icon.svg');
const OUTPUT_DIR = path.join(__dirname, '../src/extension/icons');

const SIZES = [16, 32, 48, 128];

async function generateIcons() {
  console.log('🌱 Generating Mind Garden extension icons...');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const svgBuffer = fs.readFileSync(SVG_PATH);
  
  for (const size of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated ${outputPath}`);
  }
  
  console.log('🎉 All extension icons generated!');
}

generateIcons().catch(console.error);

