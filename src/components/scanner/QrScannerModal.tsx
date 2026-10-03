import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  Camera, X, FlipHorizontal, ArrowRight, 
  CheckCircle2, AlertTriangle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface QrScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess?: (assetId: string) => void;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const navigate = useNavigate();
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scannedAssetId, setScannedAssetId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = 'govasset-qr-reader';

  // Haptic feedback & audio beep
  const triggerScanFeedback = () => {
    // 1. Haptic vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([80, 50, 80]);
    }
    // 2. Web Audio API beep
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880; // A5 note
        gain.gain.value = 0.15;
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 120);
      }
    } catch {
      // Audio not permitted or supported
    }
  };

  // Parse asset ID from scan result
  const extractAssetId = (decodedText: string): string => {
    // Format 1: govasset360://asset/{assetId}
    if (decodedText.startsWith('govasset360://asset/')) {
      const parts = decodedText.replace('govasset360://asset/', '').split('?');
      return parts[0];
    }
    // Format 2: https://govasset-360.web.app/assets/{assetId}
    if (decodedText.includes('/assets/')) {
      const parts = decodedText.split('/assets/')[1].split('?')[0].split('/')[0];
      return parts;
    }
    // Format 3: Plain ID
    return decodedText.trim();
  };

  // Start QR camera scanner
  const startScanner = async () => {
    try {
      setErrorMsg(null);
      setScannedAssetId(null);

      // Clean up previous instance
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch {
          // Ignore
        }
      }

      const html5QrCode = new Html5Qrcode(readerElementId);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          triggerScanFeedback();
          const parsedId = extractAssetId(decodedText);
          setScannedAssetId(parsedId);
          setIsScanning(false);
          // Pause camera on successful scan
          html5QrCode.stop().catch(() => {});
          if (onScanSuccess) {
            onScanSuccess(parsedId);
          }
        },
        () => {
          // Frame error (normal when no QR code in view)
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.warn('Failed to start QR scanner:', err);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : 'Unable to start camera stream. Check if camera is in use by another application.'
      );
      setIsScanning(false);
    }
  };

  // Stop scanner safely
  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to allow DOM element to render
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
      setScannedAssetId(null);
    }
  }, [isOpen, facingMode]);

  if (!isOpen) return null;

  const handleNavigateToAsset = () => {
    if (!scannedAssetId) return;
    onClose();
    navigate(`/assets/${scannedAssetId}`);
  };

  const handleRescan = () => {
    setScannedAssetId(null);
    startScanner();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl shadow-inner">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Asset QR Tag Scanner</h3>
              <p className="text-xs text-slate-400">On-site physical badge verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Camera Section */}
        <div className="p-5 flex flex-col items-center">
          <div className="relative w-full aspect-square max-w-xs bg-black rounded-2xl overflow-hidden border-2 border-slate-700 shadow-inner flex items-center justify-center">
            
            {/* HTML5 QR Container */}
            <div id={readerElementId} className="w-full h-full" />

            {/* Viewfinder Reticle & Laser Sweep Animation */}
            {isScanning && !scannedAssetId && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                {/* Center target boundary */}
                <div className="w-48 h-48 border-2 border-dashed border-blue-400/70 rounded-xl relative overflow-hidden">
                  {/* Animated laser sweep */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_#38bdf8] animate-bounce" />
                </div>
              </div>
            )}

            {/* Scanned Success Overlay */}
            {scannedAssetId && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  Tag Verified On-Site
                </span>
                <h4 className="font-mono text-lg font-bold text-white mb-2 break-all">
                  {scannedAssetId}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs">
                  Physical laminate badge recognized. Ready for structural audit or maintenance dispatch.
                </p>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && !scannedAssetId && (
              <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-4 text-center">
                <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
                <p className="text-xs text-slate-300 max-w-xs">{errorMsg}</p>
                <button
                  onClick={startScanner}
                  className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  Retry Camera
                </button>
              </div>
            )}
          </div>

          {/* Camera Controls */}
          {!scannedAssetId && (
            <div className="flex items-center justify-between w-full max-w-xs mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Align QR inside reticle
              </span>
              <button
                onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
              >
                <FlipHorizontal className="w-3.5 h-3.5" /> Flip Camera
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between gap-3">
          {scannedAssetId ? (
            <>
              <button
                onClick={handleRescan}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Scan Another
              </button>
              <button
                onClick={handleNavigateToAsset}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
              >
                <span>View Asset Records</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <div className="w-full text-center text-xs text-slate-500">
              Point phone camera directly at the physical infrastructure badge
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
