import React from "react";
import { FileArchive, Package, Shield, Zap } from "lucide-react";

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
    icon: Package,
    text: "TAR family",
    description: "TAR, TAR.GZ, TAR.BZ2, TAR.XZ, TAR.ZST",
  },
];

const relatedTools: RelatedTool[] = [
  {
    id: "tar-create",
    name: "Create TAR",
    description: "Create TAR archives",
    icon: Package,
  },
  {
    id: "zip-extract",
    name: "Extract ZIP",
    description: "Extract ZIP archives",
    icon: FileArchive,
  },
  {
    id: "multi-extract",
    name: "Universal Extractor",
    description: "Extract any archive format",
    icon: FileArchive,
  },
];

const faqs: FAQItem[] = [
  {
    question: "Which TAR variants are supported?",
    answer:
      "We support classic TAR as well as compressed variants like TAR.GZ, TAR.BZ2, TAR.XZ, and TAR.ZST, all running locally in your browser.",
  },
  {
    question: "Can I open initramfs or package archives?",
    answer:
      "Yes, initramfs and many Linux package archives are TAR-based. Drop them in to inspect their contents instantly.",
  },
  {
    question: "Is password protection supported?",
    answer:
      "Standard TAR archives are not encrypted, but if you encounter encrypted TAR-based files we will prompt you for the password when supported.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Everything runs locally in your browser, so your archives never leave your device.",
  },
];

const ACCEPTED_EXTENSIONS = ".tar,.tgz,.tar.gz,.tar.bz2,.tbz,.tbz2,.tar.xz,.txz,.tar.zst,.tzst";

export default function TarExtract() {
  return (
    <GenericArchiveExtractor
      format="tar"
      formatName="TAR"
      formatDescription="View and extract TAR archives and their compressed variants right in your browser."
      acceptedExtensions={ACCEPTED_EXTENSIONS}
      icon={Package}
      features={features}
      faqs={faqs}
      relatedTools={relatedTools}
    />
  );
}

