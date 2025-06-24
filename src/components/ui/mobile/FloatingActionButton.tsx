import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
  disabled?: boolean;
}

export function FloatingActionButton({
  onClick,
  icon,
  label,
  position = 'bottom-right',
  size = 'md',
  variant = 'primary',
  className,
  disabled = false
}: FloatingActionButtonProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6'
  };

  const sizeClasses = {
    sm: 'h-12 w-12',
    md: 'h-14 w-14',
    lg: 'h-16 w-16'
  };

  const iconSizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-7 w-7'
  };

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
  };

  return (
    <>
      <button
        onClick={onClick}
        disabled={disabled}
        className={cn(
          "fixed z-30 lg:hidden", // Only show on mobile
          "rounded-full shadow-lg",
          "flex items-center justify-center",
          "transition-all duration-200",
          "active:scale-95",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          positionClasses[position],
          sizeClasses[size],
          variantClasses[variant],
          "pb-safe-bottom", // iOS safe area
          className
        )}
        aria-label={label}
      >
        <span className={iconSizeClasses[size]}>{icon}</span>
      </button>
      
      {/* Extended FAB with label */}
      {label && (
        <button
          onClick={onClick}
          disabled={disabled}
          className={cn(
            "fixed z-30 lg:hidden",
            "rounded-full shadow-lg",
            "flex items-center gap-3 px-6",
            "transition-all duration-200",
            "active:scale-95",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            positionClasses[position],
            "h-14", // Fixed height for extended FAB
            variantClasses[variant],
            "pb-safe-bottom",
            className
          )}
        >
          <span className={iconSizeClasses[size]}>{icon}</span>
          <span className="font-medium">{label}</span>
        </button>
      )}
    </>
  );
}

interface FABGroupProps {
  children: ReactNode;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
}

export function FABGroup({ children, position = 'bottom-right' }: FABGroupProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6'
  };

  return (
    <div className={cn(
      "fixed z-30 lg:hidden",
      "flex flex-col gap-3",
      positionClasses[position],
      "pb-safe-bottom"
    )}>
      {children}
    </div>
  );
}