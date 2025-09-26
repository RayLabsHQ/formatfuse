import React from "react";
import { FileArchive, Package, Shield, Zap, Eye } from "lucide-react";

import GenericArchiveExtractor from "./GenericArchiveExtractor";
import type { Feature } from "../ui/ToolHeader";
import type { FAQItem } from "../ui/FAQ";
import type { RelatedTool } from "../ui/RelatedTools";

const features: Feature[] = [
  {
    icon: Shield,
    text: "Privacy-first",
    description: "Files never leave your device",
  },
  { icon: Zap, text: "Lightning fast", description: "Extract instantly" },
  {
    icon: Eye,
    text: "Multiple formats",
    description: "7Z, RAR, TAR, and more",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "zip-extract",
    name: "Extract ZIP",
    description: "Extract ZIP archives",
    icon: FileArchive,
  },
  {
    id: "tar-extract",
    name: "Extract TAR",
    description: "Extract TAR archives",
    icon: Package,
  },
  {
    id: "create-zip",
    name: "Create ZIP",
    description: "Create ZIP archives",
    icon: FileArchive,
  },
];

const faqs: FAQItem[] = [
  {
    question: "What formats does this tool support?",
    answer:
      "This tool supports 7Z, RAR, ZIP, TAR, GZIP, BZIP2, XZ, and many other archive formats thanks to our multi-engine pipeline.",
  },
  {
    question: "Is it safe to extract archives online?",
    answer:
      "Yes, everything runs inside your browser. No files are uploaded or stored on our servers.",
  },
  {
    question: "What's the maximum file size?",
    answer:
      "Most browsers comfortably handle archives up to a couple of gigabytes. Larger files depend on your device's memory limits.",
  },
  {
    question: "Can I extract password-protected archives?",
    answer:
      "Yes—enter the password when prompted and we'll unlock the archive entirely in your browser.",
  },
];

export default function UniversalExtractor() {
  return (
    <GenericArchiveExtractor
      format="multi"
      formatName="Universal"
      formatDescription="Extract almost any archive format instantly—ZIP, RAR, 7Z, TAR, and more—all in your browser."
      acceptedExtensions=".zip,.rar,.7z,.tar,.gz,.bz2,.xz,.iso,.cab,.cpio,.ar,.lha"
      icon={FileArchive}
      features={features}
      faqs={faqs}
      relatedTools={relatedTools}
    />
  );
}
