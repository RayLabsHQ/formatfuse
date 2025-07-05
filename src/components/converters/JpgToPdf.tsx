import React, { useState, useCallback, useRef } from "react";
import {
  Download,
  Image,
  AlertCircle,
  Shield,
  Zap,
  FileText,
  Loader2,
  X,
  GripVertical,
  Plus,
  ChevronUp,
  ChevronDown,
  FileImage,
  Layers,
  Package,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import { Button } from "../ui/button";
import { FileDropZone } from "../ui/FileDropZone";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { cn } from "../../lib/utils";
import { Slider } from "../ui/slider";
import FileSaver from "file-saver";

const { saveAs } = FileSaver;

interface ImageWithPreview {
  file: File;
  id: string;
  preview: string;
}

interface WorkerMessage {
  type: "convert";
  images: Array<{ data: ArrayBuffer; name: string }>;
  options: ConversionOptions;
}

interface ResponseMessage {
  type: "progress" | "complete" | "error";
  progress?: number;
  result?: ArrayBuffer;
  error?: string;
}

interface ConversionOptions {
  quality: number;
  pageSize: "a4" | "letter" | "legal" | "auto";
  orientation: "portrait" | "landscape";
  margin: number;
}

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant PDF creation" },
  {
    icon: Layers,
    text: "Multi-page support",
    description: "Combine multiple images",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-merge",
    name: "PDF Merge",
    description: "Combine multiple PDFs into one",
    icon: FileText,
  },
  {
    id: "pdf-compress",
    name: "PDF Compress",
    description: "Reduce PDF file size",
    icon: Package,
  },
  {
    id: "image-converter",
    name: "Image Converter",
    description: "Convert between image formats",
    icon: Image,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What image formats are supported?",
    answer:
      "We support all major image formats including JPG, PNG, WebP, GIF, BMP, and more. The tool will automatically detect and convert your images to PDF format.",
  },
  {
    question: "Can I reorder pages in the PDF?",
    answer:
      "Yes! Simply drag and drop images to rearrange them before converting. On mobile devices, use the arrow buttons to move images up or down in the order.",
  },
  {
    question: "What's the maximum file size?",
    answer:
      "Each image can be up to 50MB. There's no limit on the number of images you can convert at once. The final PDF size depends on your quality settings and number of images.",
  },
  {
    question: "How do page size options work?",
    answer:
      "Auto mode fits images to their original aspect ratio. A4, Letter, and Legal options will scale images to fit within standard page dimensions while maintaining aspect ratio.",
  },
];

