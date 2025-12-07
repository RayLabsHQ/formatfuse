#!/bin/bash
# Generate minimal test video files for testing

set -e

cd "$(dirname "$0")"

echo "Generating test video files..."

# Check if ffmpeg is available
if ! command -v ffmpeg &> /dev/null; then
    echo "Error: ffmpeg is required to generate test videos"
    echo "Install with: sudo apt-get install ffmpeg (Linux) or brew install ffmpeg (macOS)"
    exit 1
fi

# Generate a small MP4 file (3 seconds, 320x240, H.264)
echo "Generating test.mp4..."
ffmpeg -f lavfi -i color=c=blue:s=320x240:d=3 -c:v libx264 -pix_fmt yuv420p -y test.mp4

# Generate a small WebM file (3 seconds, 320x240, VP8)
echo "Generating test.webm..."
ffmpeg -f lavfi -i color=c=red:s=320x240:d=3 -c:v libvpx -y test.webm

# Generate a small MOV file (3 seconds, 320x240, H.264)
echo "Generating test.mov..."
ffmpeg -f lavfi -i color=c=green:s=320x240:d=3 -c:v libx264 -pix_fmt yuv420p -y test.mov

echo "✓ Test video files generated successfully!"
echo ""
echo "Generated files:"
ls -lh test.mp4 test.webm test.mov
