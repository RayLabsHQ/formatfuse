import React from "react";
import { Download } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

interface DownloadButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: "default" | "large" | "xl";
  children?: React.ReactNode;
  loading?: boolean;
  icon?: boolean;
}

export const DownloadButton: React.FC<DownloadButtonProps> = ({
  size = "default",
  children = "Download",
  loading = false,
  icon = true,
  className,
  disabled,
  ...props
}) => {
  const sizeClasses = {
    default: "h-11 px-6 text-base",
    large: "h-14 px-8 text-lg font-semibold",
    xl: "h-16 px-10 text-xl font-semibold",
  };

  const iconSizes = {
    default: "w-5 h-5",
    large: "w-6 h-6",
    xl: "w-7 h-7",
  };

  return (
    <Button
      variant="default"
      disabled={disabled || loading}
      className={cn(
        sizeClasses[size],
        "bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all",
        "hover:scale-[1.02] active:scale-[0.98]",
        className,
      )}
      {...props}
    >
      {icon && <Download className={cn(iconSizes[size], "mr-2")} />}
      {children}
    </Button>
  );
};

// Variant for downloading all files
interface DownloadAllButtonProps extends DownloadButtonProps {
  count?: number;
}

export const DownloadAllButton: React.FC<DownloadAllButtonProps> = ({
  count,
  ...props
}) => {
  return (
    <DownloadButton size="large" {...props}>
      Download All{count !== undefined && ` (${count})`}
    </DownloadButton>
  );
};
