import React, { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import { Progress } from "./progress";
import { CheckCircle, AlertCircle, Loader2, X } from "lucide-react";
import { Button } from "./button";

interface ProgressIndicatorProps {
  progress: number;
  status?: "idle" | "processing" | "completed" | "error";
  message?: string;
  estimatedTime?: number; // in seconds
  onCancel?: () => void;
  className?: string;
  showDetails?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  progress,
  status = "processing",
  message,
  estimatedTime,
  onCancel,
  className,
  showDetails = true,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (status === "processing") {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, startTime]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const getStatusIcon = () => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <AlertCircle className="w-5 h-5 text-destructive" />;
      case "processing":
        return <Loader2 className="w-5 h-5 animate-spin text-primary" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "text-green-500";
      case "error":
        return "text-destructive";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={cn("font-medium", getStatusColor())}>
            {message || "Processing..."}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-mono bg-secondary px-2 py-1 rounded">
            {Math.round(progress)}%
          </span>

          {onCancel && status === "processing" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="relative">
        <Progress
          value={progress}
          className={cn(
            "h-2 ff-transition",
            status === "completed" && "bg-green-100",
            status === "error" && "bg-destructive/20",
          )}
        />

        {/* Animated progress indicator */}
        {status === "processing" && progress > 0 && progress < 100 && (
          <div
            className="absolute top-0 h-full w-8 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
            style={{ left: `${progress}%` }}
          />
        )}
      </div>

      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            {status === "processing" && (
              <>
                <span>Elapsed: {formatTime(elapsedTime)}</span>
                {estimatedTime && progress > 0 && (
                  <span>
                    Remaining: ~
                    {formatTime(Math.max(0, estimatedTime - elapsedTime))}
                  </span>
                )}
              </>
            )}
            {status === "completed" && (
              <span>Completed in {formatTime(elapsedTime)}</span>
            )}
          </div>

          {status === "processing" && progress > 0 && (
            <span className="font-mono">
              {Math.round(
                (((progress / 100) * elapsedTime) / progress) *
                  (100 - progress),
              )}
              s left
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// Multi-step progress indicator
interface Step {
  id: string;
  label: string;
  status: "pending" | "processing" | "completed" | "error";
}

interface MultiStepProgressProps {
  steps: Step[];
  currentStep?: string;
  className?: string;
}

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  steps,
  currentStep,
  className,
}) => {
  const currentIndex = steps.findIndex((s) => s.id === currentStep);
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Progress</h4>
        <span className="text-sm text-muted-foreground">
          {completedCount} of {steps.length} steps
        </span>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="space-y-2">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 p-2 rounded-lg ff-transition",
              step.status === "processing" && "bg-primary/5",
              step.status === "completed" && "opacity-60",
            )}
          >
            <div className="flex-shrink-0">
              {step.status === "pending" && (
                <div className="w-6 h-6 rounded-full border-2 border-border" />
              )}
              {step.status === "processing" && (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              )}
              {step.status === "completed" && (
                <CheckCircle className="w-6 h-6 text-green-500" />
              )}
              {step.status === "error" && (
                <AlertCircle className="w-6 h-6 text-destructive" />
              )}
            </div>

            <span
              className={cn(
                "text-sm",
                step.status === "processing" && "font-medium",
                step.status === "completed" && "line-through",
              )}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
