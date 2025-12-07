import React, { useState, useCallback } from "react";
import {
  Download,
  AlertCircle,
  Shield,
  Zap,
  Loader2,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";
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
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Instant protection" },
  {
    icon: Lock,
    text: "Secure",
    description: "Password protection",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "pdf-unlock",
    name: "PDF Unlock",
    description: "Remove password protection",
    icon: FaRegFilePdf,
  },
  {
    id: "pdf-watermark",
    name: "PDF Watermark",
    description: "Add watermarks",
    icon: FaRegFilePdf,
  },
  {
    id: "pdf-compress",
    name: "PDF Compress",
    description: "Reduce file size",
    icon: FaRegFilePdf,
  },
];

const faqs: FAQItem[] = [
  {
    question: "How secure is PDF password protection?",
    answer:
      "PDF password protection is a standard security feature. However, no encryption is unbreakable. For highly sensitive documents, consider using additional encryption methods or secure document management systems.",
  },
  {
    question: "Can I remove the password later?",
    answer:
      "Yes, you can use the PDF Unlock tool to remove password protection if you know the password. You'll need to provide the correct password to unlock and save an unprotected version.",
  },
  {
    question: "What's the difference between user and owner passwords?",
    answer:
      "User password is required to open and view the PDF. Owner password allows full access including editing, printing, and changing permissions. You can set both for maximum control.",
  },
  {
    question: "Does this work on all PDF viewers?",
    answer:
      "Yes, password-protected PDFs follow the PDF standard and work with all major PDF viewers including Adobe Reader, Chrome, Firefox, Safari, and mobile apps.",
  },
];

export default function PdfProtect() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleFileSelected = useCallback((files: File[]) => {
    const pdf = files.find((file) => file.type === "application/pdf");
    if (pdf) {
      setPdfFile(pdf);
      setError(null);
    }
  }, []);

  const handleProtect = async () => {
    if (!pdfFile || !password.trim()) {
      setError("Please provide a password");
      return;
    }

    if (password.length < 4) {
      setError("Password must be at least 4 characters");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    const worker = new Worker(
      new URL("../../workers/pdf-protect.worker.ts", import.meta.url),
      { type: "module" },
    );

    try {
      const pdfData = new Uint8Array(await pdfFile.arrayBuffer());

      const protectWorker = Comlink.wrap<any>(worker);

      const result = await protectWorker.protect(
        pdfData,
        { userPassword: password },
        Comlink.proxy((p: number) => setProgress(p)),
      );

      const blob = new Blob([result], { type: "application/pdf" });
      const baseName = pdfFile.name.replace(/\.pdf$/i, "");
      saveAs(blob, `${baseName}_protected.pdf`);

      setPassword("");
    } catch (err) {
      console.error("Protection error:", err);
      setError(err instanceof Error ? err.message : "Failed to protect PDF");
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
        <div className="absolute top-1/2 -translate-y-1/2 right-10 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-blob animation-delay-2000" />
      </div>

      <section className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:px-8 lg:py-6 relative z-10">
        <ToolHeader
          title={{ main: "PDF", highlight: "Protect" }}
          subtitle="Add password protection to your PDF documents to prevent unauthorized access."
          badge={{ text: "Protect PDF Online", icon: Lock }}
          features={features}
        />

        <div className="space-y-6">
          {error && (
            <div className="px-4 py-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Password Settings */}
          <div className="rounded-2xl p-6 bg-card/30 border border-border/50 space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Password Protection
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 pr-12 rounded-lg border border-border bg-background"
                  placeholder="Enter a secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a strong password with at least 4 characters
              </p>
            </div>

            <div className="p-3 bg-muted/30 rounded-lg space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note:</strong> Protection runs locally in your browser using AES-256. Keep this password safe—we can&apos;t recover it for you.
              </p>
              <p className="text-xs text-muted-foreground">
                Owner password matches the user password for compatibility. Use the Unlock tool later to remove protection.
              </p>
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
                    Add password protection
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
                onClick={handleProtect}
                disabled={isProcessing || !password.trim()}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Protecting PDF... {Math.round(progress)}%
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Protect PDF
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="mt-12 pt-12 border-t">
            <RelatedTools tools={relatedTools} direction="horizontal" />
          </div>

          <div className="mt-12">
            <FAQ items={faqs} />
          </div>
        </div>
      </section>
    </div>
  );
}
