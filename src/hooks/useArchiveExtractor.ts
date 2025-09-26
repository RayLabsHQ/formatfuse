import { useCallback, useEffect, useRef, useState } from "react";
import * as Comlink from "comlink";

import type { ExtractRequest, ExtractResult } from "../lib/archive/types";

type ArchiveExtractorRemote = {
  extract(request: ExtractRequest): Promise<ExtractResult>;
};

export function useArchiveExtractor() {
  const workerRef = useRef<Worker | null>(null);
  const remoteRef = useRef<Comlink.Remote<ArchiveExtractorRemote> | null>(null);
  const ensurePromiseRef = useRef<Promise<Comlink.Remote<ArchiveExtractorRemote>> | null>(null);
  const [isReady, setIsReady] = useState(false);

  const ensureRemote = useCallback(async () => {
    if (remoteRef.current) {
      return remoteRef.current;
    }

    if (!ensurePromiseRef.current) {
      ensurePromiseRef.current = (async () => {
        const worker = new Worker(
          new URL("../workers/archive-extractor.worker.ts", import.meta.url),
          { type: "module" },
        );

        const remote = Comlink.wrap<ArchiveExtractorRemote>(worker);
        workerRef.current = worker;
        remoteRef.current = remote;
        setIsReady(true);
        return remote;
      })();
    }

    return ensurePromiseRef.current;
  }, []);

  useEffect(() => {
    return () => {
      setIsReady(false);
      ensurePromiseRef.current = null;
      if (remoteRef.current) {
        remoteRef.current[Comlink.releaseProxy]();
        remoteRef.current = null;
      }
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const preload = useCallback(async () => {
    await ensureRemote();
  }, [ensureRemote]);

  const extract = useCallback(
    async (request: ExtractRequest) => {
      const remote = await ensureRemote();
      const transferableRequest = Comlink.transfer(request, [request.buffer]);
      return remote.extract(transferableRequest);
    },
    [ensureRemote],
  );

  return { extract, preload, isReady };
}

export type UseArchiveExtractorReturn = ReturnType<typeof useArchiveExtractor>;
