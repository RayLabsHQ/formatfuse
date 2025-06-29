import React, { useEffect, useRef, useState } from 'react';
import { createHighlighterCore } from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import json from '@shikijs/langs/json';
import yaml from '@shikijs/langs/yaml';
import githubDark from '@shikijs/themes/github-dark';
import githubLight from '@shikijs/themes/github-light';
import { cn } from '@/lib/utils';

// Create a singleton highlighter instance with JSON and YAML support
let highlighter: any = null;

const getHighlighter = async () => {
  if (!highlighter) {
    highlighter = await createHighlighterCore({
      themes: [githubDark, githubLight],
      langs: [json, yaml],
      // @ts-ignore - WASM import
      engine: createOnigurumaEngine(import('shiki/wasm'))
    });
  }
  return highlighter;
};

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = 'json',
  theme = 'github-dark',
  readOnly = false,
  placeholder = '',
  className,
  error = false
}: CodeEditorProps) {
  const [html, setHtml] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [lineNumbers, setLineNumbers] = useState<string[]>(['1']);

  useEffect(() => {
    const updateLineNumbers = () => {
      const lines = (value || '').split('\n');
      setLineNumbers(lines.map((_, i) => String(i + 1)));
    };
    updateLineNumbers();
  }, [value]);

  useEffect(() => {
    const highlight = async () => {
      if (!value && !readOnly) {
        setHtml('');
        return;
      }

      try {
        const hl = await getHighlighter();
        // Use the appropriate language or fallback to plaintext
        const langToUse = ['json', 'yaml'].includes(language) ? language : 'json';
        const highlighted = hl.codeToHtml(value || '', {
          lang: langToUse,
          theme,
        });
        setHtml(highlighted);
      } catch {
        // Fallback for invalid syntax
        setHtml(`<pre><code>${value}</code></pre>`);
      }
    };

    const debounceTimer = setTimeout(highlight, 150);
    return () => clearTimeout(debounceTimer);
  }, [value, language, theme, readOnly]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const lineNumbersEl = document.getElementById(`line-numbers-${language}`);
    const highlightEl = document.getElementById(`highlight-${language}`);
    
    if (lineNumbersEl) lineNumbersEl.scrollTop = target.scrollTop;
    if (highlightEl) highlightEl.scrollTop = target.scrollTop;
  };

  return (
    <div className={cn(
      "relative rounded-lg border bg-background overflow-hidden",
      error ? "border-destructive" : "border-input",
      isFocused && !error && "ring-2 ring-ring ring-offset-2 ring-offset-background",
      className
    )}>
      <div className="flex h-full">
        {/* Line Numbers */}
        <div 
          id={`line-numbers-${language}`}
          className="select-none border-r bg-muted/30 px-3 py-4 text-right text-xs text-muted-foreground overflow-hidden"
          style={{ minWidth: '3rem' }}
        >
          {lineNumbers.map(num => (
            <div key={num} className="leading-6 font-mono">
              {num}
            </div>
          ))}
        </div>

        {/* Editor Area */}
        <div className="relative flex-1">
          {/* Syntax Highlighted Layer (Read-only) */}
          {readOnly || value ? (
            <div
              id={`highlight-${language}`}
              className="absolute inset-0 px-4 py-4 overflow-auto pointer-events-none"
              dangerouslySetInnerHTML={{ __html: html }}
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: '0.875rem',
                lineHeight: '1.5rem',
              }}
            />
          ) : null}

          {/* Textarea Layer (for editing) */}
          {!readOnly && (
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange?.(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.currentTarget.selectionStart;
                  const end = e.currentTarget.selectionEnd;
                  
                  if (e.shiftKey) {
                    // Handle Shift+Tab for outdent
                    const beforeStart = value.lastIndexOf('\n', start - 1) + 1;
                    const lineStart = value.substring(beforeStart, start);
                    
                    if (lineStart.startsWith('  ')) {
                      // Remove 2 spaces from the beginning of the line
                      const newValue = value.substring(0, beforeStart) + lineStart.substring(2) + value.substring(start);
                      onChange?.(newValue);
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = Math.max(beforeStart, start - 2);
                        }
                      }, 0);
                    }
                  } else {
                    // Handle Tab for indent
                    if (start === end) {
                      // No selection, insert 2 spaces
                      const newValue = value.substring(0, start) + '  ' + value.substring(end);
                      onChange?.(newValue);
                      setTimeout(() => {
                        if (textareaRef.current) {
                          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
                        }
                      }, 0);
                    } else {
                      // Selection exists, indent all selected lines
                      const lines = value.split('\n');
                      let charCount = 0;
                      let startLine = -1;
                      let endLine = -1;
                      
                      for (let i = 0; i < lines.length; i++) {
                        const lineLength = lines[i].length;
                        if (startLine === -1 && charCount + lineLength >= start) {
                          startLine = i;
                        }
                        if (endLine === -1 && charCount + lineLength >= end) {
                          endLine = i;
                          break;
                        }
                        charCount += lineLength + 1; // +1 for newline
                      }
                      
                      if (startLine !== -1 && endLine !== -1) {
                        for (let i = startLine; i <= endLine; i++) {
                          lines[i] = '  ' + lines[i];
                        }
                        const newValue = lines.join('\n');
                        onChange?.(newValue);
                      }
                    }
                  }
                }
              }}
              onScroll={handleScroll}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              spellCheck={false}
              className={cn(
                "absolute inset-0 w-full h-full px-4 py-4 bg-transparent resize-none outline-none",
                "font-mono text-sm leading-6",
                value ? "text-transparent caret-white" : "text-muted-foreground"
              )}
              style={{
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                lineHeight: '1.5rem',
              }}
            />
          )}

          {/* Placeholder for read-only empty state */}
          {readOnly && !value && placeholder && (
            <div className="px-4 py-4 text-muted-foreground font-mono text-sm">
              {placeholder}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}