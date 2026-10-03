import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, Upload, X, AlertTriangle, 
  FlipHorizontal, RefreshCw, Download, CheckCircle2,
  Activity, Eye
} from 'lucide-react';
import { 
  analyzeImageFrame, 
  renderDefectOverlay, 
  type ScanResult,
  SEVERITY_COLORS 
} from '../../lib/visionAi';

interface StructuralDefectScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectForInspection?: (data: { condition: string; findings: string; recommendation: string }) => void;
  onSelectForIssue?: (data: { title: string; severity: string; description: string }) => void;
}

export const StructuralDefectScanner: React.FC<StructuralDefectScannerProps> = ({
  isOpen,
  onClose,
  onSelectForInspection,
  onSelectForIssue
}) => {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Stop camera stream safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  // Start live phone / webcam video stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported on this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('[Camera] Failed to access camera:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera permissions in your browser address bar.'
          : 'Unable to open device camera. You can still upload or snap photos via the Upload tab.'
      );
      setMode('upload');
    }
  }, [facingMode, stopCamera]);

  // Handle continuous analysis loop for live video
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, mode, startCamera, stopCamera]);

  // Frame processing loop
  useEffect(() => {
    if (!isCameraActive || isPaused || mode !== 'camera') return;

    let lastAnalysisTime = 0;

    const processFrame = (currentTime: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (video && canvas && video.readyState >= 2) {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        if (canvas.width !== vw || canvas.height !== vh) {
          canvas.width = vw;
          canvas.height = vh;
        }

        // Run heavy defect detection every 350ms to keep 60 FPS UI smooth
        if (currentTime - lastAnalysisTime > 350) {
          lastAnalysisTime = currentTime;

          if (!offscreenCanvasRef.current) {
            offscreenCanvasRef.current = document.createElement('canvas');
          }
          const offCanvas = offscreenCanvasRef.current;
          offCanvas.width = 320;
          offCanvas.height = 240;
          const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

          if (offCtx) {
            offCtx.drawImage(video, 0, 0, 320, 240);
            const result = analyzeImageFrame(offCanvas, offCtx, 320, 240);
            setScanResult(result);
            renderDefectOverlay(canvas, result.defects, true);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(processFrame);
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isCameraActive, isPaused, mode]);

  // Handle image upload and analyze it
  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setUploadedImageUrl(src);

      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const result = analyzeImageFrame(canvas, ctx, img.width, img.height);
        setScanResult(result);
        renderDefectOverlay(canvas, result.defects, false);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  // Flip between front and rear cameras
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Download snapshot with annotated bounding boxes
  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Composite video / image + canvas overlays
    const compCanvas = document.createElement('canvas');
    compCanvas.width = canvas.width;
    compCanvas.height = canvas.height;
    const ctx = compCanvas.getContext('2d');
    if (!ctx) return;

    if (mode === 'camera' && videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0);
    } else if (uploadedImageUrl) {
      const img = new Image();
      img.src = uploadedImageUrl;
      ctx.drawImage(img, 0, 0);
    }
    ctx.drawImage(canvas, 0, 0);

    const link = document.createElement('a');
    link.download = `GovAsset_AI_Defect_Scan_${Date.now()}.jpg`;
    link.href = compCanvas.toDataURL('image/jpeg', 0.9);
    link.click();
  };

  // Pre-fill formal inspection report
  const handlePreFillInspection = () => {
    if (!scanResult) return;
    const topDefect = scanResult.defects[0];

    onSelectForInspection?.({
      condition: scanResult.overallCondition,
      findings: topDefect 
        ? `Edge AI Vision Scan: Detected ${topDefect.defectType} with ${Math.round(topDefect.confidence * 100)}% confidence. Est area: ${topDefect.metrics.estimatedAreaCm2} cm².`
        : 'Edge AI Vision Scan: Visual structural audit completed. Surface nominal, zero critical defects.',
      recommendation: topDefect ? topDefect.recommendation : 'Continue routine preventative inspection cycle.'
    });
    onClose();
  };

  // Pre-fill citizen / engineer hazard report
  const handlePreFillIssue = () => {
    if (!scanResult) return;
    const topDefect = scanResult.defects[0];

    onSelectForIssue?.({
      title: topDefect ? `[AI Detected] ${topDefect.defectType}` : '[AI Detected] Infrastructure Anomaly',
      severity: topDefect ? (topDefect.severity === 'Moderate' ? 'Medium' : topDefect.severity) : 'Low',
      description: topDefect 
        ? `Automated computer vision scan detected physical anomaly:\n• Category: ${topDefect.category}\n• Defect: ${topDefect.defectType}\n• Severity: ${topDefect.severity} (${Math.round(topDefect.confidence * 100)}% confidence)\n• Suggested Action: ${topDefect.suggestedAction}\n• Engineering Rec: ${topDefect.recommendation}`
        : 'Automated scan recorded nominal infrastructure state.'
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 rounded-xl shadow-inner">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-base sm:text-lg tracking-tight text-white">
                  Edge AI Structural Defect Scanner
                </h2>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Client-Side • 100% Free ($0)
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Real-time computer vision for potholes, concrete fractures, pipe leaks & corrosion
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="bg-slate-950/60 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setMode('camera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'camera'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Camera className="w-3.5 h-3.5" /> Live Camera
            </button>
            <button
              onClick={() => setMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                mode === 'upload'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" /> Upload Photo
            </button>
          </div>

          {mode === 'camera' && isCameraActive && (
            <div className="flex items-center gap-2">
              <button
                onClick={toggleFacingMode}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors"
                title="Switch Camera (Front / Rear)"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Flip</span>
              </button>
              <button
                onClick={() => setIsPaused((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors ${
                  isPaused 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                    : 'bg-amber-600 text-white hover:bg-amber-500'
                }`}
              >
                {isPaused ? 'Resume' : 'Freeze'}
              </button>
            </div>
          )}
        </div>

        {/* Viewport Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <div className="relative w-full aspect-video max-h-[380px] bg-black rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
            
            {/* Camera View Mode */}
            {mode === 'camera' && (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className={`w-full h-full object-contain ${isCameraActive ? 'block' : 'hidden'}`}
                />
                {!isCameraActive && (
                  <div className="text-center p-6 text-slate-400">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
                    <p className="text-sm font-medium">Initializing camera optical stream...</p>
                    {cameraError && (
                      <p className="text-xs text-red-400 mt-2 max-w-sm mx-auto">{cameraError}</p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Photo Upload View Mode */}
            {mode === 'upload' && (
              <>
                {uploadedImageUrl ? (
                  <img
                    src={uploadedImageUrl}
                    alt="Uploaded inspection snapshot"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <label className="flex flex-col items-center justify-center p-8 cursor-pointer text-slate-400 hover:text-blue-400 hover:bg-slate-900/50 transition-colors w-full h-full">
                    <Upload className="w-12 h-12 mb-3 text-slate-500" />
                    <span className="font-semibold text-sm">Select or snap a photo</span>
                    <span className="text-xs text-slate-500 mt-1">Supports JPG, PNG, WEBP</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                    />
                  </label>
                )}
              </>
            )}

            {/* Overlaid Canvas HUD for Bounding Boxes */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Live Status HUD Badge */}
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700 text-[11px] font-mono text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{isPaused ? 'FROZEN' : 'AI ACTIVE'}</span>
              <span className="text-slate-500">•</span>
              <span>{scanResult?.defects.length || 0} ANOMALIES</span>
            </div>
          </div>

          {/* Diagnosis & Findings Panel */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-200">Automated Vision Diagnosis</h3>
              </div>
              {scanResult && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                  scanResult.overallCondition === 'Critical' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                  scanResult.overallCondition === 'Poor' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
                  scanResult.overallCondition === 'Fair' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                  'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  Condition: {scanResult.overallCondition}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {scanResult?.summary || 'Aim camera at road surface, concrete bridge, or pipe to detect physical defects.'}
            </p>

            {/* Detected Anomaly Cards */}
            {scanResult && scanResult.defects.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Localized Anomaly Breakdown:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {scanResult.defects.map((defect) => {
                    const colors = SEVERITY_COLORS[defect.severity];
                    return (
                      <div
                        key={defect.id}
                        className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs space-y-1 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-bold text-slate-200 truncate">{defect.defectType}</span>
                          <span 
                            className="px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0" 
                            style={{ backgroundColor: colors.fill, color: colors.stroke }}
                          >
                            {defect.severity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Confidence: <strong>{Math.round(defect.confidence * 100)}%</strong></span>
                          <span>Est Area: {defect.metrics.estimatedAreaCm2} cm²</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">
                          Rec: {defect.recommendation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <button
            onClick={handleDownloadSnapshot}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            title="Download evidence image with defect bounding boxes"
          >
            <Download className="w-3.5 h-3.5" /> Save Evidence Image
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePreFillIssue}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Report as Civic Hazard
            </button>
            <button
              onClick={handlePreFillInspection}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              Log as Field Inspection
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
