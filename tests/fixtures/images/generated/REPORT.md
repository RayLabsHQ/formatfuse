# Generated Format Test Files

Generated on: 2025-06-20T03:31:57.919Z
Source: test.png (200x200)

## Results

| Format   | Extension | MIME Type               | Size   | Status              |
| -------- | --------- | ----------------------- | ------ | ------------------- |
| JPEG     | .jpg      | image/jpeg              | 3718   | success             |
| PNG      | .png      | image/png               | 3744   | success             |
| WebP     | .webp     | image/webp              | 1966   | success             |
| GIF      | .gif      | image/gif               | 2199   | success             |
| BMP      | .bmp      | image/bmp               | 160122 | success             |
| TIFF     | .tiff     | image/tiff              | 160202 | success             |
| ICO      | .ico      | image/x-icon            | 7805   | success             |
| AVIF     | .avif     | image/avif              | 1254   | success-no-metadata |
| TGA      | .tga      | image/x-targa           | 5812   | success             |
| PNM      | .pnm      | image/x-portable-anymap | 120063 | success             |
| QOI      | .qoi      | image/x-qoi             | 3529   | success             |
| Farbfeld | .ff       | image/farbfeld          | 3744   | success-no-metadata |
| HDR      | .hdr      | image/vnd.radiance      | 7144   | success             |
| EXR      | .exr      | image/x-exr             | 182833 | success             |

## File Locations

All generated files are in: `tests/fixtures/images/generated/`

## Notes

- Files marked "success-no-metadata" were generated but metadata couldn't be read back
- Some formats may have specific limitations (e.g., ICO max 256x256, JPEG no alpha)
- HDR and EXR formats store high dynamic range data
- AVIF encoding is lossy only
- WebP encoding is lossless only

## Next Steps

Please manually verify these files:

1. Open them in image viewers
2. Check if they display correctly
3. Verify format-specific features work as expected
