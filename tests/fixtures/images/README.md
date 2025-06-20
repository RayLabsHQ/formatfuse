# Test Images

This directory contains test images downloaded from [placehold.co](https://placehold.co/) for testing image conversion functionality.

## Available Test Images

### Different Formats
- `test.png` - PNG format (200x200, red background)
- `test.jpg` - JPEG format (200x200, green background)  
- `test.webp` - WebP format (200x200, blue background)
- `test.gif` - GIF format (200x200, yellow background)
- `test.avif` - AVIF format (200x200, magenta background)

### Different Sizes
- `small.png` - 100x100 (orange background)
- `medium.png` - 500x300 (purple background)
- `large.png` - 1000x800 (teal background)

### Special Cases
- `transparent.png` - PNG with transparent background (200x200)
- `retina-2x.png` - 2x retina resolution (400x400)
- `retina-3x.png` - 3x retina resolution (600x600)

## Placehold.co API Reference

### Basic Usage
```
https://placehold.co/[SIZE]/[FORMAT]
https://placehold.co/[WIDTH]x[HEIGHT]/[BG_COLOR]/[TEXT_COLOR]/[FORMAT]?text=[TEXT]
```

### Examples
```bash
# Simple square
https://placehold.co/400

# Custom size with colors
https://placehold.co/600x400/000000/FFF

# With text
https://placehold.co/600x400?text=Hello+World

# Specific format
https://placehold.co/600x400/png
https://placehold.co/600x400.png

# Retina
https://placehold.co/600x400@2x.png
```

### Supported Formats
- SVG (default)
- PNG
- JPEG
- GIF
- WebP
- AVIF

### Color Options
- Hex: `000000` (without #)
- CSS names: `orange`, `white`, etc.
- Transparent: `transparent`

### Available Fonts
- Lato (default)
- Lora
- Montserrat
- Open Sans
- Oswald
- Playfair Display
- PT Sans
- Raleway
- Roboto
- Source Sans Pro

### Regenerating Test Images
To regenerate these test images, run:
```bash
node tests/fixtures/download-test-images.js
```