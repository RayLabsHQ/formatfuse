import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { expect } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a test fixture file
 */
export async function loadFixture(relativePath: string): Promise<ArrayBuffer> {
  const fullPath = resolve(__dirname, "fixtures", relativePath);
  const buffer = await readFile(fullPath);
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

/**
 * Create a File object from fixture for testing
 */
export async function createFileFromFixture(
  relativePath: string,
  fileName: string,
  mimeType: string,
): Promise<File> {
  const arrayBuffer = await loadFixture(relativePath);
  const blob = new Blob([arrayBuffer], { type: mimeType });
  return new File([blob], fileName, { type: mimeType });
}

/**
 * Validate conversion output
 */
export function validateOutput(
  result: ArrayBuffer | Blob,
  expectedMimeType?: string,
  minSize: number = 0,
): void {
  if (result instanceof ArrayBuffer) {
    expect(result.byteLength).toBeGreaterThan(minSize);
  } else if (result instanceof Blob) {
    expect(result.size).toBeGreaterThan(minSize);
    if (expectedMimeType) {
      expect(result.type).toBe(expectedMimeType);
    }
  }
}

/**
 * Create a mock worker environment for testing
 */
export function createWorkerMock() {
  const messages: any[] = [];

  return {
    postMessage: (message: any) => {
      messages.push(message);
    },
    messages,
    clearMessages: () => {
      messages.length = 0;
    },
  };
}

/**
 * Test a worker with timeout
 */
export async function testWorker(
  workerPath: string,
  input: any,
  timeout: number = 5000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { type: "module" });

    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error("Worker timeout"));
    }, timeout);

    worker.onmessage = (event) => {
      if (event.data.type === "complete") {
        clearTimeout(timer);
        worker.terminate();
        resolve(event.data);
      } else if (event.data.type === "error") {
        clearTimeout(timer);
        worker.terminate();
        reject(new Error(event.data.error));
      }
    };

    worker.onerror = (error) => {
      clearTimeout(timer);
      worker.terminate();
      reject(error);
    };

    worker.postMessage(input);
  });
}
