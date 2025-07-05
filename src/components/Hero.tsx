import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  FileText,
  Image,
  FileCode,
  Archive,
  Shield,
  Zap,
  Clock,
  CheckCircle,
} from "lucide-react";
import ToolSuggestionModal from "./ToolSuggestionModal";
import { FileDropZone } from "./ui/FileDropZone";
import { getToolsForFile, isSupportedFileType, type ToolOption } from "../lib/file-type-tools";
import { storeFileForTransfer } from "../lib/file-transfer";

const fileTypes = [
  { text: "PDFs", icon: FileText, color: "var(--tool-pdf)" },
  { text: "Images", icon: Image, color: "var(--tool-jpg)" },
  { text: "Documents", icon: FileCode, color: "var(--tool-doc)" },
  { text: "Archives", icon: Archive, color: "var(--primary)" },
];

const benefits = [
  { icon: Shield, text: "100% Private - Files never leave your device" },
  { icon: Zap, text: "Instant conversion - No waiting" },
  { icon: Clock, text: "No limits - Convert unlimited files" },
];

export default function Hero() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTypeIndex, setCurrentTypeIndex] = useState(0);
  const [isTypeTransitioning, setIsTypeTransitioning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // Rotate file types
  useEffect(() => {
    const shouldReduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (!shouldReduceMotion) {
      intervalRef.current = setInterval(() => {
        setIsTypeTransitioning(true);
        setTimeout(() => {
          setCurrentTypeIndex((prev) => (prev + 1) % fileTypes.length);
          setIsTypeTransitioning(false);
        }, 200);
      }, 3000) as unknown as number;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as NodeJS.Timeout);
      }
    };
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!isSupportedFileType(file)) {
      alert(
        `Sorry, we don't support ${file.name.split(".").pop()?.toUpperCase()} files yet.`,
      );
      return;
    }

    setSelectedFile(file);
    setShowModal(true);
  }, []);


  const handleToolSelect = async (tool: ToolOption) => {
    if (!selectedFile) return;

    setIsProcessing(true);

    const stored = await storeFileForTransfer(selectedFile);

    // Determine the correct URL
    const url = tool.route || `/convert/${tool.id}`;

    if (stored) {
      window.location.href = url;
    } else {
      alert(
        "File is too large to transfer. Please select the file again on the tool page.",
      );
      window.location.href = url;
    }
  };

  const tools = selectedFile ? getToolsForFile(selectedFile) : [];
  const CurrentIcon = fileTypes[currentTypeIndex].icon;

  return (
    <section className="relative p-6 sm:p-8 md:p-12 lg:p-16 overflow-hidden">
      {/* Subtle background gradient */}
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-10 md:gap-12 lg:gap-16 items-center">
          {/* Left column - Content */}
          <div className="space-y-6 sm:space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 text-sm animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-muted-foreground">
                Privacy-First Conversion Active
              </span>
            </div>

            {/* Dynamic headline */}
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold animate-fade-in-up">
                <span className="text-foreground">Convert Your</span>
                <div className="relative h-[1.2em] mt-1 sm:mt-2">
                  <div className="absolute inset-0 flex items-center gap-3">
                    <CurrentIcon
                      className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 transition-all duration-300 ${
                        isTypeTransitioning
                          ? "opacity-0 scale-90"
                          : "opacity-100 scale-100"
                      }`}
                      style={{ color: fileTypes[currentTypeIndex].color }}
                    />
                    <span
                      className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold transition-all duration-300 ${
                        isTypeTransitioning
                          ? "opacity-0 translate-y-4"
                          : "opacity-100 translate-y-0"
                      }`}
                      style={{ color: fileTypes[currentTypeIndex].color }}
                    >
                      {fileTypes[currentTypeIndex].text}
                    </span>
                  </div>
                </div>
              </h1>

              <p
                className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed animate-fade-in-up"
                style={{ animationDelay: "0.1s" }}
              >
                Fast, secure, and completely private. No uploads, no servers, no
                payments. Everything happens right in your browser.
              </p>
            </div>

            {/* Benefits list */}
            <div
              className="space-y-2 sm:space-y-3 animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              {benefits.map((benefit, index) => {
                const Icon = benefit.icon;
                return (
                  <div key={index} className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <span className="text-xs sm:text-sm md:text-base text-muted-foreground">
                      {benefit.text}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Supported formats */}
            <p
              className="text-sm text-muted-foreground animate-fade-in"
              style={{ animationDelay: "0.3s" }}
            >
              Supports 90+ formats including PDF, JPG, PNG, HEIC, and more
            </p>
          </div>

          {/* Right column - Drop zone */}
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}
          >
            <FileDropZone
              onFilesSelected={(files: File[]) => {
                if (files && files.length > 0) {
                  handleFile(files[0]);
                }
              }}
              multiple={false}
              title="Drop any file here"
              subtitle="or click to browse"
              showButtons={false}
              disabled={isProcessing}
              customInfoContent={
                <div className="inline-flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2 rounded-lg bg-muted/50 transition-all duration-300 group-hover:bg-primary/10">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-xs sm:text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                      Instant conversion
                    </span>
                  </div>
                  <span className="hidden sm:inline text-xs sm:text-sm text-muted-foreground">
                    •
                  </span>
                  <span className="text-xs sm:text-sm text-muted-foreground transition-colors duration-300 group-hover:text-foreground">
                    No sign-up required
                  </span>
                </div>
              }
            />
          </div>
        </div>
      </div>

      {/* Tool Suggestion Modal */}
      <ToolSuggestionModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedFile(null);
        }}
        file={selectedFile}
        tools={tools}
        onSelectTool={handleToolSelect}
      />
    </section>
  );
}
