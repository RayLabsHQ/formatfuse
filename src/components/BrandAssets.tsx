import React, { useRef } from 'react';
import AnimatedLogoWrapper from './AnimatedLogoWrapper';
import type { AnimatedLogoWrapperRef } from './AnimatedLogoWrapper';
import StaticLogo from './StaticLogo';
import { RotateCw } from 'lucide-react';

export default function BrandAssets() {
  const logoRefs = useRef<(AnimatedLogoWrapperRef | null)[]>([]);

  const replayAllAnimations = () => {
    logoRefs.current.forEach(ref => {
      if (ref) {
        ref.replay();
      }
    });
  };

  const setLogoRef = (index: number) => (ref: AnimatedLogoWrapperRef | null) => {
    logoRefs.current[index] = ref;
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-3xl font-bold">FormatFuse Brand Assets</h1>
          <button
            onClick={replayAllAnimations}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 ff-transition flex items-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            Replay Animations
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Default size */}
          <div className="bg-card p-8 rounded-xl border border-border">
            <h2 className="text-lg font-semibold mb-4">Default Size</h2>
            <div className="flex justify-center">
              <AnimatedLogoWrapper ref={setLogoRef(0)} className="w-32 h-32" />
            </div>
          </div>
          
          {/* Large size */}
          <div className="bg-card p-8 rounded-xl border border-border">
            <h2 className="text-lg font-semibold mb-4">Large Size</h2>
            <div className="flex justify-center">
              <AnimatedLogoWrapper ref={setLogoRef(1)} className="w-48 h-48" />
            </div>
          </div>
          
          {/* On dark background */}
          <div className="bg-black p-8 rounded-xl">
            <h2 className="text-lg font-semibold mb-4 text-white">Dark Background</h2>
            <div className="flex justify-center">
              <AnimatedLogoWrapper ref={setLogoRef(2)} className="w-32 h-32" />
            </div>
          </div>
          
          {/* On light background */}
          <div className="bg-white p-8 rounded-xl">
            <h2 className="text-lg font-semibold mb-4 text-black">Light Background</h2>
            <div className="flex justify-center">
              <AnimatedLogoWrapper ref={setLogoRef(3)} className="w-32 h-32" />
            </div>
          </div>
          
          {/* With text */}
          <div className="bg-card p-8 rounded-xl border border-border md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">With Brand Name</h2>
            <div className="flex items-center justify-center gap-4">
              <AnimatedLogoWrapper ref={setLogoRef(4)} className="w-16 h-16" />
              <span className="text-3xl font-bold bg-gradient-to-r from-[#9b30ff] to-[#3f00ff] bg-clip-text text-transparent">
                FormatFuse
              </span>
            </div>
          </div>
          
          {/* Small icon size */}
          <div className="bg-card p-8 rounded-xl border border-border md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Icon Sizes</h2>
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <AnimatedLogoWrapper ref={setLogoRef(5)} className="w-8 h-8 mb-2" />
                <span className="text-xs text-muted-foreground">32px</span>
              </div>
              <div className="text-center">
                <AnimatedLogoWrapper ref={setLogoRef(6)} className="w-12 h-12 mb-2" />
                <span className="text-xs text-muted-foreground">48px</span>
              </div>
              <div className="text-center">
                <AnimatedLogoWrapper ref={setLogoRef(7)} className="w-16 h-16 mb-2" />
                <span className="text-xs text-muted-foreground">64px</span>
              </div>
              <div className="text-center">
                <AnimatedLogoWrapper ref={setLogoRef(8)} className="w-24 h-24 mb-2" />
                <span className="text-xs text-muted-foreground">96px</span>
              </div>
            </div>
          </div>
          
          {/* Static vs Animated comparison */}
          <div className="bg-card p-8 rounded-xl border border-border md:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Static vs Animated</h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <StaticLogo className="w-32 h-32 mx-auto mb-2" />
                <span className="text-sm text-muted-foreground">Static (lightweight)</span>
              </div>
              <div className="text-center">
                <AnimatedLogoWrapper ref={setLogoRef(9)} className="w-32 h-32 mx-auto mb-2" />
                <span className="text-sm text-muted-foreground">Animated (framer-motion)</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="text-muted-foreground mb-4">
            The FormatFuse logo represents file conversion through a document morphing into pixels.
          </p>
          <a href="/" className="text-primary hover:underline">← Back to Home</a>
        </div>
      </div>
    </main>
  );
}