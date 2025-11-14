#!/usr/bin/env python3
"""
Resize the existing Meet Cute logo to all required sizes
WITHOUT changing the design - just optimizing dimensions
"""

from PIL import Image
import os

def resize_logo_to_all_sizes():
    """Take the existing logo and resize it to all needed sizes"""
    
    # Use the existing high-res logo as source
    source_logo = 'src/frontend/public/icons/meetcute-logo.png'
    
    if not os.path.exists(source_logo):
        print(f"❌ Source logo not found: {source_logo}")
        return
    
    # Load the original logo
    original = Image.open(source_logo)
    print(f"📸 Loaded original logo: {original.size}")
    
    # Sizes needed for different platforms
    sizes = {
        'favicon-16x16.png': 16,
        'favicon.png': 32,
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
        'icons/apple-touch-icon.png': 180,
        'og-image.png': 630,
    }
    
    for filename, size in sizes.items():
        # Resize with high-quality resampling
        resized = original.resize((size, size), Image.Resampling.LANCZOS)
        
        output_path = f'src/frontend/public/{filename}'
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save with optimization
        resized.save(output_path, 'PNG', optimize=True)
        print(f"✅ Created {output_path} ({size}x{size})")
    
    # Create multi-resolution .ico for browsers
    ico_sizes = [16, 32, 48, 64]
    ico_images = [original.resize((s, s), Image.Resampling.LANCZOS) for s in ico_sizes]
    
    output_ico = 'src/frontend/public/favicon.ico'
    ico_images[0].save(output_ico, format='ICO', sizes=[(img.width, img.height) for img in ico_images])
    print(f"✅ Created {output_ico} with sizes: {ico_sizes}")
    
    print()
    print("✨ All sizes generated from your original logo!")
    print("🎨 Design unchanged - just optimized dimensions")

if __name__ == '__main__':
    print("🔄 Resizing your existing logo to all required sizes...")
    print()
    resize_logo_to_all_sizes()

