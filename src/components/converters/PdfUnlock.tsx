import React, { useState, useCallback } from "react";
import { AlertCircle, Shield, Zap, Loader2, Unlock, Eye, EyeOff } from "lucide-react";
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
  { icon: Zap, text: "Lightning fast", description: "Instant unlock" },
  { icon: Unlock, text: "Remove protection", description: "Access locked PDFs" },
];

const relatedTools: RelatedTool[] = [
  { id: "pdf-protect", name: "PDF Protect", description: "Add password protection", icon: FaRegFilePdf },
  { id: "pdf-compress", name: "PDF Compress", description: "Reduce file size", icon: FaRegFilePdf },
  { id: "pdf-merge", name: "PDF Merge", description: "Combine PDFs", icon: FaRegFilePdf },
];

const faqs: FAQItem[] = [
  {
    question: "Can I unlock any password-protected PDF?",
    answer: "You can only unlock PDFs if you know the correct password. This tool doesn't crack or bypass passwords - it simply removes protection from PDFs you have authorized access to."
  },
  {
    question: "Will the content be affected?",
    answer: "No, unlocking only removes the password protection. All content, formatting, images, and metadata remain exactly as they were in the original PDF."
  },
  {
    question: "Is it legal to unlock PDFs?",
    answer: "Unlocking PDFs is legal when you have the password and proper authorization. Only unlock PDFs you own or have permission to access."
  },
];

export default function PdfUnlock() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleFileSelected = useCallback((files: File[]) => {
    const pdf = files.find(f => f.type === "application/pdf");
    if (pdf) { setPdfFile(pdf); setError(null); }
  }, []);

  const handleUnlock = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const worker = new Worker(new URL("../../workers/pdf-protect.worker.ts", import.meta.url), { type: "module" });

    try {
      const pdfData = new Uint8Array(await pdfFile.arrayBuffer());
      const unlockWorker = Comlink.wrap<any>(worker);

      const result = await unlockWorker.unlock(pdfData, password, Comlink.proxy((p: number) => setProgress(p)));

      const blob = new Blob([result], { type: "application/pdf" });
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      saveAs(blob, `${baseName}_unlocked.pdf`);

      setPassword("");
    } catch (err) {
      console.error("Unlock error:", err);
      setError(err instanceof Error ? err.message : "Failed to unlock PDF. Check your password.");
    } finally {
      worker.terminate();
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
          title={{ main: "PDF", highlight: "Unlock" }}
          subtitle="Remove password protection from your PDF documents when you have authorization."
          badge={{ text: "Unlock PDF Online", icon: Unlock }}
          features={features}
        />

        <div className="space-y-6">
          {error && (
            <div className="px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /><span className="text-sm">{error}</span>
            </div>
          )}

          <div className="rounded-2xl p-6 bg-card/30 border border-border/50 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Unlock className="w-5 h-5" />Password
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">PDF Password (if required)</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-12 rounded-lg border border-border bg-background"
                  placeholder="Enter PDF password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Leave blank if the PDF has no password</p>
              <p className="text-xs text-muted-foreground">Unlocking runs locally; provide the correct password to decrypt.</p>
            </div>
          </div>

          {!pdfFile ? (
            <FileDropZone
              onFilesSelected={handleFileSelected}
              accept="application/pdf"
              multiple={false}
              title="Drop your protected PDF here"
              subtitle="or click to browse"
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

              <Button onClick={handleUnlock} disabled={isProcessing} className="w-full" size="lg">
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Unlocking... {Math.round(progress)}%</>
                ) : (
                  <><Unlock className="w-4 h-4 mr-2" />Unlock PDF</>
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
