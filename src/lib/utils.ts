import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// File size constants
export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Format bytes to human readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Validate file size and return validation result
 */
export function validateFileSize(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${file.name}" (${formatFileSize(file.size)}) exceeds the ${MAX_FILE_SIZE_MB}MB limit`,
    };
  }
  return { valid: true };
}

/**
 * Filter files by size and return valid files with any errors
 */
export function filterFilesBySize(files: File[]): {
  validFiles: File[];
  errors: string[];
} {
  const validFiles: File[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = validateFileSize(file);
    if (result.valid) {
      validFiles.push(file);
    } else if (result.error) {
      errors.push(result.error);
    }
  }

  return { validFiles, errors };
}
