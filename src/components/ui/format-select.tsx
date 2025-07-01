import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Format {
  name: string;
  displayName: string;
  color: string;
  mime?: string;
  extension?: string;
}

interface FormatSelectProps {
  formats: Format[];
  value: Format;
  onChange: (format: Format) => void;
  label?: string;
  className?: string;
}

export function FormatSelect({
  formats,
  value,
  onChange,
  label,
  className,
}: FormatSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(formats.findIndex((f) => f.name === value.name));
        return;
      }

      if (!isOpen) return;

      switch (event.key) {
        case "Escape":
          event.preventDefault();
          setIsOpen(false);
          triggerRef.current?.focus();
          break;
        case "ArrowDown":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev < formats.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          event.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : formats.length - 1,
          );
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          if (highlightedIndex >= 0) {
            onChange(formats[highlightedIndex]);
            setIsOpen(false);
            triggerRef.current?.focus();
          }
          break;
        case "Home":
          event.preventDefault();
          setHighlightedIndex(0);
          break;
        case "End":
          event.preventDefault();
          setHighlightedIndex(formats.length - 1);
          break;
      }
    };

    if (isOpen || document.activeElement === triggerRef.current) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, highlightedIndex, formats, onChange, value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  const handleSelect = (format: Format) => {
    onChange(format);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="text-sm text-muted-foreground mb-2 block">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between gap-2",
          "px-4 py-3 rounded-xl",
          "bg-card/50 backdrop-blur-sm",
          "border border-border/50",
          "text-sm font-medium",
          "transition-all duration-300",
          "hover:bg-card/80 hover:border-border",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
          isOpen && "ring-2 ring-primary border-primary",
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={label ? `${label}-label` : undefined}
      >
        <span className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: value.color }}
          />
          <span>{value.displayName}</span>
        </span>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform duration-300",
            isOpen && "rotate-180",
          )}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          aria-label={label || "Select format"}
          className={cn(
            "absolute z-50 w-full mt-2",
            "max-h-60 overflow-auto",
            "bg-card",
            "border border-border",
            "rounded-xl shadow-lg",
            "animate-in fade-in-0 zoom-in-95",
            "origin-top duration-200",
          )}
        >
          <div className="p-1">
            {formats.map((format, index) => {
              const isSelected = format.name === value.name;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={format.name}
                  ref={(el) => {
                    itemRefs.current[index] = el;
                  }}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(format)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    "w-full flex items-center justify-between gap-2",
                    "px-3 py-2 rounded-lg",
                    "text-sm font-medium",
                    "transition-all duration-150",
                    "focus:outline-none",
                    isHighlighted && "bg-accent/50",
                    isSelected && "bg-primary/10",
                    !isSelected && !isHighlighted && "hover:bg-accent/30",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: format.color }}
                    />
                    <span
                      className={cn(
                        "transition-colors",
                        isSelected && "text-primary",
                      )}
                    >
                      {format.displayName}
                    </span>
                  </span>
                  {isSelected && (
                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
