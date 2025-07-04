import React, { useState, useCallback } from "react";
import {
  Download,
  FileText,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Layers,
  Package,
  CheckCircle2,
} from "lucide-react";
import { TbFileTypePdf } from "react-icons/tb";
import { Button } from "../ui/button";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import { FileDropZone } from "../ui/FileDropZone";
import { usePdfOperations } from "../../hooks/usePdfOperations";
import { PdfFileList, type PdfFile } from "../ui/PdfFileList";
import FileSaver from "file-saver";

const { saveAs } = FileSaver;

const features = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant PDF merging" },
  {
    icon: Layers,
    text: "Unlimited files",
    description: "Merge as many PDFs as needed",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-split",
    name: "PDF Split",
    description: "Split PDFs into separate files",
    icon: TbFileTypePdf,
  },
  {
    id: "pdf-compress",
    name: "PDF Compress",
    description: "Reduce PDF file size",
    icon: Package,
  },
  {
    id: "jpg-to-pdf",
    name: "JPG to PDF",
    description: "Convert images to PDF",
    icon: FileText,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What's the maximum file size for merging?",
    answer:
      "Each PDF can be up to 100MB in size. There's no limit on the number of PDFs you can merge, but we recommend keeping the total size under 500MB for optimal performance.",
  },
  {
    question: "Can I rearrange pages from different PDFs?",
    answer:
      "Currently, you can rearrange the order of entire PDFs. To rearrange individual pages, merge the PDFs first, then use our PDF Split tool to reorganize pages.",
  },
  {
    question: "Will the merged PDF maintain original quality?",
    answer:
      "Yes! The merge process preserves the original quality of all PDFs. No compression is applied unless you specifically use our PDF Compress tool afterward.",
  },
  {
    question: "Can I preview PDFs before merging?",
    answer:
      "Yes, click the eye icon next to any PDF to preview its contents. This helps ensure you're merging files in the correct order.",
  },
];

export default function PdfMerge() {
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [mergedResult, setMergedResult] = useState<Uint8Array | null>(null);

  const { merge, getPageCount, isProcessing, progress, error } =
    usePdfOperations();

  const handleFiles = useCallback(
    async (selectedFiles: File[]) => {
      const pdfFiles = selectedFiles.filter(
        (file) => file.type === "application/pdf",
      );
      const newFiles: PdfFile[] = [];

      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i];
        try {
          const fileData = new Uint8Array(await file.arrayBuffer());
          const pageCount = await getPageCount(fileData);
          newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            pageCount,
            data: fileData,
            showPreview: true,
            previewKey: 0,
          });
        } catch (err) {
          console.error("Error reading PDF:", err);
          newFiles.push({
            file,
            id: `${Date.now()}-${i}`,
            pageCount: undefined,
            showPreview: true,
          });
        }
      }

      setFiles((prev) => [...prev, ...newFiles]);
      setMergedResult(null);
    },
    [getPageCount],
  );

  const handleMerge = async () => {
    if (files.length < 2) return;

    const validFiles = files.filter((f) => f.data);
    if (validFiles.length < 2) {
      alert("Need at least 2 valid PDFs to merge");
      return;
    }

    try {
      const result = await merge({ files: validFiles.map((f) => f.data!) });
      setMergedResult(result);
    } catch (err) {
      console.error("Merge failed:", err);
    }
  };

  const downloadMerged = useCallback(() => {
    if (!mergedResult) return;

    const blob = new Blob([mergedResult], { type: "application/pdf" });
    const fileName = `merged_${new Date().getTime()}.pdf`;
    saveAs(blob, fileName);
  }, [mergedResult]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const hasFiles = files.length > 0;
  const totalPages = files.reduce((sum, f) => sum + (f.pageCount || 0), 0);

  return (
    <div className="w-full">
      {/* Merge-themed Gradient Effects - Hidden on mobile */}
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/8 rounded-full blur-3xl" />
        <div 
          className="absolute bottom-20 right-1/4 w-72 h-72 rounded-full blur-3xl opacity-5"
          style={{ background: "radial-gradient(circle, var(--tool-pdf), transparent)" }}
        />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        {/* Header */}
        <ToolHeader
          title={{ main: "PDF", highlight: "Merge" }}
          subtitle="Combine multiple PDFs into a single document. Drag to reorder, preview contents, and create the perfect merged PDF."
          badge={{ text: "Combine PDF Files Online", icon: Layers }}
          features={features}
        />

        {/* Main Interface */}
        <div className="space-y-6">
          {error && (
            <div className="mb-4 px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {error.message || "An error occurred"}
              </span>
            </div>
          )}

          {/* Drop Zone / File List */}
          {!hasFiles ? (
            <FileDropZone
              onFilesSelected={handleFiles}
              accept="application/pdf"
              multiple={true}
              isDragging={isDragging}
              onDragStateChange={setIsDragging}
              title="Drop PDFs here"
              subtitle="or click to browse"
              infoMessage="Select multiple PDFs to merge"
            />
          ) : (
            <div className="space-y-4">
              {/* File List */}
              <PdfFileList
                files={files}
                onFilesChange={setFiles}
                onFilesAdd={handleFiles}
                onMergedResultChange={setMergedResult}
                enableReordering={true}
                enablePreviews={true}
                showAddButton={true}
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleMerge}
                  disabled={isProcessing || files.length < 2}
                  className="flex-1"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Merging PDFs ({Math.round(progress)}%)
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 mr-2" />
                      Merge {files.length} PDFs
                    </>
                  )}
                </Button>

                {mergedResult && (
                  <Button
                    onClick={downloadMerged}
                    variant="default"
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Merged PDF
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Success Message */}
          {mergedResult && (
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-200">
                  PDFs merged successfully!
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {totalPages} pages combined •{" "}
                  {formatFileSize(mergedResult.byteLength)}
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
