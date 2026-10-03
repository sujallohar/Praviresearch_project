import React, { useState, useEffect } from 'react';
import { 
  Download, Smartphone, Share, PlusSquare, 
  X, CheckCircle2, ShieldCheck, Monitor
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if already installed in standalone display mode
    const standaloneCheck = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');
    
    setIsStandalone(standaloneCheck);

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // 3. Listen for Chrome / Android beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Check if user previously dismissed in this session
      const dismissed = sessionStorage.getItem('govasset_pwa_dismissed');
      if (!dismissed && !standaloneCheck) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 4. Listen for app installed event
    const handleAppInstalled = () => {
      setIsStandalone(true);
      setShowBanner(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Global listener for any "Install App" button clicked in the app
    const handleCustomOpen = () => {
      if (isIosDevice && !standaloneCheck) {
        setShowIosModal(true);
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            setShowBanner(false);
          }
          setDeferredPrompt(null);
        });
      } else {
        // Fallback for desktop or non-prompting browsers
        setShowIosModal(true);
      }
    };

    window.addEventListener('govasset:open-install', handleCustomOpen);

    // If iOS and not standalone, show banner gently after 3 seconds if not dismissed
    if (isIosDevice && !standaloneCheck) {
      const dismissed = sessionStorage.getItem('govasset_pwa_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => setShowBanner(true), 3000);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('govasset:open-install', handleCustomOpen);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      setShowIosModal(true);
      return;
    }

    // Trigger native browser install dialog
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      sessionStorage.setItem('govasset_pwa_dismissed', 'true');
    } catch {
      // Ignore
    }
  };

  if (isStandalone && !installedSuccess) {
    return null;
  }

  return (
    <>
      {/* Installation Success Toast */}
      {installedSuccess && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5" />
          <div>
            <p className="text-xs font-bold">GovAsset 360 App Installed!</p>
            <p className="text-[11px] text-emerald-100">You can now launch directly from your home screen or dock.</p>
          </div>
        </div>
      )}

      {/* Floating Bottom Installation Banner */}
      {showBanner && !isStandalone && (
        <div className="fixed bottom-16 lg:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-blue-500/40 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="flex items-start gap-3">
            {/* Custom App Icon Preview */}
            <div className="relative shrink-0">
              <img 
                src="/icon-192.png" 
                alt="GovAsset 360 App Icon" 
                className="w-12 h-12 rounded-xl object-cover border border-amber-400/40 shadow-md"
                onError={(e) => {
                  // Fallback to SVG if PNG loading
                  (e.target as HTMLImageElement).src = '/icon-192.svg';
                }}
              />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white ring-1 ring-slate-900">
                ✓
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-bold text-sm text-white">Install GovAsset 360</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                  FREE
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight mb-2.5">
                Install as a standalone native app on your phone or desktop. Works offline, fast launch, 0 store fees.
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-1.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download / Install</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
                  aria-label="Dismiss install banner"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* iOS / General Add to Home Screen Instructions Modal */}
      {showIosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img 
                  src="/icon-192.png" 
                  alt="App Icon" 
                  className="w-8 h-8 rounded-lg border border-amber-400/40"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/icon-192.svg';
                  }}
                />
                <div>
                  <h4 className="font-bold text-sm text-white">Install on Mobile / Desktop</h4>
                  <p className="text-[10px] text-slate-400">Direct Web Installation • 100% Free</p>
                </div>
              </div>
              <button 
                onClick={() => setShowIosModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Instruction Steps */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              {isIos ? (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Follow these 2 quick steps in Safari on your iPhone or iPad:</span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Tap the <span className="inline-flex items-center gap-1 font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"><Share className="w-3 h-3" /> Share</span> button in Safari's bottom toolbar.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        Scroll down and tap <span className="inline-flex items-center gap-1 font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300"><PlusSquare className="w-3 h-3 text-slate-700" /> Add to Home Screen</span>.
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        GovAsset 360 will appear as a standalone app with the official gold & emerald shield icon on your phone!
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 flex items-start gap-2">
                    <Monitor className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>Installing on Chrome, Edge, or Android:</span>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold text-slate-900">
                      1. Look for the <span className="font-bold text-blue-600">Install icon (⊕)</span> in your browser's address bar.
                    </p>
                    <p className="font-semibold text-slate-900">
                      2. Or open the browser menu (⋮) and tap <span className="font-bold text-slate-800">"Install app"</span> or <span className="font-bold text-slate-800">"Add to Home screen"</span>.
                    </p>
                    <p className="text-[11px] text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      No Google Play or Apple App Store account needed. Launches instantly in full-screen mode with offline caching enabled!
                    </p>
                  </div>
                </>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Standalone PWA
                </span>
                <button
                  onClick={() => setShowIosModal(false)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold transition-colors"
                >
                  Got It
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
