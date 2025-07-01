// Preloading utilities for WASM converters
// These functions trigger WASM initialization in the background

import { getImageConverterComlink } from "./image-converter-comlink";
import { getHeicImageConverter } from "./heic-image-converter";
import { SvgConverter } from "./svg-converter";

let imageConverterPreloaded = false;
let heicConverterPreloaded = false;
let svgConverterPreloaded = false;
let svgConverterInstance: SvgConverter | null = null;

/**
 * Preload the main image converter WASM module
 * This initializes the worker and loads the WASM in the background
 */
export async function preloadImageConverter(): Promise<void> {
  if (imageConverterPreloaded) return;

  try {
    const converter = getImageConverterComlink();
    // Trigger WASM initialization by calling getMetadata with a tiny test image
    const testPixel = new Uint8Array([
      0x89,
      0x50,
      0x4e,
      0x47,
      0x0d,
      0x0a,
      0x1a,
      0x0a, // PNG signature
      0x00,
      0x00,
      0x00,
      0x0d,
      0x49,
      0x48,
      0x44,
      0x52, // IHDR chunk
      0x00,
      0x00,
      0x00,
      0x01,
      0x00,
      0x00,
      0x00,
      0x01,
      0x08,
      0x06,
      0x00,
      0x00,
      0x00,
      0x1f,
      0x15,
      0xc4,
      0x89,
      0x00,
      0x00,
      0x00,
      0x0a,
      0x49,
      0x44,
      0x41,
      0x54,
      0x78,
      0x9c,
      0x62,
      0x00,
      0x00,
      0x00,
      0x02,
      0x00,
      0x01,
      0xe5,
      0x27,
      0xde,
      0xfc,
      0x00,
      0x00,
      0x00,
      0x00,
      0x49,
      0x45,
      0x4e,
      0x44,
      0xae,
      0x42,
      0x60,
      0x82,
    ]);

    await converter.getMetadata(
      new File([testPixel], "preload.png", { type: "image/png" }),
    );
    imageConverterPreloaded = true;
  } catch (error) {
    console.warn("Failed to preload image converter:", error);
  }
}

/**
 * Preload the HEIC converter WASM module
 * This initializes the worker and loads libheif in the background
 */
export async function preloadHeicConverter(): Promise<void> {
  if (heicConverterPreloaded) return;

  try {
    const converter = getHeicImageConverter();
    // The constructor itself triggers initialization
    // Just accessing it is enough to start loading
    heicConverterPreloaded = true;
  } catch (error) {
    console.warn("Failed to preload HEIC converter:", error);
  }
}

/**
 * Preload the SVG converter WASM module (resvg-wasm)
 * This initializes the worker and loads the WASM in the background
 */
export async function preloadSvgConverter(): Promise<void> {
  if (svgConverterPreloaded) return;

  try {
    if (!svgConverterInstance) {
      svgConverterInstance = new SvgConverter();
    }

    // Get SVG info for a minimal SVG to trigger WASM loading
    const testSvg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
    await svgConverterInstance.getSvgInfo(testSvg);
    svgConverterPreloaded = true;
  } catch (error) {
    console.warn("Failed to preload SVG converter:", error);
  }
}

/**
 * Preload converters based on the format pair
 * @param sourceFormat - The source format (e.g., 'heic', 'png')
 * @param targetFormat - The target format (e.g., 'jpg', 'webp')
 */
export async function preloadConvertersForFormats(
  sourceFormat?: string,
  targetFormat?: string,
): Promise<void> {
  const formats = [sourceFormat?.toLowerCase(), targetFormat?.toLowerCase()];

  // Preload SVG converter if SVG is involved
  if (formats.includes("svg")) {
    preloadSvgConverter();
    return; // SVG uses its own converter
  }

  // Always preload the main image converter for common formats
  preloadImageConverter();

  // Preload HEIC converter if HEIC is involved
  if (formats.includes("heic")) {
    preloadHeicConverter();
  }
}
