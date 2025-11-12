# Video Test Fixtures

This directory contains video files for testing the video converter.

## Files

- `test.mp4` - Small MP4 video (H.264)
- `test.webm` - Small WebM video (VP8/VP9)

## Generating Test Videos

To generate test videos, you can use FFmpeg:

```bash
# Generate a 3-second solid color video in MP4
ffmpeg -f lavfi -i color=c=blue:s=320x240:d=3 -c:v libx264 -pix_fmt yuv420p test.mp4

# Generate a 3-second solid color video in WebM
ffmpeg -f lavfi -i color=c=red:s=320x240:d=3 -c:v libvpx test.webm
```

## Note

These files are gitignored to keep the repository size small. Run the generation script
before running tests if these files don't exist.
