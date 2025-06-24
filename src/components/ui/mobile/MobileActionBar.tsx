import React from 'react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MobileActionBarProps {
  children: ReactNode;
  position?: 'top' | 'bottom';
  sticky?: boolean;
  className?: string;
}

export function MobileActionBar({
  children,
  position = 'bottom',
  sticky = true,
  className
}: MobileActionBarProps) {
  return (
    <div className={cn(
      "bg-background/95 backdrop-blur-md border-t",
      "px-4 py-3",
      "lg:hidden", // Only show on mobile
      sticky && position === 'bottom' && "sticky bottom-0 z-30",
      sticky && position === 'top' && "sticky top-0 z-30",
      className
    )}>
      <div className="flex items-center justify-between gap-3">
        {children}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  onClick: () => void;
  icon?: ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ActionButton({
  onClick,
  icon,
  label,
  variant = 'secondary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  className
}: ActionButtonProps) {
  const sizeClasses = {
    sm: 'h-10 px-3 text-sm',
    md: 'h-12 px-4 text-base',
    lg: 'h-14 px-5 text-base'
  };

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-muted'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "rounded-lg font-medium",
        "transition-colors",
        "active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "min-w-[64px]", // Ensure minimum touch target width
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && "flex-1",
        className
      )}
    >
      {icon && <span className="h-5 w-5">{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

interface ActionIconButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  className?: string;
}

export function ActionIconButton({
  onClick,
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  className
}: ActionIconButtonProps) {
  const sizeClasses = {
    sm: 'h-10 w-10',
    md: 'h-12 w-12',
    lg: 'h-14 w-14'
  };

  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-muted'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center",
        "rounded-lg",
        "transition-colors",
        "active:scale-95",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      <span className="h-5 w-5">{icon}</span>
    </button>
  );
}