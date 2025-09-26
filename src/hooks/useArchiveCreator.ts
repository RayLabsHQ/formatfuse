import { useCallback, useEffect, useRef, useState } from "react";
import * as Comlink from "comlink";

import type { CreateArchiveRequest, CreateArchiveResult } from "../lib/archive/types";

interface ArchiveCreatorRemote {
  create(request: CreateArchiveRequest): Promise<CreateArchiveResult>;
}

export function useArchiveCreator() {
  const workerRef = useRef<Worker | null>(null);
  const remoteRef = useRef<Comlink.Remote<ArchiveCreatorRemote> | null>(null);
  const ensurePromiseRef = useRef<Promise<Comlink.Remote<ArchiveCreatorRemote>> | null>(null);
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

  const create = useCallback(async (request: CreateArchiveRequest) => {
    const remote = await ensureRemote();
    return remote.create(request);
  }, [ensureRemote]);

  return { create, preload, isReady };
}

export type UseArchiveCreatorReturn = ReturnType<typeof useArchiveCreator>;

