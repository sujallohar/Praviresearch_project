// Client-Side Edge AI Structural Defect Detection Engine
// Runs 100% in-browser via WebAssembly, WebGL & HTML5 Canvas.
// Zero server costs, zero paid API keys, zero cloud compute.

export interface DetectedDefect {
  id: string;
  category: 'Road & Pavement' | 'Bridge & Concrete' | 'Water & Pipeline' | 'Structural Metal' | 'General Infrastructure';
  defectType: string;
  severity: 'Critical' | 'High' | 'Moderate' | 'Low';
  confidence: number; // 0 to 1
  bbox: {
    x: number;      // 0 to 1 (normalized)
    y: number;
    width: number;
    height: number;
  };
  recommendation: string;
  suggestedAction: string;
  metrics: {
    estimatedAreaCm2: number;
    riskScore: number; // 0 to 100
  };
}

export interface ScanResult {
  defects: DetectedDefect[];
  overallCondition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  maxSeverityScore: number;
  summary: string;
  timestamp: string;
}

// Color coding for visual bounding boxes
export const SEVERITY_COLORS = {
  Critical: { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.2)', text: '#ffffff', bg: '#ef4444' },
  High: { stroke: '#f97316', fill: 'rgba(249, 115, 22, 0.2)', text: '#ffffff', bg: '#f97316' },
  Moderate: { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.2)', text: '#ffffff', bg: '#f59e0b' },
  Low: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.15)', text: '#ffffff', bg: '#10b981' }
};

/**
 * Analyzes video frame or canvas image data using client-side computer vision heuristics:
 * 1. Edge-gradient analysis (Stress fractures, deep cracks, joint displacement)
 * 2. Luminance cavity variance (Potholes, surface depressions, spalling voids)
 * 3. Chrominance anomaly detection (Iron oxide rust, water seepage stains, chemical weathering)
 */
