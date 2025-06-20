# Additional Image Format Test Files

## Downloaded from placehold.co
- icon-32.png - For ICO conversion testing (32x32)
- icon-256.png - For ICO conversion testing (256x256 max)
- test-tiff-source.png - Source for TIFF conversion
- test-bmp-source.png - Source for BMP conversion
- wide.png - Wide aspect ratio (400x200)
- tall.png - Tall aspect ratio (200x400)
- tiny.png - Minimum size test (10x10)
- pixel.png - Single pixel test (1x1)

## Created Programmatically
- test.pnm - Portable Pixmap format (2x2 pixels)
- test.tga - Targa format (2x2 pixels)

## Formats Requiring Special Tools
These formats need specialized tools to create proper test files:
- **QOI** (.qoi) - Quite OK Image format
- **Farbfeld** (.ff) - Simple uncompressed format
- **HDR** (.hdr) - Radiance HDR format
- **EXR** (.exr) - OpenEXR format
- **DDS** (.dds) - DirectDraw Surface (decode only)

## Format Support Notes
- **ICO**: Max 256x256, automatically resized when encoding
- **SVG**: Decode only, rasterized via resvg
- **JPEG/QOI/Farbfeld/PNM/TGA**: No alpha channel (converted to RGB8)
- **HDR/EXR**: High dynamic range, special color handling
- **AVIF**: Lossy encoding only (with avif-native feature)
- **WebP**: Lossless encoding only
