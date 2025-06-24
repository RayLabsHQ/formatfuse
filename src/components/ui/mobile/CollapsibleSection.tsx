import React, { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  contentClassName
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3",
          "flex items-center justify-between",
          "hover:bg-muted/50 transition-colors",
          "text-left",
          "min-h-[56px]" // Ensure good touch target
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="font-medium truncate">{title}</span>
          {badge !== undefined && (
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <ChevronDown 
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform duration-200",
            isOpen && "rotate-180"
          )} 
        />
      </button>
      
      <div className={cn(
        "overflow-hidden transition-all duration-200",
        isOpen ? "max-h-[2000px]" : "max-h-0"
      )}>
        <div className={cn("px-4 py-3 border-t", contentClassName)}>
          {children}
        </div>
      </div>
    </div>
  );
}

interface CollapsibleListProps {
  children: ReactNode;
  className?: string;
}

export function CollapsibleList({ children, className }: CollapsibleListProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );
}