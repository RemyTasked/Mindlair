import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const iconsDir = path.join(__dirname, '../public/icons');
const svgPath = path.join(iconsDir, 'icon.svg');

console.log('Generating PWA icons from SVG...\n');

for (const size of sizes) {
  const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);
  await sharp(svgPath)
    .resize(size, size)
    .png()
    .toFile(outputPath);
  console.log(`Generated: icon-${size}x${size}.png`);
}

// Copy 180x180 as apple-touch-icon
const appleTouchPath = path.join(iconsDir, '../apple-touch-icon.png');
await sharp(svgPath)
  .resize(180, 180)
  .png()
  .toFile(appleTouchPath);
console.log('Generated: apple-touch-icon.png');

// Generate favicon
const faviconPath = path.join(iconsDir, '../favicon.ico');
await sharp(svgPath)
  .resize(32, 32)
  .png()
  .toFile(path.join(iconsDir, '../favicon-32x32.png'));
console.log('Generated: favicon-32x32.png');

await sharp(svgPath)
  .resize(16, 16)
  .png()
  .toFile(path.join(iconsDir, '../favicon-16x16.png'));
console.log('Generated: favicon-16x16.png');

console.log('\nAll icons generated successfully!');
