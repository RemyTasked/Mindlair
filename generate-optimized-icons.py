#!/usr/bin/env python3
"""
Generate optimized Meet Cute icons for all platforms
- High contrast for browser tabs
- Optimized for small sizes (16x16, 32x32)
- Better visibility on home screens
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Brand colors
PURPLE_DARK = (99, 102, 241)  # #6366f1 (indigo-600)
PURPLE_LIGHT = (199, 210, 254)  # #c7d2fe (indigo-200)
WHITE = (255, 255, 255)

def create_icon(size, padding_ratio=0.15):
    """Create a Meet Cute icon with better contrast"""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw circle background (solid purple, no gradient for small sizes)
    draw.ellipse([0, 0, size-1, size-1], fill=PURPLE_DARK)
    
    # Draw "M" letter with high contrast
    padding = int(size * padding_ratio)
    letter_size = size - (padding * 2)
    
    # Calculate "M" shape
    # For better visibility, make the M thicker
    stroke_width = max(int(size * 0.12), 2)  # Thicker strokes
    
    # M shape coordinates (more prominent)
    x1 = padding
    x2 = padding + letter_size // 4
    x3 = padding + letter_size // 2
    x4 = padding + 3 * letter_size // 4
    x5 = padding + letter_size
    
    y1 = padding
    y2 = padding + letter_size
    y_mid = padding + letter_size // 2
    
    # Draw M with thick white strokes for maximum visibility
    # Left vertical
    draw.line([(x1, y1), (x1, y2)], fill=WHITE, width=stroke_width)
    # Left diagonal
    draw.line([(x1, y1), (x3, y_mid)], fill=WHITE, width=stroke_width)
    # Right diagonal
    draw.line([(x3, y_mid), (x5, y1)], fill=WHITE, width=stroke_width)
    # Right vertical
    draw.line([(x5, y1), (x5, y2)], fill=WHITE, width=stroke_width)
    
    return img

def create_favicon_ico():
    """Create multi-resolution .ico file for maximum browser compatibility"""
    sizes = [16, 32, 48, 64]
    images = []
    
    for size in sizes:
        # For very small sizes, use even more padding and thicker strokes
        if size <= 32:
            img = create_icon(size, padding_ratio=0.10)  # Less padding = bigger M
        else:
            img = create_icon(size, padding_ratio=0.15)
        images.append(img)
    
    # Save as .ico with multiple sizes
    output_path = 'src/frontend/public/favicon.ico'
    images[0].save(output_path, format='ICO', sizes=[(img.width, img.height) for img in images])
    print(f"✅ Created {output_path} with sizes: {sizes}")

def create_png_icons():
    """Create PNG icons for all required sizes"""
    # Standard sizes needed for PWA and different platforms
    sizes = {
        'favicon-16x16.png': 16,
        'favicon.png': 32,  # Default favicon
        'icons/icon-32x32.png': 32,
        'icons/icon-72x72.png': 72,
        'icons/icon-96x96.png': 96,
        'icons/icon-128x128.png': 128,
        'icons/icon-144x144.png': 144,
        'icons/icon-152x152.png': 152,
        'icons/icon-180x180.png': 180,
        'icons/icon-192x192.png': 192,
        'icons/icon-384x384.png': 384,
        'icons/icon-512x512.png': 512,
        'icons/apple-touch-icon.png': 180,  # iOS home screen
        'icons/meetcute-logo.png': 512,  # High-res logo
        'og-image.png': 630,  # Social media preview (square)
    }
    
    for filename, size in sizes.items():
        # Use tighter padding for small sizes
        if size <= 32:
            padding_ratio = 0.10
        elif size <= 180:
            padding_ratio = 0.15
        else:
            padding_ratio = 0.18
        
        img = create_icon(size, padding_ratio=padding_ratio)
        output_path = f'src/frontend/public/{filename}'
        
        # Create directory if needed
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save PNG with optimization
        img.save(output_path, 'PNG', optimize=True)
        print(f"✅ Created {output_path} ({size}x{size})")

if __name__ == '__main__':
    print("🎨 Generating optimized Meet Cute icons...")
    print()
    
    # Create .ico favicon (best for browsers)
    create_favicon_ico()
    print()
    
    # Create all PNG sizes
    create_png_icons()
    print()
    print("✨ All icons generated successfully!")
    print("📱 Icons optimized for:")
    print("   - Browser tabs (high contrast, visible at 16x16)")
    print("   - iOS home screen (180x180 apple-touch-icon)")
    print("   - Android home screen (192x192, 512x512)")
    print("   - PWA splash screens (all sizes)")
    print("   - Social media previews (630x630)")

