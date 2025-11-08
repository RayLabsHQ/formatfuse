import React, { useState, useCallback } from "react";
import { AlertCircle, Shield, Zap, Loader2, Layers } from "lucide-react";
import { FaRegFilePdf } from "react-icons/fa6";
import { Button } from "../ui/button";
import { FileDropZone } from "../ui/FileDropZone";
import { FAQ, type FAQItem } from "../ui/FAQ";
import { RelatedTools, type RelatedTool } from "../ui/RelatedTools";
import { ToolHeader } from "../ui/ToolHeader";
import FileSaver from "file-saver";
import * as Comlink from "comlink";

const { saveAs } = FileSaver;

const features = [
  { icon: Shield, text: "Privacy-first", description: "Files never leave your device" },
  { icon: Zap, text: "Lightning fast", description: "Instant flattening" },
  { icon: Layers, text: "Non-editable", description: "Make forms permanent" },
];

const relatedTools: RelatedTool[] = [
  { id: "pdf-protect", name: "PDF Protect", description: "Add password protection", icon: FaRegFilePdf },
  { id: "pdf-compress", name: "PDF Compress", description: "Reduce file size", icon: FaRegFilePdf },
  { id: "pdf-merge", name: "PDF Merge", description: "Combine PDFs", icon: FaRegFilePdf },
];

const faqs: FAQItem[] = [
  {
    question: "What does flattening a PDF do?",
    answer: "Flattening converts all form fields, annotations, and layers into static content. This prevents further editing and ensures the PDF looks the same across all viewers."
  },
  {
    question: "Can I undo flattening?",
    answer: "No, flattening is permanent. Once form fields are flattened, they become regular text and can't be made editable again. Always keep a backup of your original PDF."
  },
  {
    question: "When should I flatten a PDF?",
    answer: "Flatten PDFs before final distribution, when submitting official documents, or when you want to prevent recipients from editing form fields or annotations."
  },
];

export default function PdfFlatten() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelected = useCallback((files: File[]) => {
    const pdf = files.find(f => f.type === "application/pdf");
    if (pdf) { setPdfFile(pdf); setError(null); }
  }, []);

  const handleFlatten = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const pdfData = new Uint8Array(await pdfFile.arrayBuffer());
      const worker = new Worker(new URL("../../workers/pdf-flatten.worker.ts", import.meta.url), { type: "module" });
      const flattenWorker = Comlink.wrap<any>(worker);

      const result = await flattenWorker.flatten(pdfData, Comlink.proxy((p: number) => setProgress(p)));

      const blob = new Blob([result], { type: "application/pdf" });
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      saveAs(blob, `${baseName}_flattened.pdf`);

      worker.terminate();
    } catch (err) {
      console.error("Flatten error:", err);
      setError(err instanceof Error ? err.message : "Failed to flatten PDF");
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  return (
    <div className="w-full">
      <div className="hidden sm:block fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02]" />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        <ToolHeader
          title={{ main: "PDF", highlight: "Flatten" }}
          subtitle="Make PDF forms and annotations non-editable by flattening all interactive elements."
          badge={{ text: "Flatten PDF Forms", icon: Layers }}
          features={features}
        />

        <div className="space-y-6">
          {error && (
            <div className="px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /><span className="text-sm">{error}</span>
            </div>
          )}

          <div className="rounded-2xl p-6 bg-card/30 border border-border/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Layers className="w-5 h-5" />What happens when you flatten?
            </h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Form fields become static text and can't be edited</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Annotations and comments are merged into the page</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>All layers are combined into a single layer</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>The PDF will look identical but won't be editable</span>
              </li>
            </ul>
          </div>

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
                  <span className="text-sm text-muted-foreground">Flatten forms and annotations</span>
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
                <Button variant="ghost" size="sm" onClick={() => setPdfFile(null)}>Remove</Button>
              </div>

              <Button onClick={handleFlatten} disabled={isProcessing} className="w-full" size="lg">
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Flattening... {Math.round(progress)}%</>
                ) : (
                  <><Layers className="w-4 h-4 mr-2" />Flatten PDF</>
                )}
              </Button>
            </div>
          )}

          <div className="mt-12 pt-12 border-t"><RelatedTools tools={relatedTools} direction="horizontal" /></div>
          <div className="mt-12"><FAQ items={faqs} /></div>
        </div>
      </section>
    </div>
  );
}
