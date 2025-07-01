import * as Comlink from "comlink";
import type { InitInput } from "@resvg/resvg-wasm";

type OutputFormat = "png" | "jpeg" | "webp" | "avif";

class SvgConverterWorker {
  private resvgModule: any = null;
  private imageWorker: Worker | null = null;
  private wasmInitialized = false;

  private async ensureWasmInitialized() {
    if (this.wasmInitialized) return;

    try {
      // Dynamically import resvg-wasm
      const resvg = await import("@resvg/resvg-wasm");

      // Initialize WASM with the correct path
      const wasmPath = new URL(
        "@resvg/resvg-wasm/index_bg.wasm",
        import.meta.url,
      );
      await resvg.initWasm(fetch(wasmPath) as any);

      this.resvgModule = resvg;
      this.wasmInitialized = true;
    } catch (error) {
      console.error("Failed to initialize resvg WASM:", error);
      throw new Error("Failed to initialize SVG converter");
    }
  }

  private async getImageWorker() {
    if (!this.imageWorker) {
      // Use the existing image converter worker for format conversion
      this.imageWorker = new Worker(
        new URL("./image-converter-comlink.worker.ts", import.meta.url),
        { type: "module" },
      );
    }
    return this.imageWorker;
  }

  async convert(
    svgData: Uint8Array | string,
    targetFormat: OutputFormat = "png",
    options: {
      width?: number;
      height?: number;
      background?: string;
      scale?: number;
      quality?: number;
    } = {},
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    await this.ensureWasmInitialized();

    onProgress?.(10);

    try {
      // Convert string to Uint8Array if needed
      const svgBuffer =
        typeof svgData === "string"
          ? new TextEncoder().encode(svgData)
          : svgData;

      onProgress?.(20);

      // Configure resvg options
      const resvgOpts: any = {
        background: options.background,
        fitTo: options.width
          ? {
              mode: "width",
              value: options.width,
            }
          : options.height
            ? {
                mode: "height",
                value: options.height,
              }
            : undefined,
        font: {
          loadSystemFonts: false, // Faster without system fonts
        },
      };

      onProgress?.(40);

      // Create Resvg instance and render to PNG first
      const resvg = new this.resvgModule.Resvg(svgBuffer, resvgOpts);
      const pngData = resvg.render();
      const pngBuffer = pngData.asPng();

      onProgress?.(60);

      // If target format is PNG, we're done
      if (targetFormat === "png") {
        const result = new Uint8Array(pngBuffer);
        onProgress?.(100);
        return Comlink.transfer(result, [result.buffer]);
      }

      // Otherwise, convert PNG to target format using image converter
      const imageWorker = await this.getImageWorker();
      const ImageConverterClass = Comlink.wrap<any>(imageWorker);
      const converter = await new (ImageConverterClass as any)();

      onProgress?.(70);

      // Convert PNG to target format
      const convertedBuffer = await converter.convert(
        new Uint8Array(pngBuffer),
        "png",
        targetFormat,
        Comlink.proxy((progress: number) => {
          // Map progress from 70-100%
          onProgress?.(70 + progress * 0.3);
        }),
        { quality: options.quality },
      );

      converter[Comlink.releaseProxy]();

      return convertedBuffer;
    } catch (error) {
      console.error("SVG conversion error:", error);
      throw new Error(
        `Failed to convert SVG: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async getSvgInfo(svgData: Uint8Array | string): Promise<{
    width: number;
    height: number;
    viewBox?: string;
  }> {
    await this.ensureWasmInitialized();

    try {
      const svgBuffer =
        typeof svgData === "string"
          ? new TextEncoder().encode(svgData)
          : svgData;

      const resvg = new this.resvgModule.Resvg(svgBuffer);

      return {
        width: resvg.width,
        height: resvg.height,
        viewBox: resvg.viewBox,
      };
    } catch (error) {
      console.error("Failed to get SVG info:", error);
      throw new Error(
        `Failed to analyze SVG: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}

Comlink.expose(SvgConverterWorker);
