# Video Converter Tests

This document describes the test suite for the video converter functionality.

## Test Files

### 1. `video-converter.test.ts`
Comprehensive integration tests for the video converter worker.

**Test Categories:**

- **Basic Format Conversions**
  - MP4 to WebM conversion
  - WebM to MP4 conversion
  - MOV to MP4 conversion
  - Validates output file format signatures

- **Metadata Extraction**
  - Extract duration, width, height from MP4
  - Extract metadata from WebM
  - Validates video properties

- **Quality Settings**
  - Low quality compression
  - High quality compression
  - Custom bitrate settings
  - Verifies quality presets work correctly

- **Video Operations**
  - Video resizing (dimensions)
  - Video rotation (90°, 180°, 270°)
  - Video trimming (time-based)
  - Combined operations (resize + trim + quality)

- **Progress Tracking**
  - Monitors progress callbacks during conversion
  - Validates progress increases monotonically
  - Ensures progress reaches 100%

- **Error Handling**
  - Invalid video data
  - Empty data
  - Corrupted video data

- **Edge Cases**
  - Same-format conversion (MP4 to MP4)
  - Multiple operations combined
  - Boundary conditions

### 2. `useVideoConverter.test.ts`
Unit tests for the React hook.

**Test Categories:**

- **Initialization**
  - Default state values
  - Worker creation
  - Cleanup on unmount

- **API Methods**
  - All conversion methods exposed
  - Correct method signatures

- **State Management**
  - Progress state updates
  - Loading state updates
  - Error state updates

- **Error Handling**
  - Graceful worker initialization failures
  - Error propagation

- **File Handling**
  - File object support
  - Blob object support

- **Conversion Options**
  - Quality settings
  - Resize dimensions
  - Trim times
  - Rotation angles

## Test Fixtures

### Video Files

Test videos are generated using FFmpeg and stored in `tests/fixtures/videos/`:

- `test.mp4` - 3-second, 320x240, H.264 encoded
- `test.webm` - 3-second, 320x240, VP8 encoded
- `test.mov` - 3-second, 320x240, H.264 in MOV container

**Generating Test Videos:**

```bash
cd tests/fixtures/videos
./generate-test-videos.sh
```

Requirements: FFmpeg must be installed.

**Note:** Video files are gitignored to keep repository size small. Generate them locally before running tests.

## Running Tests

### Run all video converter tests:
```bash
pnpm test video-converter
```

### Run with test fixtures:
```bash
# Generate video fixtures first
cd tests/fixtures/videos && ./generate-test-videos.sh && cd ../../..

# Run tests
pnpm test video-converter
```

### Run hook tests only:
```bash
pnpm test useVideoConverter
```

### Run with coverage:
```bash
pnpm test:coverage video-converter
```

## Test Strategies

### 1. File Format Validation

Tests validate output files by checking:
- **Magic bytes/signatures**: WebM EBML header, MP4 ftyp atom
- **File structure**: Proper container format
- **Metadata**: Correct dimensions, duration

### 2. Conditional Test Execution

Tests use `.skipIf(!hasTestVideos())` to:
- Skip tests when fixtures don't exist
- Provide helpful warnings about generating fixtures
- Allow CI/CD to run without large video files

### 3. Timeout Management

Video processing tests use longer timeouts (30s) because:
- Video encoding is CPU-intensive
- Different machines have varying performance
- Ensures tests don't fail on slower CI runners

### 4. Progress Tracking

Progress tests verify:
- Multiple callbacks received
- Values are monotonically increasing
- Final value reaches 100%

## Common Issues

### FFmpeg Not Found

**Error:** `ffmpeg: command not found`

**Solution:**
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

### Test Timeouts

**Error:** Tests timeout after 5000ms

**Solution:** Tests have 30s timeouts for video processing. If still timing out:
- Check system resources
- Verify video fixtures are small (3 seconds)
- Test on a faster machine or increase timeout

### Worker Initialization Failures

**Error:** `Failed to initialize video converter worker`

**Solution:**
- Check that mediabunny is installed: `pnpm install`
- Verify worker file exists: `src/workers/video-converter.worker.ts`
- Check browser compatibility (WebCodecs API required)

## Browser Compatibility

Video converter uses WebCodecs API which requires:
- Chrome/Edge 94+
- Safari 16.4+
- Firefox: Not yet supported (as of 2024)

Tests may fail in environments without WebCodecs support.

## Performance Benchmarks

Typical performance on modern hardware:

| Operation | Duration (3s video) |
|-----------|---------------------|
| MP4 → WebM | 2-5 seconds |
| Metadata extraction | < 1 second |
| Resize | 3-6 seconds |
| Compress | 2-4 seconds |
| Trim | 1-3 seconds |

## Future Enhancements

Potential test improvements:

1. **More Formats**: Add MKV test fixtures
2. **Audio Tests**: Verify audio track preservation
3. **Codec Tests**: Test different video codecs (H.265, AV1, VP9)
4. **Large Files**: Test with larger videos (60s+)
5. **Performance Tests**: Benchmark conversion speeds
6. **Visual Regression**: Compare output frames visually
7. **Stress Tests**: Multiple concurrent conversions

## Troubleshooting

### Tests Pass Locally but Fail in CI

**Possible causes:**
- FFmpeg not installed in CI environment
- Different FFmpeg versions producing different output
- WebCodecs not available in CI browser

**Solutions:**
- Add FFmpeg to CI setup script
- Use docker container with FFmpeg pre-installed
- Skip integration tests in CI, run only unit tests

### Inconsistent Test Results

**Possible causes:**
- Video encoding is non-deterministic
- Different codecs on different platforms
- Timing-dependent operations

**Solutions:**
- Use tolerance ranges instead of exact values
- Test for presence/format rather than exact output
- Add retry logic for flaky tests
