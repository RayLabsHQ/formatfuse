import { useCallback, useEffect, useRef, useState } from "react";
import * as Comlink from "comlink";

import type { ExtractRequest, ExtractResult, FetchEntryResult } from "../lib/archive/types";

type ArchiveExtractorRemote = {
  extract(request: ExtractRequest): Promise<ExtractResult>;
  warmup(): Promise<void>;
  fetchEntry(sessionId: string, path: string): Promise<FetchEntryResult>;
  release(sessionId: string): Promise<void>;
};

export function useArchiveExtractor() {
  const workerRef = useRef<Worker | null>(null);
  const remoteRef = useRef<Comlink.Remote<ArchiveExtractorRemote> | null>(null);
  const ensurePromiseRef = useRef<Promise<Comlink.Remote<ArchiveExtractorRemote>> | null>(null);
  const warmupPromiseRef = useRef<Promise<void> | null>(null);
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
        return remote;
      })();
    }

    return ensurePromiseRef.current;
  }, []);

  useEffect(() => {
    return () => {
      setIsReady(false);
      ensurePromiseRef.current = null;
      warmupPromiseRef.current = null;
      if (remoteRef.current) {
        remoteRef.current[Comlink.releaseProxy]();
        remoteRef.current = null;
      }
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const warmup = useCallback(async () => {
    const remote = await ensureRemote();
    if (!warmupPromiseRef.current) {
      warmupPromiseRef.current = remote.warmup().then(() => {
        setIsReady(true);
      }).catch(() => {
        setIsReady(false);
      });
    }
    return warmupPromiseRef.current;
  }, [ensureRemote]);

  const preload = useCallback(async () => {
    await warmup();
  }, [warmup]);

  const extract = useCallback(
    async (request: ExtractRequest) => {
      const remote = await ensureRemote();
      await warmup();
      const transferables: Transferable[] = request.buffer ? [request.buffer] : [];
      const transferableRequest = Comlink.transfer(request, transferables);
      return remote.extract(transferableRequest);
    },
    [ensureRemote, warmup],
  );

  const fetchEntry = useCallback(
    async (sessionId: string, path: string) => {
      const remote = await ensureRemote();
      return remote.fetchEntry(sessionId, path);
    },
    [ensureRemote],
  );

  const release = useCallback(
    async (sessionId: string) => {
      const remote = await ensureRemote();
      return remote.release(sessionId);
    },
    [ensureRemote],
  );

  return { extract, preload, isReady, fetchEntry, release };
}

export type UseArchiveExtractorReturn = ReturnType<typeof useArchiveExtractor>;
