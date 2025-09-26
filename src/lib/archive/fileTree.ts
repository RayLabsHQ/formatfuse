import type { WorkerArchiveEntry } from "./types";

export interface ArchiveFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children: ArchiveFileNode[];
  size: number;
  compressedSize?: number;
  lastModified?: Date | null;
  fileData?: Uint8Array;
}

function normalizePath(path: string, isDirectory: boolean): string {
  if (!path) return path;
  if (isDirectory && path.endsWith("/")) {
    return path.slice(0, -1);
  }
  return path;
}

export function buildArchiveTree(entries: WorkerArchiveEntry[]): ArchiveFileNode[] {
  const root: ArchiveFileNode[] = [];
  const nodeMap = new Map<string, ArchiveFileNode>();

  const sorted = [...entries].sort((a, b) => a.path.localeCompare(b.path));

  for (const entry of sorted) {
    const isDirectory = Boolean(entry.isDirectory);
    const normalizedPath = normalizePath(entry.path, isDirectory);
    const segments = normalizedPath.split("/").filter(Boolean);

    const makeNode = (path: string, name: string, directory: boolean): ArchiveFileNode => {
      const node: ArchiveFileNode = {
        name,
        path,
        isDirectory: directory,
        children: [],
        size: 0,
        compressedSize: undefined,
        lastModified: null,
      };
      nodeMap.set(path, node);
      return node;
    };

    if (segments.length === 0) {
      const node = makeNode(entry.path, entry.path, isDirectory);
      node.size = entry.size;
      node.compressedSize = entry.compressedSize ?? undefined;
      node.lastModified = entry.lastModified ? new Date(entry.lastModified) : null;
      if (!isDirectory && entry.data) {
        node.fileData = new Uint8Array(entry.data);
      }
      root.push(node);
      continue;
    }

    let currentPath = "";
    let parentChildren = root;

    segments.forEach((segment, index) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      const isLast = index === segments.length - 1;
      const directory = isLast ? isDirectory : true;
      let node = nodeMap.get(currentPath);

      if (!node) {
        node = makeNode(currentPath, segment, directory);
        parentChildren.push(node);
      }

      if (isLast) {
        node.isDirectory = directory;
        node.size = entry.size;
        node.compressedSize = entry.compressedSize ?? node.compressedSize;
        node.lastModified = entry.lastModified ? new Date(entry.lastModified) : node.lastModified ?? null;
        if (!directory && entry.data) {
          node.fileData = new Uint8Array(entry.data);
        }
      }

      if (node.isDirectory) {
        parentChildren = node.children;
      }
    });
  }

  return root;
}

export function flattenArchiveNodes(nodes: ArchiveFileNode[]): ArchiveFileNode[] {
  const results: ArchiveFileNode[] = [];
  const walk = (items: ArchiveFileNode[]) => {
    items.forEach((node) => {
      if (node.isDirectory) {
        walk(node.children);
      } else {
        results.push(node);
      }
    });
  };

  walk(nodes);
  return results;
}

export interface ArchiveStats {
  totalFiles: number;
  totalSize: number;
  totalCompressed?: number;
  compressionRatio: number | null;
}

export function computeArchiveStats(nodes: ArchiveFileNode[]): ArchiveStats {
  let totalFiles = 0;
  let totalSize = 0;
  let totalCompressed = 0;
  let hasCompressed = false;

  const visit = (items: ArchiveFileNode[]) => {
    items.forEach((node) => {
      if (!node.isDirectory) {
        totalFiles += 1;
        totalSize += node.size;
        if (typeof node.compressedSize === "number") {
          totalCompressed += node.compressedSize;
          hasCompressed = true;
        }
      }
      if (node.children.length > 0) {
        visit(node.children);
      }
    });
  };

  visit(nodes);

  const compressionRatio = hasCompressed && totalSize > 0
    ? Math.max(0, Math.round(((totalSize - totalCompressed) / totalSize) * 100))
    : null;

  return {
    totalFiles,
    totalSize,
    totalCompressed: hasCompressed ? totalCompressed : undefined,
    compressionRatio,
  };
}

