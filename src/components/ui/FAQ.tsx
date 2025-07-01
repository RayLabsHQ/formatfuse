import React from 'react';
import { HelpCircle } from 'lucide-react';
import { CollapsibleSection } from './mobile/CollapsibleSection';

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQProps {
  items: FAQItem[];
  title?: string;
  className?: string;
}

export function FAQ({ items, title = "Frequently Asked Questions", className = "" }: FAQProps) {
  return (
    <div className={className}>
      <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <HelpCircle className="w-6 h-6 text-primary" />
        {title}
      </h2>
      
      {/* Desktop Grid - Always expanded */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        {items.map((faq, index) => (
          <div 
            key={`faq-desktop-${index}`}
            className="rounded-xl bg-card/30 backdrop-blur-sm border border-border/50 p-6"
          >
            <h3 className="font-medium text-base mb-3">{faq.question}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {faq.answer}
            </p>
          </div>
        ))}
      </div>
      
      {/* Mobile Stack - Collapsible */}
      <div className="md:hidden space-y-4">
        {items.map((faq, index) => (
          <CollapsibleSection
            key={`faq-mobile-${index}`}
            title={faq.question}
            defaultOpen={false}
          >
            <p className="text-sm text-muted-foreground leading-relaxed">
              {faq.answer}
            </p>
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
}