export default function JpgToPdf() {
  const [images, setImages] = useState<ImageWithPreview[]>([]);
  const [draggedImage, setDraggedImage] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pdfResult, setPdfResult] = useState<ArrayBuffer | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);

  const [options, setOptions] = useState<ConversionOptions>({
    quality: 0.85,
    pageSize: "auto",
    orientation: "portrait",
    margin: 20,
  });

  // Initialize worker
  React.useEffect(() => {
    workerRef.current = new Worker(
      new URL("../../workers/jpg-to-pdf.worker.ts", import.meta.url),
      { type: "module" },
    );

    workerRef.current.addEventListener(
      "message",
      (event: MessageEvent<ResponseMessage>) => {
        const { type } = event.data;

        if (type === "progress" && event.data.progress !== undefined) {
          setProgress(event.data.progress);
        } else if (type === "complete" && event.data.result) {
          setPdfResult(event.data.result);
          setIsProcessing(false);
          setProgress(100);
        } else if (type === "error") {
          setError(event.data.error || "Conversion failed");
          setIsProcessing(false);
          setProgress(0);
        }
      },
    );

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const imageFiles = selectedFiles.filter((file) =>
      file.type.startsWith("image/"),
    );
    const newImages: ImageWithPreview[] = imageFiles.map((file, index) => ({
      file,
      id: `${Date.now()}-${index}`,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
    setPdfResult(null);
    setError(null);
  }, []);

  // Image reordering functions
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    setDraggedImage(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOverImage = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex(index);
    },
    [],
  );

  const handleDropImage = useCallback(
    (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();
      e.stopPropagation();

      if (draggedImage === null) return;

      const draggedIndex = images.findIndex((img) => img.id === draggedImage);
      if (draggedIndex === -1) return;

      const newImages = [...images];
      const [removed] = newImages.splice(draggedIndex, 1);
      newImages.splice(dropIndex, 0, removed);

      setImages(newImages);
      setDraggedImage(null);
      setDragOverIndex(null);
      setPdfResult(null);
    },
    [images, draggedImage],
  );

  const moveImage = useCallback(
    (index: number, direction: "up" | "down") => {
      const newImages = [...images];
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= images.length) return;

      [newImages[index], newImages[newIndex]] = [
        newImages[newIndex],
        newImages[index],
      ];
      setImages(newImages);
      setPdfResult(null);
    },
    [images],
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
    setPdfResult(null);
  }, []);

  const handleConvert = async () => {
    if (images.length === 0 || !workerRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const imageDataArray = await Promise.all(
        images.map(async (img) => ({
          data: await img.file.arrayBuffer(),
          name: img.file.name,
        })),
      );

      const message: WorkerMessage = {
        type: "convert",
        images: imageDataArray,
        options,
      };

      workerRef.current.postMessage(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
      setIsProcessing(false);
    }
  };

  const downloadPdf = useCallback(() => {
    if (!pdfResult) return;

    const blob = new Blob([pdfResult], { type: "application/pdf" });
    const fileName =
      images.length === 1
        ? `${images[0].file.name.replace(/\.[^/.]+$/, "")}.pdf`
        : `images_to_pdf_${new Date().getTime()}.pdf`;
    saveAs(blob, fileName);
  }, [pdfResult, images]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  // Cleanup previews on unmount
  React.useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.preview));
    };
  }, [images]);

  const hasFiles = images.length > 0;

  return (
    <div className="w-full">
      {/* PDF-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div 
          className="absolute top-40 right-20 w-80 h-80 rounded-full blur-3xl opacity-10"
          style={{ background: "radial-gradient(circle, var(--tool-pdf), transparent)" }}
        />
        <div 
          className="absolute bottom-20 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-5"
          style={{ background: "radial-gradient(circle, var(--tool-jpg), transparent)" }}
        />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ main: "JPG to", highlight: "PDF" }}
          subtitle="Convert images to PDF with custom page sizes and quality settings. Arrange pages with drag-and-drop for the perfect document."
          badge={{ text: "Images to PDF Converter", icon: TrendingUp }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const selectedFiles = Array.from(e.target.files || []);
              handleFilesSelected(selectedFiles);
            }}
            className="hidden"
          />

          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* PDF Settings - Compact desktop layout */}
          <div className="space-y-6">
            {/* Desktop: Two columns, Mobile: Stacked */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Left Column: Page Settings */}
              <div className="space-y-4">
                {/* Page Size & Orientation combined */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Page settings</h3>
                  
                  {/* Page Size Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: "auto", label: "Auto", desc: "Original" },
                      { value: "a4", label: "A4", desc: "210×297mm" },
                      { value: "letter", label: "Letter", desc: "8.5×11\"" },
                      { value: "legal", label: "Legal", desc: "8.5×14\"" },
                    ].map(({ value, label, desc }) => {
                      const isSelected = options.pageSize === value;
                      return (
                        <button
                          key={value}
                          onClick={() =>
                            setOptions((prev) => ({
                              ...prev,
                              pageSize: value as any,
                            }))
                          }
                          className={cn(
                            "relative p-2.5 rounded-lg border transition-all text-left group",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50 hover:bg-muted/30"
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className={cn(
                                "font-medium text-sm",
                                isSelected ? "text-primary" : "text-foreground"
                              )}>
                                {label}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {desc}
                              </div>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Orientation Toggle */}
                  <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
                    {[
                      { value: "portrait", icon: FileText, label: "Portrait" },
                      { value: "landscape", icon: FileImage, label: "Landscape" },
                    ].map(({ value, icon: Icon, label }) => (
                      <button
                        key={value}
                        onClick={() =>
                          setOptions((prev) => ({
                            ...prev,
                            orientation: value as any,
                          }))
                        }
                        className={cn(
                          "flex-1 px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2",
                          options.orientation === value
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Quality Settings */}
              <div className="space-y-4">
                {/* Combined Quality & Margin */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Quality settings</h3>
                  
                  {/* Quality Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Image quality</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={Math.round(options.quality * 100)}
                          onChange={(e) => {
                            const value = Math.max(50, Math.min(100, parseInt(e.target.value) || 50));
                            setOptions((prev) => ({ ...prev, quality: value / 100 }));
                          }}
                          className="w-14 px-2 py-1 text-sm text-center border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          min={50}
                          max={100}
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                    <Slider
                      value={[options.quality * 100]}
                      onValueChange={(value) =>
                        setOptions((prev) => ({ ...prev, quality: value[0] / 100 }))
                      }
                      min={50}
                      max={100}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Smaller file</span>
                      <span>Higher quality</span>
                    </div>
                  </div>

                  {/* Page Margin */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Page margin</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={options.margin}
                          onChange={(e) => {
                            const value = Math.max(0, Math.min(50, parseInt(e.target.value) || 0));
                            setOptions((prev) => ({ ...prev, margin: value }));
                          }}
                          className="w-14 px-2 py-1 text-sm text-center border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          min={0}
                          max={50}
                        />
                        <span className="text-sm text-muted-foreground">px</span>
                      </div>
                    </div>
                    <Slider
                      value={[options.margin]}
                      onValueChange={(value) =>
                        setOptions((prev) => ({ ...prev, margin: value[0] }))
                      }
                      min={0}
                      max={50}
                      step={5}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>No margin</span>
                      <span>Large margin</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Drop Zone / File List */}
          {!hasFiles ? (
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              accept="image/*"
              multiple={true}
              title="Drop images here"
              subtitle="or click to browse"
              infoMessage="Supports JPG, PNG, WebP, and more"
            />
          ) : (
            <div className="space-y-4">
              {/* Image Grid */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Images to convert
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {images.length} image{images.length !== 1 ? "s" : ""} selected • Drag to reorder
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add more
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {images.map((imageInfo, index) => (
                    <div
                      key={imageInfo.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, imageInfo.id)}
                      onDragOver={(e) => handleDragOverImage(e, index)}
                      onDrop={(e) => handleDropImage(e, index)}
                      onDragEnd={() => {
                        setDragOverIndex(null);
                        setDraggedImage(null);
                      }}
                      className={cn(
                        "relative group transition-all duration-200 cursor-move",
                        dragOverIndex === index && "ring-2 ring-primary ring-offset-2",
                        draggedImage === imageInfo.id && "opacity-50",
                      )}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors">
                        <img
                          src={imageInfo.preview}
                          alt={imageInfo.file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="p-1.5 bg-white/90 dark:bg-black/90 rounded-md">
                            <GripVertical className="w-3.5 h-3.5 text-foreground" />
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeImage(imageInfo.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      {/* Mobile reorder buttons */}
                      <div className="absolute bottom-1 right-1 flex gap-0.5 sm:hidden">
                        {index > 0 && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveImage(index, "up")}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                        )}
                        {index < images.length - 1 && (
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => moveImage(index, "down")}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs font-medium truncate">
                          {imageInfo.file.name}
                        </p>
                        <p className="text-xs opacity-80">
                          {formatFileSize(imageInfo.file.size)}
                        </p>
                      </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>

              {/* Action Button */}
              <Button
                onClick={handleConvert}
                disabled={isProcessing || images.length === 0}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Converting to PDF ({progress}%)
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Convert to PDF
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Success Message */}
          {pdfResult && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-green-900 dark:text-green-200">
                    PDF created successfully!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                    File size: {formatFileSize(pdfResult.byteLength)}
                  </p>
                </div>
                <Button
                  onClick={downloadPdf}
                  variant="outline"
                  size="sm"
                  className="border-green-300 hover:bg-green-100 dark:border-green-800 dark:hover:bg-green-900/50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          )}

          {/* Related Tools */}
          <div className="mt-12 pt-12 border-t">
            <RelatedTools tools={relatedTools} direction="horizontal" />
          </div>

          {/* FAQ Section */}
          <div className="mt-12">
            <FAQ items={faqs} />
          </div>
        </div>
      </section>
    </div>
  );
}
