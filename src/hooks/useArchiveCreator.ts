import { useCallback, useEffect, useRef, useState } from "react";
import * as Comlink from "comlink";

import type { CreateArchiveRequest, CreateArchiveResult } from "../lib/archive/types";

interface ArchiveCreatorRemote {
  create(request: CreateArchiveRequest): Promise<CreateArchiveResult>;
  warmup(): Promise<void>;
}

export function useArchiveCreator() {
  const workerRef = useRef<Worker | null>(null);
  const remoteRef = useRef<Comlink.Remote<ArchiveCreatorRemote> | null>(null);
  const ensurePromiseRef = useRef<Promise<Comlink.Remote<ArchiveCreatorRemote>> | null>(null);
  const warmupPromiseRef = useRef<Promise<void> | null>(null);
  const [isReady, setIsReady] = useState(false);

  const ensureRemote = useCallback(async () => {
    if (remoteRef.current) {
      return remoteRef.current;
    }

    if (!ensurePromiseRef.current) {
      ensurePromiseRef.current = (async () => {
        const worker = new Worker(new URL("../workers/archive-creator.worker.ts", import.meta.url), {
          type: "module",
        });
        const remote = Comlink.wrap<ArchiveCreatorRemote>(worker);
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

  const create = useCallback(async (request: CreateArchiveRequest) => {
    const remote = await ensureRemote();
    await warmup();
    return remote.create(request);
  }, [ensureRemote, warmup]);

  return { create, preload, isReady };
}

export type UseArchiveCreatorReturn = ReturnType<typeof useArchiveCreator>;
