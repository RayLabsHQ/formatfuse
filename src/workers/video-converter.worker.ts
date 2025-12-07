import * as Comlink from "comlink";
import {
  Input,
  Output,
  Conversion,
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  WebMOutputFormat,
  MkvOutputFormat,
  MovOutputFormat,
  QUALITY_LOW,
  QUALITY_MEDIUM,
  QUALITY_HIGH,
  QUALITY_VERY_HIGH,
  type VideoCodec,
} from "mediabunny";

export interface VideoConversionOptions {
  codec?: VideoCodec;
  bitrate?: number;
  width?: number;
  height?: number;
  rotation?: number;
  startTime?: number;
  endTime?: number;
  quality?: "low" | "medium" | "high" | "ultra";
}

class VideoConverterWorker {
  private getOutputFormat(format: string) {
    switch (format.toLowerCase()) {
      case "mp4":
      case "video/mp4":
        return new Mp4OutputFormat();
      case "mov":
      case "video/quicktime":
        return new MovOutputFormat();
      case "webm":
      case "video/webm":
        return new WebMOutputFormat();
      case "mkv":
      case "video/x-matroska":
        return new MkvOutputFormat();
      default:
        return new Mp4OutputFormat();
    }
  }

  private getBitrateFromQuality(quality: string): number {
    const bitrateMap = {
      low: QUALITY_LOW,
      medium: QUALITY_MEDIUM,
      high: QUALITY_HIGH,
      ultra: QUALITY_VERY_HIGH,
    };
    return bitrateMap[quality as keyof typeof bitrateMap] || QUALITY_MEDIUM;
  }

  async convert(
    file: Uint8Array,
    targetFormat: string,
    options: VideoConversionOptions = {},
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    try {
      const progressCallback = onProgress || (() => {});
      progressCallback(5);

      // Create a Blob from the Uint8Array
      const blob = new Blob([file]);

      // Create input
      const input = new Input({
        source: new BlobSource(blob),
        formats: ALL_FORMATS,
      });

      progressCallback(10);

      // Create output
      const output = new Output({
        format: this.getOutputFormat(targetFormat),
        target: new BufferTarget(),
      });

      progressCallback(15);

      // Get video track info for resizing if needed
      const videoTrack = await input.getPrimaryVideoTrack();
      if (!videoTrack) {
        throw new Error("File has no video track");
      }

      // Set up conversion options
      const conversionOptions: any = {};

      if (options.width !== undefined || options.height !== undefined) {
        conversionOptions.resize = {
          width: options.width || videoTrack?.displayWidth,
          height: options.height || videoTrack?.displayHeight,
        };
      }

      if (options.rotation !== undefined) {
        conversionOptions.rotate = options.rotation;
      }

      if (options.startTime !== undefined || options.endTime !== undefined) {
        if (
          options.endTime !== undefined &&
          options.startTime !== undefined &&
          options.endTime <= options.startTime
        ) {
          throw new Error("End time must be greater than start time");
        }
        conversionOptions.trim = {
          start: options.startTime || 0,
          end: options.endTime,
        };
      }

      if (options.bitrate) {
        conversionOptions.videoBitrate = options.bitrate;
      } else if (options.quality) {
        conversionOptions.videoBitrate = this.getBitrateFromQuality(
          options.quality,
        );
      }

      if (options.codec) {
        conversionOptions.videoCodec = options.codec;
      }

      progressCallback(20);

      // Initialize conversion
      const conversion = await Conversion.init({
        input,
        output,
        ...conversionOptions,
      });

      progressCallback(25);

      // Execute conversion with progress updates
      let lastProgress = 25;
      await conversion.execute({
        onProgress: (progress: number) => {
          // Map conversion progress (0-1) to our progress range (25-95)
          const mappedProgress = 25 + progress * 70;
          if (mappedProgress > lastProgress) {
            lastProgress = mappedProgress;
            progressCallback(Math.min(95, Math.round(mappedProgress)));
          }
        },
      });

      progressCallback(95);

      // Get the result buffer
      const buffer = output.target.buffer;
      const result = new Uint8Array(buffer);

      progressCallback(100);

      // Transfer the result without copying
      return Comlink.transfer(result, [result.buffer]);
    } catch (error) {
      console.error("Video conversion error:", error);
      throw new Error(
        `Video conversion failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getMetadata(
    file: Uint8Array,
    onProgress?: (progress: number) => void,
  ): Promise<{
    duration: number;
    width: number;
    height: number;
    rotation: number;
    hasAudio: boolean;
    hasVideo: boolean;
  }> {
    try {
      const progressCallback = onProgress || (() => {});
      progressCallback(10);

      const blob = new Blob([file]);
      const input = new Input({
        source: new BlobSource(blob),
        formats: ALL_FORMATS,
      });

      progressCallback(30);

      const duration = await input.computeDuration();
      const videoTrack = await input.getPrimaryVideoTrack();
      const audioTrack = await input.getPrimaryAudioTrack();

      progressCallback(100);

      return {
        duration,
        width: videoTrack?.displayWidth || 0,
        height: videoTrack?.displayHeight || 0,
        rotation: videoTrack?.rotation || 0,
        hasAudio: audioTrack !== null,
        hasVideo: videoTrack !== null,
      };
    } catch (error) {
      console.error("Metadata extraction error:", error);
      throw new Error(
        `Failed to extract video metadata: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async compress(
    file: Uint8Array,
    quality: "low" | "medium" | "high" | "ultra",
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    // Compression is just conversion with lower bitrate
    return this.convert(
      file,
      "mp4",
      { quality },
      onProgress,
    );
  }

  async trim(
    file: Uint8Array,
    startTime: number,
    endTime: number,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    return this.convert(
      file,
      "mp4",
      { startTime, endTime },
      onProgress,
    );
  }

  async resize(
    file: Uint8Array,
    width: number,
    height: number,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    return this.convert(
      file,
      "mp4",
      { width, height },
      onProgress,
    );
  }

  async rotate(
    file: Uint8Array,
    rotation: number,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    return this.convert(
      file,
      "mp4",
      { rotation },
      onProgress,
    );
  }
}

Comlink.expose(new VideoConverterWorker());
