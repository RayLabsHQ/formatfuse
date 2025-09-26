import React, { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, ChevronRight, Download, File as FileIcon, FolderOpen } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

export interface ArchiveFileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: ArchiveFileNode[];
}

type FlattenedNode<T extends ArchiveFileNode> = {
  node: T;
  depth: number;
};

interface ArchiveFileTreeProps<T extends ArchiveFileNode> {
  nodes: T[];
  expandedPaths: Set<string>;
  selectedPaths: Set<string>;
  onToggleExpand: (path: string) => void;
  onToggleSelect: (node: T) => void;
  getNodeMeta?: (node: T) => string;
  canSelect?: (node: T) => boolean;
  onDownload?: (node: T) => void;
  renderActions?: (node: T) => React.ReactNode;
  estimateRowHeight?: number;
  overscan?: number;
  className?: string;
  emptyState?: React.ReactNode;
}

const DEFAULT_ROW_HEIGHT = 56;
const DEFAULT_OVERSCAN = 8;

export function ArchiveFileTree<T extends ArchiveFileNode>({
  nodes,
  expandedPaths,
  selectedPaths,
  onToggleExpand,
  onToggleSelect,
  getNodeMeta,
  canSelect,
  onDownload,
  renderActions,
  estimateRowHeight = DEFAULT_ROW_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  className,
  emptyState,
}: ArchiveFileTreeProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);

  const flattenedNodes = useMemo(() => {
    const rows: Array<FlattenedNode<T>> = [];

    const walk = (items: T[], depth: number) => {
      items.forEach((item) => {
        rows.push({ node: item, depth });
        if (
          item.isDirectory &&
          item.children &&
          item.children.length > 0 &&
          expandedPaths.has(item.path)
        ) {
          walk(item.children as T[], depth + 1);
        }
      });
    };

    walk(nodes, 0);
    return rows;
  }, [nodes, expandedPaths]);

  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => estimateRowHeight,
    overscan,
  });

  if (flattenedNodes.length === 0) {
    return (
      <div
        ref={containerRef}
        className={cn("relative overflow-auto", className)}
      >
        {emptyState ?? (
          <div className="py-8 text-center text-sm text-muted-foreground">No files found in this archive.</div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
          width: "100%",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const { node, depth } = flattenedNodes[virtualRow.index];
          const isExpanded = node.isDirectory && expandedPaths.has(node.path);
          const isSelected = selectedPaths.has(node.path);
          const selectable = canSelect ? canSelect(node) : !node.isDirectory;
          const meta = getNodeMeta
            ? getNodeMeta(node)
            : node.isDirectory
              ? "Directory"
              : "";

          return (
            <div
              key={node.path}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className={cn(
                  "flex items-center gap-3 border-b border-border/20 py-3 pr-4 transition-colors",
                  node.isDirectory
                    ? "cursor-pointer hover:bg-muted/50"
                    : "cursor-pointer hover:bg-muted/40",
                  isSelected && selectable && "bg-primary/10",
                )}
                style={{ paddingLeft: `${16 + depth * 20}px` }}
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (node.isDirectory) {
                    onToggleExpand(node.path);
                  } else if (selectable) {
                    onToggleSelect(node);
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (node.isDirectory) {
                      onToggleExpand(node.path);
                    } else if (selectable) {
                      onToggleSelect(node);
                    }
                  }
                }}
              >
                {node.isDirectory ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleExpand(node.path);
                    }}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60"
                    aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                ) : (
                  <RadioGroup
                    aria-label={`Selection toggle for ${node.name}`}
                    value={isSelected ? "selected" : "unselected"}
                    onValueChange={(value) => {
                      if (value === "selected" && selectable && !isSelected) {
                        onToggleSelect(node);
                      }
                    }}
                    className="grid place-items-center"
                  >
                    <RadioGroupItem
                      value="selected"
                      className="size-4 border-muted-foreground/50 bg-background/70 text-primary data-[state=unchecked]:border-muted-foreground/60 data-[state=unchecked]:bg-background/60 data-[state=checked]:border-primary data-[state=checked]:bg-primary/15"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (!selectable) {
                          return;
                        }
                        if (isSelected) {
                          onToggleSelect(node);
                        }
                      }}
                    />
                  </RadioGroup>
                )}

                {node.isDirectory ? (
                  <FolderOpen className="h-4 w-4 text-primary" />
                ) : (
                  <FileIcon className="h-4 w-4 text-muted-foreground" />
                )}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{node.name}</p>
                  {meta && (
                    <p className="text-xs text-muted-foreground">{meta}</p>
                  )}
                </div>

                {renderActions ? (
                  renderActions(node)
                ) : (
                  !node.isDirectory && onDownload && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDownload(node);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Save
                    </Button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default ArchiveFileTree;
