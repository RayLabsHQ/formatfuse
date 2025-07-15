import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // iOS doesn't support beforeinstallprompt, but we can show instructions
      const visits = parseInt(localStorage.getItem('ff_visits') || '0') + 1;
      localStorage.setItem('ff_visits', visits.toString());
      
      if (visits >= 3 && !localStorage.getItem('ff_ios_install_dismissed')) {
        setTimeout(() => setShowInstallPrompt(true), 2000);
      }
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      
      // Show prompt after 3 page views
      const visits = parseInt(localStorage.getItem('ff_visits') || '0') + 1;
      localStorage.setItem('ff_visits', visits.toString());
      
      if (visits >= 3 && !localStorage.getItem('ff_install_dismissed')) {
        setTimeout(() => setShowInstallPrompt(true), 2000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
      localStorage.setItem('ff_visits', '0');
    }
    
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    // Don't show again for 7 days
    localStorage.setItem('ff_install_dismissed', Date.now().toString());
    
    // For iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      localStorage.setItem('ff_ios_install_dismissed', 'true');
    }
  };

  if (!showInstallPrompt || isInstalled) return null;

  // iOS-specific instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (isIOS) {
    return (
      <div className="fixed bottom-20 right-4 z-40 max-w-sm animate-in slide-in-from-bottom duration-300">
        <div className="bg-card border rounded-lg shadow-lg p-4">
          <div className="flex items-start gap-3 mb-3">
            <img src="/pwa-64x64.png" alt="FormatFuse" className="w-12 h-12 rounded-lg" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Install FormatFuse</h3>
              <p className="text-sm text-muted-foreground">
                Add to Home Screen for quick access
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>1. Tap the share button <span className="inline-block w-4 h-4 align-middle">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 5l-1.42 1.42-1.59-1.59V16h-2V4.83L9.42 6.42 8 5l4-4 4 4z"/>
                <path d="M20 10v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V10h2v10h12V10h2z"/>
              </svg>
            </span></p>
            <p>2. Select "Add to Home Screen"</p>
          </div>
        </div>
      </div>
    );
  }

  // Standard install prompt
  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 right-4 z-40 max-w-sm animate-in slide-in-from-bottom duration-300">
      <div className="bg-card border rounded-lg shadow-lg p-4">
        <div className="flex items-start gap-3 mb-3">
          <img src="/pwa-64x64.png" alt="FormatFuse" className="w-12 h-12 rounded-lg" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Install FormatFuse</h3>
            <p className="text-sm text-muted-foreground">
              Install our app for faster access and offline use
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleInstall}
            className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}