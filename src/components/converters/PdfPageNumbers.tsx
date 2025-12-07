import React, { useState, useCallback } from "react";
import {
  Download,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Hash,
} from "lucide-react";
import { FaRegFilePdf } from "react-icons/fa6";
import { Button } from "../ui/button";
import { FileDropZone } from "../ui/FileDropZone";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "../../lib/utils";
import { Slider } from "../ui/slider";
import FileSaver from "file-saver";
import * as Comlink from "comlink";
import type { PageNumberOptions } from "../../workers/pdf-page-numbers.worker";

const { saveAs } = FileSaver;

interface PageNumberSettings {
  position: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  fontSize: number;
  format: "number" | "page-of-total" | "text-number" | "text-page-of-total";
  startPage: number;
  color: string;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant processing" },
  {
    icon: Hash,
    text: "Customizable",
    description: "Full control over numbering",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-watermark",
    name: "PDF Watermark",
    description: "Add watermarks to PDFs",
    icon: FaRegFilePdf,
  },
  {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs",
    icon: FaRegFilePdf,
  },
  {
    id: "pdf-rotate",
    name: "PDF Rotate",
    description: "Rotate PDF pages",
    icon: FaRegFilePdf,
  },
];

const faqs: FAQItem[] = [
  {
    question: "Can I customize the page number format?",
    answer:
      'Yes! Choose from formats like "1", "1 / 10", "Page 1", or "Page 1 of 10". You can also customize position, font size, and color.',
  },
  {
    question: "Can I start numbering from a specific page?",
    answer:
      "Yes, you can set a custom starting number. For example, if your document starts at page 5, set the start number to 5.",
  },
  {
    question: "Will page numbers overwrite existing content?",
    answer:
      "Page numbers are added on top of existing content. Choose positions (like bottom-center) that don't overlap with important text. You can adjust margins to fine-tune placement.",
  },
  {
    question: "Can I add different page numbers to specific pages?",
    answer:
      "Currently, page numbers are added to all pages with consecutive numbering. For more complex numbering schemes, you may need to split your PDF first.",
  },
];

const POSITION_OPTIONS = [
  { value: "top-left" as const, label: "Top Left" },
  { value: "top-center" as const, label: "Top Center" },
  { value: "top-right" as const, label: "Top Right" },
  { value: "bottom-left" as const, label: "Bottom Left" },
  { value: "bottom-center" as const, label: "Bottom Center" },
  { value: "bottom-right" as const, label: "Bottom Right" },
];

const FORMAT_OPTIONS = [
  { value: "number" as const, label: "1", example: "1" },
  { value: "page-of-total" as const, label: "1 / 10", example: "1 / 10" },
  { value: "text-number" as const, label: "Page 1", example: "Page 1" },
  {
    value: "text-page-of-total" as const,
    label: "Page 1 of 10",
    example: "Page 1 of 10",
  },
];

export default function PdfPageNumbers() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<PageNumberSettings>({
    position: "bottom-center",
    fontSize: 12,
    format: "number",
    startPage: 1,
    color: "#000000",
  });

  const handleFileSelected = useCallback((files: File[]) => {
    const pdf = files.find((file) => file.type === "application/pdf");
    if (pdf) {
      setPdfFile(pdf);
      setError(null);
    }
  }, []);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0, g: 0, b: 0 };
  };

  const handleAddPageNumbers = async () => {
    if (!pdfFile) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const worker = new Worker(
      new URL("../../workers/pdf-page-numbers.worker.ts", import.meta.url),
      { type: "module" },
    );

    try {
      const pdfData = new Uint8Array(await pdfFile.arrayBuffer());

      const pageNumberWorker = Comlink.wrap<any>(worker);

      const options: PageNumberOptions = {
        position: settings.position,
        fontSize: settings.fontSize,
        format: settings.format,
        startPage: settings.startPage,
        color: hexToRgb(settings.color),
      };

      const result = await pageNumberWorker.addPageNumbers(
        pdfData,
        options,
        Comlink.proxy((p: number) => setProgress(p)),
      );

      const blob = new Blob([result], { type: "application/pdf" });
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      saveAs(blob, `${baseName}_numbered.pdf`);

    } catch (err) {
      console.error("Page numbers error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to add page numbers",
      );
    } finally {
      worker.terminate();
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full">
      {/* Gradient Effects */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute top-1/2 -translate-y-1/2 right-10 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        <ToolHeader
          title={{ main: "PDF", highlight: "Page Numbers" }}
          subtitle="Add page numbers to your PDF with full control over position, format, and styling."
          badge={{ text: "Number PDF Pages", icon: Hash }}
          features={features}
        />

        <div className="space-y-6">
          {error && (
            <div className="px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Settings */}
          <div className="rounded-2xl p-6 bg-card/30 border border-border/50 space-y-6">
            <h3 className="text-lg font-semibold">Page Number Settings</h3>

            {/* Format Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {FORMAT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setSettings((s) => ({ ...s, format: opt.value }))
                    }
                    className={cn(
                      "p-3 rounded-lg text-sm transition-all",
                      settings.format === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-card/50 hover:bg-card border border-border/50",
                    )}
                  >
                    <div className="font-medium">{opt.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Position Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">Position</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {POSITION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setSettings((s) => ({ ...s, position: opt.value }))
                    }
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm transition-all",
                      settings.position === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-card/50 hover:bg-card border border-border/50",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size and Color */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-2 block">
                  Font Size: {settings.fontSize}px
                </label>
                <Slider
                  value={[settings.fontSize]}
                  onValueChange={(v) =>
                    setSettings((s) => ({ ...s, fontSize: v[0] }))
                  }
                  min={8}
                  max={24}
                  step={1}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Color</label>
                <input
                  type="color"
                  value={settings.color}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, color: e.target.value }))
                  }
                  className="w-full h-10 rounded-lg border border-border cursor-pointer"
                />
              </div>
            </div>

            {/* Start Page */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Start Numbering From
              </label>
              <input
                type="number"
                min="1"
                value={settings.startPage}
                onChange={(e) =>
                  setSettings((s) => ({
                    ...s,
                    startPage: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-full px-4 py-2 rounded-lg border border-border bg-background"
              />
            </div>
          </div>

          {/* File Upload */}
          {!pdfFile ? (
            <FileDropZone
              onFilesSelected={handleFileSelected}
              accept="application/pdf"
              multiple={false}
              title="Drop your PDF here"
              subtitle="or click to browse"
              customInfoContent={
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50">
                  <FaRegFilePdf className="w-4 h-4 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Add page numbers to your document
                  </span>
                </div>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-card/30 rounded-lg border border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FaRegFilePdf className="w-6 h-6 text-primary" />
                  <span className="font-medium">{pdfFile.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPdfFile(null)}
                >
                  Remove
                </Button>
              </div>

              <Button
                onClick={handleAddPageNumbers}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Page Numbers... {Math.round(progress)}%
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4 mr-2" />
                    Add Page Numbers
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Related Tools */}
          <div className="mt-12 pt-12 border-t">
            <RelatedTools tools={relatedTools} direction="horizontal" />
          </div>

          {/* FAQ */}
          <div className="mt-12">
            <FAQ items={faqs} />
          </div>
        </div>
      </section>
    </div>
  );
}