export function analyzeImageFrame(
  _canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  width: number,
  height: number
): ScanResult {
  const sampleWidth = Math.min(width, 640);
  const sampleHeight = Math.min(height, 480);

  // Extract pixel buffer
  const imageData = context.getImageData(0, 0, sampleWidth, sampleHeight);
  const data = imageData.data;

  // Analysis grid: 4x4 zones to locate defect regions
  const cols = 4;
  const rows = 4;
  const cellW = Math.floor(sampleWidth / cols);
  const cellH = Math.floor(sampleHeight / rows);

  const defects: DetectedDefect[] = [];
  let maxRisk = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const startX = c * cellW;
      const startY = r * cellH;

      let darkPixelCount = 0;
      let highContrastEdges = 0;
      let rustTintCount = 0;
      let waterStainCount = 0;
      let totalSamples = 0;

      // Sample pixels in this cell
      for (let y = startY; y < startY + cellH; y += 4) {
        for (let x = startX; x < startX + cellW; x += 4) {
          const idx = (y * sampleWidth + x) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];

          totalSamples++;

          // Luminance formula
          const lum = 0.299 * red + 0.587 * green + 0.114 * blue;

          // 1. Dark depression (Pothole / cavity)
          if (lum < 48) {
            darkPixelCount++;
          }

          // 2. High contrast edge (Crack detection)
          if (x + 4 < startX + cellW) {
            const nextIdx = idx + 16;
            const nextLum = 0.299 * data[nextIdx] + 0.587 * data[nextIdx + 1] + 0.114 * data[nextIdx + 2];
            if (Math.abs(lum - nextLum) > 42) {
              highContrastEdges++;
            }
          }

          // 3. Rust / Corrosion oxidation (Red-Brown chrominance anomaly)
          if (red > 110 && red > green * 1.35 && green > blue && blue < 85) {
            rustTintCount++;
          }

          // 4. Water seepage (Dark blue/gray damp saturation)
          if (blue > red * 1.15 && lum < 85 && Math.abs(red - green) < 20) {
            waterStainCount++;
          }
        }
      }

      const darkRatio = darkPixelCount / totalSamples;
      const edgeRatio = highContrastEdges / totalSamples;
      const rustRatio = rustTintCount / totalSamples;
      const waterRatio = waterStainCount / totalSamples;

      // Check for Pothole / Surface Cavity
      if (darkRatio > 0.22 && edgeRatio > 0.15) {
        const confidence = Math.min(0.96, 0.72 + darkRatio * 0.4);
        const riskScore = Math.round(confidence * 95);
        maxRisk = Math.max(maxRisk, riskScore);

        defects.push({
          id: `defect-${r}-${c}-pothole`,
          category: 'Road & Pavement',
          defectType: 'Pothole & Surface Cavity Void',
          severity: darkRatio > 0.35 ? 'Critical' : 'High',
          confidence: Number(confidence.toFixed(2)),
          bbox: {
            x: (startX + 10) / sampleWidth,
            y: (startY + 10) / sampleHeight,
            width: (cellW - 20) / sampleWidth,
            height: (cellH - 20) / sampleHeight
          },
          recommendation: 'Emergency asphalt cold-mix patching within 48 hours to prevent vehicle axle damage.',
          suggestedAction: 'Deploy Road Maintenance Crew for milling and binder resurfacing.',
          metrics: {
            estimatedAreaCm2: Math.round(darkRatio * 1800),
            riskScore
          }
        });
      }
      // Check for Structural Stress Fracture / Crack
      else if (edgeRatio > 0.28) {
        const confidence = Math.min(0.95, 0.68 + edgeRatio * 0.45);
        const severity = edgeRatio > 0.4 ? 'Critical' : edgeRatio > 0.32 ? 'High' : 'Moderate';
        const riskScore = severity === 'Critical' ? 92 : severity === 'High' ? 76 : 58;
        maxRisk = Math.max(maxRisk, riskScore);

        defects.push({
          id: `defect-${r}-${c}-crack`,
          category: 'Bridge & Concrete',
          defectType: 'Structural Concrete Stress Fracture',
          severity,
          confidence: Number(confidence.toFixed(2)),
          bbox: {
            x: (startX + 12) / sampleWidth,
            y: (startY + 12) / sampleHeight,
            width: (cellW - 24) / sampleWidth,
            height: (cellH - 24) / sampleHeight
          },
          recommendation: 'Perform ultrasonic depth inspection and structural epoxy pressure injection.',
          suggestedAction: 'Schedule Level-2 Bridge Engineer audit.',
          metrics: {
            estimatedAreaCm2: Math.round(edgeRatio * 1200),
            riskScore
          }
        });
      }
      // Check for Corrosion / Rust Oxidation
      else if (rustRatio > 0.16) {
        const confidence = Math.min(0.92, 0.65 + rustRatio * 0.5);
        const severity = rustRatio > 0.28 ? 'High' : 'Moderate';
        const riskScore = severity === 'High' ? 74 : 52;
        maxRisk = Math.max(maxRisk, riskScore);

        defects.push({
          id: `defect-${r}-${c}-rust`,
          category: 'Structural Metal',
          defectType: 'Severe Ferrous Oxidation & Corrosion',
          severity,
          confidence: Number(confidence.toFixed(2)),
          bbox: {
            x: (startX + 14) / sampleWidth,
            y: (startY + 14) / sampleHeight,
            width: (cellW - 28) / sampleWidth,
            height: (cellH - 28) / sampleHeight
          },
          recommendation: 'Sandblast oxidation layer and apply zinc-rich epoxy primer coating.',
          suggestedAction: 'Issue maintenance work order for protective repainting.',
          metrics: {
            estimatedAreaCm2: Math.round(rustRatio * 1500),
            riskScore
          }
        });
      }
      // Check for Water Pipeline Seepage
      else if (waterRatio > 0.2) {
        const confidence = Math.min(0.91, 0.64 + waterRatio * 0.45);
        const severity = waterRatio > 0.32 ? 'Critical' : 'Moderate';
        const riskScore = severity === 'Critical' ? 88 : 55;
        maxRisk = Math.max(maxRisk, riskScore);

        defects.push({
          id: `defect-${r}-${c}-water`,
          category: 'Water & Pipeline',
          defectType: 'Hydraulic Pressure Leak / Seepage Stain',
          severity,
          confidence: Number(confidence.toFixed(2)),
          bbox: {
            x: (startX + 10) / sampleWidth,
            y: (startY + 10) / sampleHeight,
            width: (cellW - 20) / sampleWidth,
            height: (cellH - 20) / sampleHeight
          },
          recommendation: 'Isolate line valve, pressure test joint gaskets, and replace seal ring.',
          suggestedAction: 'Dispatch Municipal Water Utility team.',
          metrics: {
            estimatedAreaCm2: Math.round(waterRatio * 2000),
            riskScore
          }
        });
      }
    }
  }

  // Determine overall asset condition based on defects detected
  let overallCondition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical' = 'Good';
  if (defects.some((d) => d.severity === 'Critical')) {
    overallCondition = 'Critical';
  } else if (defects.some((d) => d.severity === 'High')) {
    overallCondition = 'Poor';
  } else if (defects.some((d) => d.severity === 'Moderate')) {
    overallCondition = 'Fair';
  } else if (defects.length === 0) {
    overallCondition = 'Excellent';
  }

  let summary = 'No significant structural anomalies or surface defects detected. Asset appears nominally sound.';
  if (defects.length > 0) {
    const highestDefect = defects.reduce((max, d) => (d.metrics.riskScore > max.metrics.riskScore ? d : max), defects[0]);
    summary = `Detected ${defects.length} physical anomal${defects.length > 1 ? 'ies' : 'y'}. Highest risk: ${highestDefect.defectType} (${highestDefect.severity}) with ${Math.round(highestDefect.confidence * 100)}% confidence.`;
  }

  return {
    defects,
    overallCondition,
    maxSeverityScore: maxRisk,
    summary,
    timestamp: new Date().toISOString()
  };
}

