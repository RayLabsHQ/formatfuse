import React, { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
  className?: string;
  contentClassName?: string;
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  badge,
  className,
  contentClassName,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-xl bg-card/30 backdrop-blur-sm border border-border/50",
        className,
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-6 py-5",
          "flex items-center justify-between",
          "hover:bg-card/50 transition-colors duration-200",
          "text-left",
          "group",
        )}
        type="button"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-medium text-base">{title}</span>
          {badge !== undefined && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Simple approach: just show/hide content */}
      <div className={cn("px-6 pb-5", contentClassName, !isOpen && "hidden")}>
        {children}
      </div>
    </div>
  );
}

interface CollapsibleListProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleList({ children, className }: CollapsibleListProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}
