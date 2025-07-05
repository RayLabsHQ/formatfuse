import React from "react";
import { 
  X, 
  ArrowRight, 
  TrendingUp, 
  FileIcon, 
  Sparkles,
  FileText,
  Image,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  Type
} from "lucide-react";
import type { ToolOption } from "../lib/file-type-tools";

interface ToolSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  tools: ToolOption[];
  onSelectTool: (tool: ToolOption) => void;
}

export default function ToolSuggestionModal({
  isOpen,
  onClose,
  file,
  tools,
  onSelectTool,
}: ToolSuggestionModalProps) {
  // Handle escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getFileExtension = (filename: string) => {
    return filename.split(".").pop()?.toUpperCase() || "";
  };

  const getFileIcon = (extension: string) => {
    const ext = extension.toLowerCase();
    
    // Image files
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'avif', 'heic'].includes(ext)) {
      return Image;
    }
    
    // PDF and documents
    if (['pdf', 'doc', 'docx', 'rtf'].includes(ext)) {
      return FileText;
    }
    
    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
      return FileArchive;
    }
    
    // Code/data files
    if (['json', 'xml', 'yaml', 'yml', 'csv', 'html', 'css', 'js', 'ts'].includes(ext)) {
      return FileCode;
    }
    
    // Spreadsheets
    if (['xls', 'xlsx'].includes(ext)) {
      return FileSpreadsheet;
    }
    
    // Text files
    if (['txt', 'md'].includes(ext)) {
      return Type;
    }
    
    return FileIcon;
  };

  const FileIconComponent = getFileIcon(getFileExtension(file.name));

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-border/50 animate-fade-in-up">
          {/* Minimalist Header */}
          <div className="relative">
            {/* Background gradient effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
            
            <div className="relative p-6 sm:p-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-secondary/80 rounded-xl transition-all duration-200"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-2 mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold">
                  Choose Your Tool
                </h2>
                <p className="text-muted-foreground">
                  Select how you'd like to process your file
                </p>
              </div>

              {/* File Card - Clean and Centered */}
              <div className="mx-auto max-w-md">
                <div className="bg-secondary/30 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 flex-shrink-0">
                      <FileIconComponent className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
                          {getFileExtension(file.name)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-green-600">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span>Ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tool Options - Clean Grid Layout */}
          <div className="p-6 sm:p-8 pt-0">
            {tools.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No tools available for this file type
                </p>
              </div>
            ) : (
              <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-2 -mr-2">
                {tools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => onSelectTool(tool)}
                      className="group relative w-full p-4 bg-secondary/20 hover:bg-secondary/40 rounded-xl transition-all duration-200 text-left border border-transparent hover:border-primary/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-lg bg-background/50 group-hover:bg-primary/10 transition-all duration-200 flex-shrink-0">
                          <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="font-semibold text-sm">{tool.name}</h3>
                            {tool.popularity === "high" && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-accent/10 text-accent rounded text-xs font-medium">
                                <TrendingUp className="w-3 h-3" />
                                Popular
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {tool.description}
                          </p>
                        </div>

                        <ArrowRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all duration-200 flex-shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clean Footer */}
          <div className="px-6 pb-6 sm:px-8 sm:pb-8">
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="w-3.5 h-3.5" />
              <span>All conversions happen locally in your browser</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}