import { useRegisterSW } from 'virtual:pwa-register/react';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log('SW registered:', swUrl);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const [showOfflineReady, setShowOfflineReady] = useState(false);

  useEffect(() => {
    if (offlineReady) {
      setShowOfflineReady(true);
      setTimeout(() => {
        setShowOfflineReady(false);
        setOfflineReady(false);
      }, 4000);
    }
  }, [offlineReady, setOfflineReady]);

  const close = () => {
    setNeedRefresh(false);
  };

  return (
    <>
      {/* Update available prompt */}
      {needRefresh && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom duration-300">
          <div className="bg-card border rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">Update Available!</h3>
                <p className="text-sm text-muted-foreground">
                  A new version of FormatFuse is available with improvements and new features.
                </p>
              </div>
              <button
                onClick={close}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => updateServiceWorker(true)}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                Update now
              </button>
              <button
                onClick={close}
                className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/80 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Offline ready notification */}
      {showOfflineReady && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom duration-300">
          <div className="bg-card border rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm">FormatFuse is ready to work offline!</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}