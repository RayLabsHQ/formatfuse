import React from "react";
import { FileArchive, Shield, Zap, Eye } from "lucide-react";

import GenericArchiveExtractor from "./GenericArchiveExtractor";
import type { FAQItem } from "../ui/FAQ";
import type { RelatedTool } from "../ui/RelatedTools";
import type { Feature } from "../ui/ToolHeader";

const features: Feature[] = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Extract instantly" },
  {
    icon: Eye,
    text: "High compression",
    description: "Supports LZMA, LZMA2",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "multi-extract",
    name: "Universal Extractor",
    description: "Extract any archive format",
    icon: FileArchive,
  },
  {
    id: "rar-extract",
    name: "Extract RAR",
    description: "Extract RAR archives",
    icon: FileArchive,
  },
  {
    id: "zip-extract",
    name: "Extract ZIP",
    description: "Extract ZIP archives",
    icon: FileArchive,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What is a 7Z file?",
    answer:
      "7Z is a compressed archive format that provides high compression ratios using LZMA and LZMA2 compression methods. It's commonly used for large files and software distributions.",
  },
  {
    question: "Is it safe to extract 7Z files online?",
    answer:
      "Yes, all extraction happens in your browser. Files are never uploaded to any server, ensuring complete privacy and security.",
  },
  {
    question: "What compression methods does 7Z support?",
    answer:
      "7Z primarily uses LZMA and LZMA2 compression, but also supports PPMD, BCJ, BCJ2, BZip2, and Deflate methods for optimal compression.",
  },
  {
    question: "Can I extract password-protected 7Z archives?",
    answer:
      "Yes! Enter the password when prompted and we'll unlock the archive entirely in your browser.",
  },
];

export default function SevenZipExtractor() {
  return (
    <GenericArchiveExtractor
      format="7z"
      formatName="7Z"
      formatDescription="Extract 7Z archives in seconds directly in your browser."
      acceptedExtensions=".7z,.001"
      icon={FileArchive}
      features={features}
      faqs={faqs}
      relatedTools={relatedTools}
    />
  );
}
