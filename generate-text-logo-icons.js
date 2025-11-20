const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Create SVG for the text logo with background
function createLogoSVG(size = 512, backgroundColor = '#ffffff') {
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="connectionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${backgroundColor}"/>
  
  <!-- Logo Text - scaled and centered -->
  <g transform="translate(${size * 0.15}, ${size * 0.35}) scale(${size / 512})">
    <text 
      x="0" 
      y="0" 
      font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
      font-weight="700" 
      font-size="120" 
      fill="url(#logoGradient)"
      letter-spacing="-2"
    >
      <tspan>M</tspan>
      <tspan>e</tspan>
      <tspan>e</tspan>
      <tspan x="0" dy="0" class="relative">
        <tspan>t</tspan>
        <!-- Connection line -->
        <path 
          d="M 60 0 Q 80 -10, 100 -5 T 140 0" 
          stroke="url(#connectionGradient)" 
          stroke-width="2" 
          stroke-linecap="round" 
          fill="none"
          transform="translate(0, -50)"
        />
      </tspan>
      <tspan x="150" dy="0">C</tspan>
      <tspan>u</tspan>
      <tspan>t</tspan>
      <tspan>e</tspan>
    </text>
  </g>
</svg>
  `.trim();
}

// Better approach: Use canvas-like rendering with proper text positioning
function createLogoSVGBetter(size = 512, backgroundColor = '#ffffff') {
  const fontSize = size * 0.15;
  const centerX = size / 2;
  const centerY = size / 2;
  const textY = centerY + fontSize * 0.35;
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient${size}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="connectionGradient${size}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${backgroundColor}"/>
  
  <!-- Logo Text Group - centered -->
  <g transform="translate(${centerX}, ${textY})">
    <text 
      text-anchor="middle"
      font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
      font-weight="700" 
      font-size="${fontSize}" 
      fill="url(#logoGradient${size})"
      letter-spacing="-0.02em"
    >
      <tspan x="0" dy="0">Mee</tspan>
      <tspan x="0" dy="0" dx="0">
        <tspan>t</tspan>
      </tspan>
      <tspan x="0" dy="0" dx="15">
        <tspan>C</tspan>
      </tspan>
      <tspan x="0" dy="0" dx="0">ute</tspan>
    </text>
    
    <!-- Connection line between t and C -->
    <path 
      d="M ${fontSize * 1.2} ${fontSize * -0.15} Q ${fontSize * 1.5} ${fontSize * -0.25}, ${fontSize * 1.8} ${fontSize * -0.2} T ${fontSize * 2.4} ${fontSize * -0.15}" 
      stroke="url(#connectionGradient${size})" 
      stroke-width="${fontSize * 0.02}" 
      stroke-linecap="round" 
      fill="none"
    />
  </g>
</svg>
  `.trim();
}

// Even better: Use absolute positioning for each letter
function createLogoSVGFinal(size = 512, backgroundColor = '#ffffff') {
  const fontSize = size * 0.2;
  const centerX = size / 2;
  const centerY = size / 2;
  const letterSpacing = fontSize * 0.1;
  const startX = centerX - (fontSize * 3.5); // Approximate center of "Meet Cute"
  
  // Calculate positions for each letter
  let currentX = startX;
  const y = centerY + fontSize * 0.35;
  
  return `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="logoGradient${size}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="connectionGradient${size}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#4f46e5;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#14b8a6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="${backgroundColor}"/>
  
  <!-- Logo Text - each letter positioned -->
  <text 
    font-family="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" 
    font-weight="700" 
    font-size="${fontSize}" 
    fill="url(#logoGradient${size})"
    letter-spacing="-0.02em"
  >
    <tspan x="${startX}" y="${y}">M</tspan>
    <tspan x="${startX + fontSize * 0.6}" y="${y}">e</tspan>
    <tspan x="${startX + fontSize * 1.2}" y="${y}">e</tspan>
    <tspan x="${startX + fontSize * 1.8}" y="${y}">t</tspan>
    <tspan x="${startX + fontSize * 2.6}" y="${y}">C</tspan>
    <tspan x="${startX + fontSize * 3.2}" y="${y}">u</tspan>
    <tspan x="${startX + fontSize * 3.8}" y="${y}">t</tspan>
    <tspan x="${startX + fontSize * 4.4}" y="${y}">e</tspan>
  </text>
  
  <!-- Connection line between t and C -->
  <path 
    d="M ${startX + fontSize * 1.8 + fontSize * 0.3} ${y - fontSize * 0.1} Q ${startX + fontSize * 2.1} ${y - fontSize * 0.2}, ${startX + fontSize * 2.4} ${y - fontSize * 0.15} T ${startX + fontSize * 2.6 - fontSize * 0.1} ${y - fontSize * 0.1}" 
    stroke="url(#connectionGradient${size})" 
    stroke-width="${fontSize * 0.015}" 
    stroke-linecap="round" 
    fill="none"
  />
</svg>
  `.trim();
}

async function generateIcons() {
  console.log('🎨 Generating icons from text logo...');
  
  const outputDir = path.join(__dirname, 'src/frontend/public/icons');
  const publicDir = path.join(__dirname, 'src/frontend/public');
  
  // Ensure directories exist
  fs.mkdirSync(outputDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });
  
  // Icon sizes for PWA
  const iconSizes = [32, 72, 96, 128, 144, 152, 180, 192, 384, 512];
  
  // Generate PWA icons
  for (const size of iconSizes) {
    const svg = createLogoSVGFinal(size, '#ffffff');
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ Generated: icon-${size}x${size}.png`);
  }
  
  // Generate apple-touch-icon (180x180)
  const appleTouchSvg = createLogoSVGFinal(180, '#ffffff');
  await sharp(Buffer.from(appleTouchSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(outputDir, 'apple-touch-icon.png'));
  console.log(`✅ Generated: apple-touch-icon.png`);
  
  // Generate favicon (32x32 and 192x192)
  const favicon32Svg = createLogoSVGFinal(32, '#ffffff');
  await sharp(Buffer.from(favicon32Svg))
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log(`✅ Generated: favicon.png`);
  
  const favicon192Svg = createLogoSVGFinal(192, '#ffffff');
  await sharp(Buffer.from(favicon192Svg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'favicon-192x192.png'));
  console.log(`✅ Generated: favicon-192x192.png`);
  
  // Generate og-image for social media (1200x630)
  const ogImageSvg = createLogoSVGFinal(1200, '#ffffff');
  await sharp(Buffer.from(ogImageSvg))
    .resize(1200, 630)
    .png()
    .toFile(path.join(publicDir, 'og-image.png'));
  console.log(`✅ Generated: og-image.png (1200x630)`);
  
  // Generate larger og-image for better quality (1200x1200 square)
  const ogImageSquareSvg = createLogoSVGFinal(1200, '#ffffff');
  await sharp(Buffer.from(ogImageSquareSvg))
    .resize(1200, 1200)
    .png()
    .toFile(path.join(publicDir, 'og-image-square.png'));
  console.log(`✅ Generated: og-image-square.png (1200x1200)`);
  
  console.log('');
  console.log('🎉 All icons generated successfully!');
  console.log('💡 Remember to update version numbers in manifest.json and index.html');
}

generateIcons().catch(console.error);

