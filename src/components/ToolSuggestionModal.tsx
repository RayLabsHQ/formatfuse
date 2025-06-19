import React from 'react';
import { X, ArrowRight, TrendingUp, Clock } from 'lucide-react';
import type { ToolOption } from '../lib/file-type-tools';

interface ToolSuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: File | null;
  tools: ToolOption[];
  onSelectTool: (toolId: string) => void;
}

export default function ToolSuggestionModal({ 
  isOpen, 
  onClose, 
  file, 
  tools,
  onSelectTool 
}: ToolSuggestionModalProps) {
  if (!isOpen || !file) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toUpperCase() || '';
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 ff-transition"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-card rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  What would you like to do?
                </h2>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {file.name}
                  </span>
                  <span className="px-2 py-1 bg-secondary rounded text-xs">
                    {getFileExtension(file.name)}
                  </span>
                  <span>{formatFileSize(file.size)}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-secondary rounded-lg ff-transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Tool Options */}
          <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
            {tools.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Sorry, we don't support this file type yet.
                </p>
              </div>
            ) : (
              tools.map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => onSelectTool(tool.id)}
                    className="w-full p-4 bg-secondary/50 hover:bg-secondary rounded-xl ff-transition group text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground ff-transition`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-semibold">{tool.name}</h3>
                          {tool.popularity === 'high' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs font-medium">
                              <TrendingUp className="w-3 h-3" />
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {tool.description}
                        </p>
                      </div>
                      
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground ff-transition" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
          
          {/* Footer */}
          <div className="p-6 border-t border-border bg-secondary/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Your file will be ready on the next page</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}