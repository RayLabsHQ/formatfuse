import * as Comlink from "comlink";
import createQpdfModule from "@neslinesli93/qpdf-wasm";
import qpdfWasmUrl from "@neslinesli93/qpdf-wasm/dist/qpdf.wasm?url";

export interface ProtectOptions {
  userPassword: string;
  ownerPassword?: string;
}

let qpdfPromise: Promise<any> | null = null;

const INPUT_PATH = "/input.pdf";
const OUTPUT_PATH = "/output.pdf";

async function getQpdf() {
  if (!qpdfPromise) {
    qpdfPromise = createQpdfModule({
      locateFile: (path: string) => (path.endsWith(".wasm") ? qpdfWasmUrl : path),
    });
  }
  return qpdfPromise;
}

function cleanupFS(qpdf: any) {
  try {
    if (qpdf?.FS?.analyzePath(INPUT_PATH).exists) {
      qpdf.FS.unlink(INPUT_PATH);
    }
  } catch {
    /* noop */
  }
  try {
    if (qpdf?.FS?.analyzePath(OUTPUT_PATH).exists) {
      qpdf.FS.unlink(OUTPUT_PATH);
    }
  } catch {
    /* noop */
  }
}

class PdfProtectWorker {
  async protect(
    pdfData: Uint8Array,
    options: ProtectOptions,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    if (!options.userPassword?.trim()) {
      throw new Error("Password is required to protect the PDF.");
    }

    const userPassword = options.userPassword;
    const ownerPassword = options.ownerPassword || options.userPassword;

    const qpdf = await getQpdf();

    try {
      qpdf.FS.writeFile(INPUT_PATH, pdfData);
      onProgress?.(25);

      const args = [
        INPUT_PATH,
        "--encrypt",
        userPassword,
        ownerPassword,
        "256",
        "--",
        OUTPUT_PATH,
      ];

      qpdf.callMain(args);
      onProgress?.(75);

      const outputFile = qpdf.FS.readFile(OUTPUT_PATH);
      onProgress?.(100);

      return Comlink.transfer(new Uint8Array(outputFile), [outputFile.buffer]);
    } catch (error: any) {
      const message =
        typeof error?.message === "string"
          ? error.message
          : "Failed to protect PDF.";
      throw new Error(message);
    } finally {
      cleanupFS(qpdf);
    }
  }

  async unlock(
    pdfData: Uint8Array,
    password: string,
    onProgress?: (progress: number) => void,
  ): Promise<Uint8Array> {
    onProgress?.(0);

    const qpdf = await getQpdf();

    try {
      qpdf.FS.writeFile(INPUT_PATH, pdfData);
      onProgress?.(25);

      const args = [
        "--password=" + (password || ""),
        "--decrypt",
        INPUT_PATH,
        OUTPUT_PATH,
      ];

      qpdf.callMain(args);
      onProgress?.(75);

      const outputFile = qpdf.FS.readFile(OUTPUT_PATH);
      onProgress?.(100);

      return Comlink.transfer(new Uint8Array(outputFile), [outputFile.buffer]);
    } catch (error: any) {
      const message =
        typeof error?.message === "string" &&
        (error.message.includes("password") ||
          error.message.includes("Invalid"))
          ? "Incorrect password or unable to decrypt this PDF."
          : "Failed to unlock PDF.";
      throw new Error(message);
    } finally {
      cleanupFS(qpdf);
    }
  }
}

Comlink.expose(new PdfProtectWorker());
