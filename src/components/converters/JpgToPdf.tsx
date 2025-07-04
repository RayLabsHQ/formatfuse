import React, { useState, useCallback, useRef } from "react";
import {
  Download,
  Image,
  Settings2,
  AlertCircle,
  Shield,
  Zap,
  ChevronRight,
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
import { CollapsibleSection } from "../ui/mobile/CollapsibleSection";
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
  const [showAdvanced, setShowAdvanced] = useState(false);
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

          {/* Settings Card */}
          <div
            className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden animate-fade-in-up"
            style={{ animationDelay: "0.3s" }}
          >
            {/* Card Header */}
            <div className="border-b border-border/50 px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-primary" />
                PDF Settings
              </h2>
            </div>

            <div className="p-6 space-y-6">
              {/* Page Size */}
              <div className="space-y-4">
                <label className="text-sm font-medium flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Page Size
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {["auto", "a4", "letter", "legal"].map((size) => (
                    <button
                      key={size}
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          pageSize: size as any,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm",
                        options.pageSize === size
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50 bg-card/50",
                      )}
                    >
                      {size.charAt(0).toUpperCase() + size.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div className="space-y-4">
                <label className="text-sm font-medium">Orientation</label>
                <div className="grid grid-cols-2 gap-2">
                  {["portrait", "landscape"].map((orientation) => (
                    <button
                      key={orientation}
                      onClick={() =>
                        setOptions((prev) => ({
                          ...prev,
                          orientation: orientation as any,
                        }))
                      }
                      className={cn(
                        "px-3 py-2 rounded-lg border-2 transition-all duration-200 text-sm",
                        options.orientation === orientation
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/50 bg-card/50",
                      )}
                    >
                      {orientation.charAt(0).toUpperCase() +
                        orientation.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality Slider */}
              <div className="space-y-4">
                <label className="text-sm font-medium">
                  Image Quality: {Math.round(options.quality * 100)}%
                </label>
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
                <p className="text-xs text-muted-foreground">
                  Higher quality means larger file size
                </p>
              </div>

              {/* Advanced Options - Collapsible on Mobile */}
              <div className="sm:hidden">
                <CollapsibleSection
                  title="Advanced Options"
                  defaultOpen={false}
                >
                  <div className="space-y-4 pt-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Page Margin: {options.margin}px
                      </label>
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
                    </div>
                  </div>
                </CollapsibleSection>
              </div>

              {/* Desktop Advanced Options */}
              <div className="hidden sm:block space-y-4">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-primary transition-colors"
                >
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                  <ChevronRight
                    className={cn(
                      "w-4 h-4 ml-auto transition-transform",
                      showAdvanced && "rotate-90",
                    )}
                  />
                </button>

                {showAdvanced && (
                  <div className="space-y-4 pt-4 border-t">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Page Margin: {options.margin}px
                      </label>
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
                    </div>
                  </div>
                )}
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
              <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-medium text-base sm:text-lg">
                      Images to convert
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      {images.length} image{images.length !== 1 ? "s" : ""}{" "}
                      selected
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

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
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
                        "relative group transition-all duration-200",
                        dragOverIndex === index && "ring-2 ring-primary",
                        draggedImage === imageInfo.id && "opacity-50",
                      )}
                    >
                      <div className="aspect-square bg-secondary/[0.3] rounded-lg overflow-hidden">
                        <img
                          src={imageInfo.preview}
                          alt={imageInfo.file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute top-1 left-1 p-1 bg-background/90 rounded hidden sm:block">
                        <GripVertical className="w-3 h-3 text-muted-foreground" />
                      </div>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(imageInfo.id)}
                      >
                        <X className="h-3 w-3" />
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
                      <div className="mt-1.5">
                        <p className="text-xs font-medium truncate">
                          {imageInfo.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(imageInfo.file.size)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4">
                  <span className="hidden sm:inline">
                    Drag images to reorder them in the PDF
                  </span>
                  <span className="sm:hidden">Use arrows to reorder pages</span>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleConvert}
                  disabled={isProcessing || images.length === 0}
                  className="flex-1"
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

                {pdfResult && (
                  <Button
                    onClick={downloadPdf}
                    variant="default"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {pdfResult && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-200">
                  PDF created successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {formatFileSize(pdfResult.byteLength)}
                </p>
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
