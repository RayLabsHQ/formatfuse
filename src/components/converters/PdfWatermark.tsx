import React, { useState, useCallback, useRef } from "react";
import {
  Download,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Droplets,
  FileText,
  Image as ImageIcon,
  Upload,
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
import type { WatermarkOptions } from "../../workers/pdf-watermark.worker";

const { saveAs } = FileSaver;

interface WatermarkSettings {
  type: "text" | "image";
  text: string;
  fontSize: number;
  opacity: number;
  rotation: number;
  color: string;
  position: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  imageFile?: File;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant processing" },
  {
    icon: Droplets,
    text: "Customizable",
    description: "Full control over appearance",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-compress",
    name: "PDF Compress",
    description: "Reduce PDF file size",
    icon: FaRegFilePdf,
  },
  {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs",
    icon: FaRegFilePdf,
  },
  {
    id: "pdf-protect",
    name: "PDF Protect",
    description: "Add password protection",
    icon: FaRegFilePdf,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What types of watermarks can I add?",
    answer:
      "You can add text watermarks with custom font size, color, and rotation, or image watermarks using PNG or JPG files. Both support opacity adjustment for subtle or prominent marks.",
  },
  {
    question: "Will the watermark appear on all pages?",
    answer:
      "Yes, the watermark is automatically applied to all pages in your PDF document. You can control the position, opacity, and rotation for consistent branding across your document.",
  },
  {
    question: "Can I remove a watermark later?",
    answer:
      "Watermarks are permanently embedded into the PDF. If you need to remove them, you'll need the original unwatermarked file. Always keep a backup of your original PDF.",
  },
  {
    question: "What's the best opacity for watermarks?",
    answer:
      "For backgrounds, 20-30% opacity works well. For prominent branding, 50-70% is recommended. Text watermarks generally look best at 40-60% opacity to maintain readability while being visible.",
  },
];

const POSITION_OPTIONS = [
  { value: "center" as const, label: "Center" },
  { value: "top-left" as const, label: "Top Left" },
  { value: "top-right" as const, label: "Top Right" },
  { value: "bottom-left" as const, label: "Bottom Left" },
  { value: "bottom-right" as const, label: "Bottom Right" },
];

export default function PdfWatermark() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<WatermarkSettings>({
    type: "text",
    text: "CONFIDENTIAL",
    fontSize: 48,
    opacity: 0.5,
    rotation: 45,
    color: "#808080",
    position: "center",
  });

  const handleFileSelected = useCallback((files: File[]) => {
    const pdf = files.find((file) => file.type === "application/pdf");
    if (pdf) {
      setPdfFile(pdf);
      setError(null);
    }
  }, []);

  const handleImageSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && (file.type === "image/png" || file.type === "image/jpeg")) {
        setSettings((prev) => ({ ...prev, imageFile: file }));
        setError(null);
      }
    },
    [],
  );

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0.5, g: 0.5, b: 0.5 };
  };

  const handleAddWatermark = async () => {
    if (!pdfFile) return;

    if (settings.type === "text" && !settings.text.trim()) {
      setError("Please enter watermark text");
      return;
    }

    if (settings.type === "image" && !settings.imageFile) {
      setError("Please select an image");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const pdfData = new Uint8Array(await pdfFile.arrayBuffer());

      const worker = new Worker(
        new URL("../../workers/pdf-watermark.worker.ts", import.meta.url),
        { type: "module" },
      );

      const watermarkWorker =
        Comlink.wrap<any>(worker);

      const options: WatermarkOptions = {
        type: settings.type,
        opacity: settings.opacity,
        rotation: settings.rotation,
        position: settings.position,
      };

      if (settings.type === "text") {
        options.text = settings.text;
        options.fontSize = settings.fontSize;
        options.color = hexToRgb(settings.color);
      } else if (settings.imageFile) {
        options.imageData = new Uint8Array(
          await settings.imageFile.arrayBuffer(),
        );
        options.imageType = settings.imageFile.type === "image/png" ? "png" : "jpg";
      }

      const result = await watermarkWorker.addWatermark(
        pdfData,
        options,
        Comlink.proxy((p: number) => setProgress(p)),
      );

      const blob = new Blob([result], { type: "application/pdf" });
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      saveAs(blob, `${baseName}_watermarked.pdf`);

      worker.terminate();
    } catch (err) {
      console.error("Watermark error:", err);
      setError(err instanceof Error ? err.message : "Failed to add watermark");
    } finally {
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
          title={{ main: "PDF", highlight: "Watermark" }}
          subtitle="Add text or image watermarks to protect your PDF documents. Full control over opacity, rotation, and position."
          badge={{ text: "Watermark PDF Online", icon: Droplets }}
          features={features}
        />

        <div className="space-y-6">
          {error && (
            <div className="px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Watermark Settings */}
          <div className="rounded-2xl p-6 bg-card/30 border border-border/50 space-y-6">
            <h3 className="text-lg font-semibold">Watermark Settings</h3>

            {/* Type Selection */}
            <div className="flex gap-3">
              <button
                onClick={() => setSettings((s) => ({ ...s, type: "text" }))}
                className={cn(
                  "flex-1 p-4 rounded-xl transition-all duration-200 flex items-center gap-3",
                  settings.type === "text"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card/50 hover:bg-card border border-border/50",
                )}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Text</span>
              </button>
              <button
                onClick={() => setSettings((s) => ({ ...s, type: "image" }))}
                className={cn(
                  "flex-1 p-4 rounded-xl transition-all duration-200 flex items-center gap-3",
                  settings.type === "image"
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "bg-card/50 hover:bg-card border border-border/50",
                )}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="font-medium">Image</span>
              </button>
            </div>

            {/* Text Watermark Settings */}
            {settings.type === "text" && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={settings.text}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, text: e.target.value }))
                    }
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background"
                    placeholder="Enter watermark text"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Font Size: {settings.fontSize}px
                    </label>
                    <Slider
                      value={[settings.fontSize]}
                      onValueChange={(v) =>
                        setSettings((s) => ({ ...s, fontSize: v[0] }))
                      }
                      min={12}
                      max={120}
                      step={1}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Color
                    </label>
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
              </div>
            )}

            {/* Image Watermark Settings */}
            {settings.type === "image" && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Watermark Image
                </label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {settings.imageFile
                    ? settings.imageFile.name
                    : "Select Image (PNG or JPG)"}
                </Button>
              </div>
            )}

            {/* Common Settings */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Position
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Opacity: {Math.round(settings.opacity * 100)}%
                  </label>
                  <Slider
                    value={[settings.opacity * 100]}
                    onValueChange={(v) =>
                      setSettings((s) => ({ ...s, opacity: v[0] / 100 }))
                    }
                    min={10}
                    max={100}
                    step={5}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Rotation: {settings.rotation}°
                  </label>
                  <Slider
                    value={[settings.rotation]}
                    onValueChange={(v) =>
                      setSettings((s) => ({ ...s, rotation: v[0] }))
                    }
                    min={-180}
                    max={180}
                    step={15}
                  />
                </div>
              </div>
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
                    Add watermark to protect your document
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
                onClick={handleAddWatermark}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding Watermark... {Math.round(progress)}%
                  </>
                ) : (
                  <>
                    <Droplets className="w-4 h-4 mr-2" />
                    Add Watermark
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