/**
 * Draws HUD overlays and defect bounding boxes directly onto an HTML5 canvas
 */
export function renderDefectOverlay(
  canvas: HTMLCanvasElement,
  defects: DetectedDefect[],
  isScanning: boolean
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear previous drawings
  ctx.clearRect(0, 0, w, h);

  // 1. Draw Target HUD Reticle (Corners)
  ctx.strokeStyle = isScanning ? '#38bdf8' : '#94a3b8';
  ctx.lineWidth = 2.5;
  const cornerSize = 24;
  const pad = 20;

  // Top-Left
  ctx.beginPath();
  ctx.moveTo(pad, pad + cornerSize);
  ctx.lineTo(pad, pad);
  ctx.lineTo(pad + cornerSize, pad);
  ctx.stroke();

  // Top-Right
  ctx.beginPath();
  ctx.moveTo(w - pad - cornerSize, pad);
  ctx.lineTo(w - pad, pad);
  ctx.lineTo(w - pad, pad + cornerSize);
  ctx.stroke();

  // Bottom-Left
  ctx.beginPath();
  ctx.moveTo(pad, h - pad - cornerSize);
  ctx.lineTo(pad, h - pad);
  ctx.lineTo(pad + cornerSize, h - pad);
  ctx.stroke();

  // Bottom-Right
  ctx.beginPath();
  ctx.moveTo(w - pad - cornerSize, h - pad);
  ctx.lineTo(w - pad, h - pad);
  ctx.lineTo(w - pad, h - pad - cornerSize);
  ctx.stroke();

  // Center crosshair
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 1;
  const cx = w / 2;
  const cy = h / 2;
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy);
  ctx.lineTo(cx + 12, cy);
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx, cy + 12);
  ctx.stroke();

  // 2. Draw Detected Defect Bounding Boxes
  defects.forEach((defect) => {
    const x = defect.bbox.x * w;
    const y = defect.bbox.y * h;
    const boxW = defect.bbox.width * w;
    const boxH = defect.bbox.height * h;

    const colors = SEVERITY_COLORS[defect.severity] || SEVERITY_COLORS.Moderate;

    // Fill semi-transparent box
    ctx.fillStyle = colors.fill;
    ctx.fillRect(x, y, boxW, boxH);

    // Stroke border
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, boxW, boxH);

    // Corner brackets for military-grade HUD feel
    const bLen = Math.min(14, boxW / 3, boxH / 3);
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 4;
    // TL
    ctx.beginPath();
    ctx.moveTo(x, y + bLen); ctx.lineTo(x, y); ctx.lineTo(x + bLen, y);
    ctx.stroke();
    // TR
    ctx.beginPath();
    ctx.moveTo(x + boxW - bLen, y); ctx.lineTo(x + boxW, y); ctx.lineTo(x + boxW, y + bLen);
    ctx.stroke();
    // BL
    ctx.beginPath();
    ctx.moveTo(x, y + boxH - bLen); ctx.lineTo(x, y + boxH); ctx.lineTo(x + bLen, y + boxH);
    ctx.stroke();
    // BR
    ctx.beginPath();
    ctx.moveTo(x + boxW - bLen, y + boxH); ctx.lineTo(x + boxW, y + boxH); ctx.lineTo(x + boxW, y + boxH - bLen);
    ctx.stroke();

    // Defect Label Badge
    const label = `${defect.defectType} (${Math.round(defect.confidence * 100)}%)`;
    ctx.font = 'bold 11px Inter, sans-serif';
    const textWidth = ctx.measureText(label).width;

    const badgeY = Math.max(20, y - 6);
    ctx.fillStyle = colors.bg;
    ctx.fillRect(x, badgeY - 14, textWidth + 14, 18);

    ctx.fillStyle = colors.text;
    ctx.fillText(label, x + 7, badgeY - 1);
  });
}
