import React from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileToolLayoutProps {
  children: ReactNode;
  className?: string;
}

/**
 * Mobile-optimized layout wrapper for developer tools
 * Provides consistent mobile-first structure
 */
export function MobileToolLayout({ children, className }: MobileToolLayoutProps) {
  return (
    <div className={cn(
      "flex flex-col min-h-[100dvh] lg:min-h-0",
      "pb-safe-bottom", // For iOS safe area
      className
    )}>
      {children}
    </div>
  );
}

interface MobileToolHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  sticky?: boolean;
}

export function MobileToolHeader({ 
  title, 
  description, 
  action,
  sticky = true 
}: MobileToolHeaderProps) {
  return (
    <header className={cn(
      "bg-background/95 backdrop-blur-md border-b",
      "px-4 py-3",
      sticky && "sticky top-0 z-40 lg:relative lg:bg-transparent lg:backdrop-blur-none lg:border-0"
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold truncate lg:text-2xl">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground line-clamp-1 lg:line-clamp-none">
              {description}
            </p>
          )}
        </div>
        {action && (
          <div className="flex-shrink-0 lg:hidden">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

interface MobileToolContentProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function MobileToolContent({ 
  children, 
  className,
  noPadding = false 
}: MobileToolContentProps) {
  return (
    <main className={cn(
      "flex-1 overflow-y-auto",
      !noPadding && "px-4 py-4",
      "lg:px-0 lg:py-0", // Remove mobile padding on desktop
      className
    )}>
      {children}
    </main>
  );
}

interface MobileToolFooterProps {
  children: ReactNode;
  className?: string;
}

export function MobileToolFooter({ children, className }: MobileToolFooterProps) {
  return (
    <footer className={cn(
      "border-t bg-background/95 backdrop-blur-md",
      "px-4 py-3",
      "lg:hidden", // Hide on desktop
      className
    )}>
      {children}
    </footer>
  );
}