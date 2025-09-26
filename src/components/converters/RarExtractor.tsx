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
    text: "RAR v4 & v5",
    description: "Supports both versions",
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
    id: "7z-extract",
    name: "Extract 7-Zip",
    description: "Extract 7Z archives",
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
    question: "What is a RAR file?",
    answer:
      "RAR is a proprietary archive format that offers excellent compression ratios. RAR v5 is the latest version with improved compression, larger archive sizes, and better recovery records.",
  },
  {
    question: "Is it safe to extract RAR files online?",
    answer:
      "Yes, all extraction happens in your browser. Files are never uploaded to any server, ensuring complete privacy and security.",
  },
  {
    question: "What's the difference between RAR v4 and v5?",
    answer:
      "RAR v5 offers better compression, supports larger files (up to 8 exabytes), has improved recovery records, and uses AES-256 encryption. RAR v4 is limited to 4GB files.",
  },
  {
    question: "Can I extract password-protected RAR archives?",
    answer:
      "Yes! Enter the password when prompted and we'll unlock the archive entirely in your browser.",
  },
];

export default function RarExtractor() {
  return (
    <GenericArchiveExtractor
      format="rar"
      formatName="RAR"
      formatDescription="Extract RAR archives of any version directly in your browser."
      acceptedExtensions=".rar"
      icon={FileArchive}
      features={features}
      faqs={faqs}
      relatedTools={relatedTools}
    />
  );
}
