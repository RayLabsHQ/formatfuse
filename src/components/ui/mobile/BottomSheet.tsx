import React from "react";
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onOpenChange,
  title,
  children,
  className,
}: BottomSheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 lg:hidden" />
        <Dialog.Content
          className={cn(
            "fixed bottom-0 left-0 right-0 z-50",
            "bg-background rounded-t-2xl",
            "max-h-[85vh] overflow-hidden",
            "animate-in slide-in-from-bottom-full duration-300",
            "lg:hidden", // Only show on mobile
            className,
          )}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <Dialog.Title className="text-lg font-semibold">
                {title}
              </Dialog.Title>
              <Dialog.Close className="p-2 -mr-2 hover:bg-muted rounded-lg transition-colors">
                <X className="h-5 w-5" />
              </Dialog.Close>
            </div>
          )}

          {/* Content */}
          <div className="overflow-y-auto overscroll-contain px-4 py-4 pb-safe-bottom">
            {children}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

interface BottomSheetTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function BottomSheetTrigger({
  children,
  asChild,
}: BottomSheetTriggerProps) {
  return <Dialog.Trigger asChild={asChild}>{children}</Dialog.Trigger>;
}
