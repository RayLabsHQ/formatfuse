import React from "react";
import type { ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

interface MobileTabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  className?: string;
}

export function MobileTabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: MobileTabsProps) {
  return (
    <Tabs.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      className={cn("flex flex-col", className)}
    >
      {children}
    </Tabs.Root>
  );
}

interface MobileTabsListProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "pills" | "underline";
}

export function MobileTabsList({
  children,
  className,
  variant = "default",
}: MobileTabsListProps) {
  const variantClasses = {
    default: "bg-muted p-1 rounded-lg",
    pills: "gap-2 p-1",
    underline: "border-b",
  };

  return (
    <Tabs.List
      className={cn(
        "flex items-center",
        "overflow-x-auto scrollbar-hide",
        "-mx-4 px-4", // Full width scroll on mobile
        "lg:mx-0 lg:px-0",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </Tabs.List>
  );
}

interface MobileTabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  badge?: string | number;
}

export function MobileTabsTrigger({
  value,
  children,
  className,
  icon,
  badge,
}: MobileTabsTriggerProps) {
  return (
    <Tabs.Trigger
      value={value}
      className={cn(
        "flex items-center gap-2",
        "px-4 py-2.5",
        "text-sm font-medium",
        "rounded-md",
        "transition-all",
        "whitespace-nowrap",
        "min-h-[44px]", // Good touch target
        "data-[state=active]:bg-background",
        "data-[state=active]:text-foreground",
        "data-[state=active]:shadow-sm",
        "data-[state=inactive]:text-muted-foreground",
        className,
      )}
    >
      {icon && <span className="h-4 w-4">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span className="ml-1 text-xs bg-muted px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </Tabs.Trigger>
  );
}

interface MobileTabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export function MobileTabsContent({
  value,
  children,
  className,
}: MobileTabsContentProps) {
  return (
    <Tabs.Content
      value={value}
      className={cn("flex-1", "focus-visible:outline-none", className)}
    >
      {children}
    </Tabs.Content>
  );
}

// Segmented control style tabs for mobile
interface SegmentedControlProps {
  options: Array<{
    value: string;
    label: string;
    icon?: ReactNode;
  }>;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentedControl({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  return (
    <div
      className={cn(
        "flex p-1 bg-muted rounded-lg",
        "lg:hidden", // Mobile only
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2",
            "px-3 py-2.5",
            "text-sm font-medium",
            "rounded-md",
            "transition-all",
            "min-h-[44px]",
            value === option.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground",
          )}
        >
          {option.icon && <span className="h-4 w-4">{option.icon}</span>}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}
