import * as Comlink from "comlink";

type OutputFormat = "png" | "jpeg" | "webp" | "avif";

export class SvgConverter {
  private worker: Worker;
  private workerApi: any = null;
  private initialized = false;

  constructor() {
    this.worker = new Worker(
      new URL("../workers/svg-converter.worker.ts", import.meta.url),
      { type: "module" },
    );
  }

  private async ensureInitialized() {
    if (this.initialized) return;

    const WorkerClass = Comlink.wrap<any>(this.worker);
    this.workerApi = await new (WorkerClass as any)();
    this.initialized = true;
  }

  async convert(
    svgData: File | Uint8Array | string,
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
    await this.ensureInitialized();

    // Convert File to Uint8Array if needed
    let data: Uint8Array | string;
    if (svgData instanceof File) {
      const arrayBuffer = await svgData.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
    } else {
      data = svgData;
    }

    return this.workerApi.convert(
      data,
      targetFormat,
      options,
      onProgress ? Comlink.proxy(onProgress) : undefined,
    );
  }

  async getSvgInfo(svgData: File | Uint8Array | string): Promise<{
    width: number;
    height: number;
    viewBox?: string;
  }> {
    await this.ensureInitialized();

    // Convert File to Uint8Array if needed
    let data: Uint8Array | string;
    if (svgData instanceof File) {
      const arrayBuffer = await svgData.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
    } else {
      data = svgData;
    }

    return this.workerApi.getSvgInfo(data);
  }

  async terminate() {
    if (this.workerApi) {
      this.workerApi[Comlink.releaseProxy]();
    }
    this.worker.terminate();
  }
}
