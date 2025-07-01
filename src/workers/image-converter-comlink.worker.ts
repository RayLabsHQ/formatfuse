import * as Comlink from "comlink";
import init, { convertImage, loadMetadata, getPixels } from "@refilelabs/image";
import { encode as encodeJpeg, decode as decodeJpeg } from "@jsquash/jpeg";
import { encode as encodeWebp, decode as decodeWebp } from "@jsquash/webp";
import { decode as decodePng } from "@jsquash/png";

class ImageConverterWorker {
  private wasmInitialized = false;

  private async ensureWasmInitialized() {
    if (!this.wasmInitialized) {
      await init();
      this.wasmInitialized = true;
    }
  }

  async convert(
    file: Uint8Array,
    srcType: string,
    targetType: string,
    onProgress?: (progress: number) => void,
    quality?: number,
  ): Promise<Uint8Array> {
    await this.ensureWasmInitialized();

    const progressCallback = onProgress || (() => {});

    // Handle quality for JPEG and WebP using @jsquash libraries
    const supportsQuality = ["image/jpeg", "image/webp"].includes(targetType);
    const hasCustomQuality = quality !== undefined && quality !== 100;

    if (supportsQuality && hasCustomQuality) {
      // First decode the image
      let imageData: ImageData;

      if (srcType === "image/jpeg") {
        imageData = await decodeJpeg(file.buffer as ArrayBuffer);
      } else if (srcType === "image/webp") {
        imageData = await decodeWebp(file.buffer as ArrayBuffer);
      } else if (srcType === "image/png") {
        imageData = await decodePng(file.buffer as ArrayBuffer);
      } else {
        // For other formats, use @refilelabs/image to convert to PNG first
        const pngData = convertImage(
          file,
          srcType,
          "image/png",
          progressCallback,
        );
        imageData = await decodePng(pngData.buffer as ArrayBuffer);
      }

      progressCallback(50);

      // Then encode with quality
      let encoded: ArrayBuffer;
      const normalizedQuality = quality / 100; // Convert 0-100 to 0-1

      if (targetType === "image/jpeg") {
        encoded = await encodeJpeg(imageData, { quality: normalizedQuality });
      } else if (targetType === "image/webp") {
        encoded = await encodeWebp(imageData, { quality: normalizedQuality });
      } else {
        // This shouldn't happen due to the supportsQuality check
        throw new Error(`Unexpected target type: ${targetType}`);
      }

      progressCallback(100);

      // Convert ArrayBuffer back to Uint8Array and transfer without copying
      const encodedArray = new Uint8Array(encoded);
      return Comlink.transfer(encodedArray, [encodedArray.buffer]);
    } else {
      // Use @refilelabs/image for all other conversions
      const converted = convertImage(
        file,
        srcType,
        targetType,
        progressCallback,
      );

      // Transfer the result without copying
      return Comlink.transfer(converted, [converted.buffer]);
    }
  }

  async getMetadata(
    file: Uint8Array,
    srcType: string,
    onProgress?: (progress: number) => void,
  ): Promise<any> {
    await this.ensureWasmInitialized();

    const progressCallback = onProgress || (() => {});
    return loadMetadata(file, srcType, progressCallback);
  }

  async getPixels(file: Uint8Array, srcType: string): Promise<any> {
    await this.ensureWasmInitialized();
    return getPixels(file, srcType);
  }
}

Comlink.expose(ImageConverterWorker);
