import React from 'react';
import { ArrowRight, Zap, Shield, Infinity } from 'lucide-react';

export default function Hero() {
  const [activeDemo, setActiveDemo] = React.useState('pdf');
  
  const demos = {
    pdf: { from: 'PDF', to: 'Word', color: 'text-tool-pdf' },
    image: { from: 'PNG', to: 'JPG', color: 'text-tool-jpg' },
    doc: { from: 'DOCX', to: 'PDF', color: 'text-tool-doc' },
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 ff-grid opacity-[0.03]" />
      
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Convert files at
              <span className="block text-primary">machine speed</span>
            </h1>
            
            <p className="mt-6 text-lg text-muted-foreground max-w-lg">
              No uploads. No waiting. No limits. Transform your files instantly with browser-based converters that respect your privacy.
            </p>
            
            {/* Quick Stats */}
            <div className="mt-8 flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm font-medium">100% Private</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-accent" />
                <span className="text-sm font-medium">Instant Processing</span>
              </div>
              <div className="flex items-center gap-2">
                <Infinity className="w-5 h-5 text-tool-pdf" />
                <span className="text-sm font-medium">No File Limits</span>
              </div>
            </div>
            
            {/* CTA Buttons */}
            <div className="mt-10 flex flex-wrap gap-4">
              <a 
                href="/convert/pdf-to-word" 
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground font-medium rounded-md hover:opacity-90 ff-transition"
              >
                Try PDF to Word
                <ArrowRight className="ml-2 w-4 h-4" />
              </a>
              <a 
                href="#tools"
                className="inline-flex items-center px-6 py-3 bg-secondary text-foreground font-medium rounded-md hover:bg-secondary/[0.8] ff-transition"
              >
                Browse Popular Tools
              </a>
            </div>
          </div>
          
          {/* Interactive Demo */}
          <div className="relative">
            {/* File Conversion Visual */}
            <div className="bg-card rounded-lg ff-shadow-tool p-8">
              <div className="flex items-center justify-between">
                {/* Source File */}
                <div className="text-center">
                  <div className={`w-20 h-20 rounded-lg bg-secondary flex items-center justify-center mb-3 ${demos[activeDemo].color}`}>
                    <span className="text-2xl font-bold">{demos[activeDemo].from}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Input</span>
                </div>
                
                {/* Arrow Animation */}
                <div className="flex-1 px-8">
                  <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-primary rounded-full w-full transform origin-left scale-x-100" 
                         style={{
                           animation: 'none',
                           transition: 'none'
                         }} />
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-xs text-muted-foreground font-mono">0ms processing</span>
                  </div>
                </div>
                
                {/* Target File */}
                <div className="text-center">
                  <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center mb-3 text-accent">
                    <span className="text-2xl font-bold">{demos[activeDemo].to}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Output</span>
                </div>
              </div>
              
              {/* Demo Selector */}
              <div className="mt-8 flex justify-center gap-2">
                {Object.entries(demos).map(([key, demo]) => (
                  <button
                    key={key}
                    onClick={() => setActiveDemo(key)}
                    className={`px-4 py-2 text-sm rounded-md ff-transition ${
                      activeDemo === key 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-secondary hover:bg-secondary/[0.8]'
                    }`}
                  >
                    {demo.from} → {demo.to}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/[0.1] rounded-full blur-2xl" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/[0.1] rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
}