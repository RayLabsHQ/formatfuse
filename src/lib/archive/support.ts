type SupportResult = { supported: boolean; reason?: string };

let cachedResult: SupportResult | null = null;

export function isArchiveSupported(): SupportResult {
  if (cachedResult !== null) {
    return cachedResult;
  }

  if (typeof window === "undefined") {
    cachedResult = { supported: true };
    return cachedResult;
  }

  if (typeof Worker === "undefined") {
    cachedResult = { supported: false, reason: "Your browser does not support Web Workers." };
    return cachedResult;
  }

  if (typeof WebAssembly === "undefined") {
    cachedResult = { supported: false, reason: "Your browser does not support WebAssembly." };
    return cachedResult;
  }

  // Legacy Edge/IE typically lack module worker support
  const supportsModuleWorkers = (() => {
    try {
      const worker = new Worker(
        URL.createObjectURL(new Blob([""], { type: "text/javascript" })),
        { type: "module" as WorkerOptions["type"] },
      );
      worker.terminate();
      return true;
    } catch (err) {
      return false;
    }
  })();

  if (!supportsModuleWorkers) {
    cachedResult = {
      supported: false,
      reason: "This browser does not support module workers required for archive tools.",
    };
    return cachedResult;
  }

  cachedResult = { supported: true };
  return cachedResult;
}
