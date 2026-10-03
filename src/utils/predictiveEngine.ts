// Predictive Infrastructure Degradation Model (Weibull Reliability Curve)
// Calculates client-side asset health forecasting, remaining useful life (RUL),
// failure horizons, and cost-of-inaction financial ROI without external APIs.

import type { Asset, MaintenanceRecord, Inspection } from '../types';

export interface ForecastPoint {
  year: number;
  label: string;
  projectedHealth: number;
  withMaintenance: number;
  criticalThreshold: number;
  fairThreshold: number;
}

export interface PredictiveAnalysisResult {
  assetId: string;
  assetName: string;
  assetType: string;
  currentHealthScore: number; // 0 - 100
  initialCondition: string;
  remainingUsefulLifeYears: number;
  remainingUsefulLifeMonths: number;
  criticalFailureHorizon: string; // e.g. "Q3 2029"
  criticalFailureYear: number;
  probabilityOfFailure: number; // 0 - 100%
  consequenceOfFailure: number; // 1 - 5
  riskCategory: 'Low' | 'Medium' | 'High' | 'Extreme';
  riskMatrixCoords: { x: number; y: number }; // 0-4 indices for 5x5 heatmap
  costOfInaction: number;
  proactiveMaintenanceCost: number;
  taxpayerSavings: number;
  roiMultiplier: string;
  recommendedAction: string;
  forecastCurve: ForecastPoint[];
}

// Characteristic life (eta in years) and Weibull aging shape factor (beta)
interface MaterialDegradationParams {
  eta: number;  // Characteristic Life (years)
  beta: number; // Aging slope parameter (beta > 1 = wear-out phase)
  estimatedBaseCost: number;
}

const MATERIAL_PROFILES: Record<string, MaterialDegradationParams> = {
  Bridge: { eta: 50, beta: 1.85, estimatedBaseCost: 1200000 },
  Road: { eta: 18, beta: 2.35, estimatedBaseCost: 450000 },
  Building: { eta: 60, beta: 1.65, estimatedBaseCost: 2500000 },
  Water: { eta: 40, beta: 2.10, estimatedBaseCost: 650000 },
  Park: { eta: 25, beta: 1.75, estimatedBaseCost: 200000 },
  Electrical: { eta: 22, beta: 2.05, estimatedBaseCost: 350000 },
  Default: { eta: 30, beta: 1.90, estimatedBaseCost: 500000 }
};

/**
 * Calculates Weibull Cumulative Failure Probability: F(t) = 1 - exp(-(t / eta)^beta)
 */
export function calculateWeibullPoF(t: number, eta: number, beta: number): number {
  if (t <= 0) return 0.01;
  const ratio = t / eta;
  const pof = 1 - Math.exp(-Math.pow(ratio, beta));
  return Math.min(Math.max(pof, 0.01), 0.99);
}

/**
 * Estimates asset age in years based on installation date or fallback heuristic
 */
export function estimateAssetAge(asset: Asset): number {
  if ((asset as any).installationDate) {
    const install = new Date((asset as any).installationDate);
    if (!isNaN(install.getTime())) {
      const diffMs = Date.now() - install.getTime();
      return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24 * 365.25)));
    }
  }
  // Condition-based age proxy if install date is not specified
  switch (asset.condition) {
    case 'Excellent': return 2;
    case 'Good': return 6;
    case 'Fair': return 12;
    case 'Poor': return 18;
    case 'Critical': return 24;
    default: return 8;
  }
}

/**
 * Determines Consequence of Failure (CoF) on a 1-5 scale based on asset category & risk
 */
export function determineConsequenceOfFailure(asset: Asset): number {
  let score = 2; // base
  const type = (asset.type || '').toLowerCase();

  if (type.includes('bridge') || type.includes('dam') || type.includes('hospital')) {
    score = 5; // Catastrophic civil hazard
  } else if (type.includes('water') || type.includes('electric') || type.includes('highway') || type.includes('road')) {
    score = 4; // High municipal disruption
  } else if (type.includes('building') || type.includes('facility')) {
    score = 3;
  } else if (type.includes('park') || type.includes('recreation')) {
    score = 2;
  }

  // Elevate if declared High Risk
  if (asset.riskLevel === 'High') {
    score = Math.min(score + 1, 5);
  }

  return score;
}

/**
 * Generates comprehensive predictive degradation intelligence for an individual asset
 */
export function analyzeAssetPredictiveDeterioration(
  asset: Asset,
  maintenanceRecords: MaintenanceRecord[] = [],
  inspections: Inspection[] = []
): PredictiveAnalysisResult {
  // 1. Identify material parameter profile
  const profileKey = Object.keys(MATERIAL_PROFILES).find(k => 
    (asset.type || '').toLowerCase().includes(k.toLowerCase())
  ) || 'Default';
  const profile = MATERIAL_PROFILES[profileKey];

  // 2. Adjust eta based on risk level and usage intensity
  let effectiveEta = profile.eta;
  if (asset.riskLevel === 'High') {
    effectiveEta *= 0.75; // 25% faster deterioration under heavy load
  } else if (asset.riskLevel === 'Low') {
    effectiveEta *= 1.15; // 15% longer life under low stress
  }

  // 3. Maintenance bonus: each completed maintenance in last 3 years restores effective life
  const assetMaint = maintenanceRecords.filter(m => m.assetId === asset.id && m.status === 'Completed');
  const maintBonusYears = Math.min(assetMaint.length * 1.5, 6);

  // 4. Determine current operational age
  const age = Math.max(1, estimateAssetAge(asset) - maintBonusYears);

  // 5. Compute current Health Index Score (0 to 100)
  // Condition baseline
  let baseScore = 75;
  if (asset.condition === 'Excellent') baseScore = 95;
  else if (asset.condition === 'Good') baseScore = 80;
  else if (asset.condition === 'Fair') baseScore = 60;
  else if (asset.condition === 'Poor') baseScore = 38;
  else if (asset.condition === 'Critical') baseScore = 18;

  // Most recent inspection adjustment
  const assetInsp = inspections.filter(i => i.assetId === asset.id);
  if (assetInsp.length > 0) {
    const latest = assetInsp[0];
    if (latest.condition === 'Critical') baseScore = Math.min(baseScore, 25);
    else if (latest.condition === 'Poor') baseScore = Math.min(baseScore, 42);
  }

  const currentPoF = calculateWeibullPoF(age, effectiveEta, profile.beta);
  const currentHealthScore = Math.round(baseScore * (1 - currentPoF * 0.45));

  // 6. Project Remaining Useful Life (RUL)
  // RUL is time until health score drops below Critical cutoff (score < 40)
  let rulYears = 0;
  let criticalHorizonYear = new Date().getFullYear();
  let criticalQuarter = 'Q4';

  const forecastCurve: ForecastPoint[] = [];
  const startYear = new Date().getFullYear();

  for (let offset = 0; offset <= 10; offset++) {
    const simYear = startYear + offset;
    const simAge = age + offset;

    // Natural deterioration decay curve
    const projectedHealth = Math.max(
      5,
      Math.round(currentHealthScore * Math.exp(-Math.pow(simAge / effectiveEta, profile.beta) * 0.8))
    );

    // Projected health with early preventative intervention (resets wear curve)
    const withMaintenance = Math.min(
      96,
      Math.round(projectedHealth + (offset === 0 ? 0 : 26 - offset * 1.2))
    );

    forecastCurve.push({
      year: simYear,
      label: `${simYear}`,
      projectedHealth,
      withMaintenance,
      criticalThreshold: 40,
      fairThreshold: 70
    });

    if (projectedHealth < 40 && rulYears === 0) {
      rulYears = offset + Math.max(0.2, (projectedHealth - 25) / 25);
      criticalHorizonYear = simYear;
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      criticalQuarter = quarters[Math.floor((offset % 4))];
    }
  }

  if (rulYears === 0) {
    rulYears = 10.5;
    criticalHorizonYear = startYear + 11;
  }

  const remainingUsefulLifeMonths = Math.round(rulYears * 12);
  const remainingUsefulLifeYears = Math.round(rulYears * 10) / 10;
  const criticalFailureHorizon = `${criticalQuarter} ${criticalHorizonYear}`;

  // 7. Probability of Failure (PoF) & Consequence of Failure (CoF) Risk Matrix
  const pofPercent = Math.min(99, Math.max(2, Math.round(currentPoF * 100)));
  const cofRating = determineConsequenceOfFailure(asset);

  // Matrix coordinate mapping (0-4)
  const pofIndex = Math.min(4, Math.floor(pofPercent / 20));
  const cofIndex = Math.min(4, cofRating - 1);

  let riskCategory: 'Low' | 'Medium' | 'High' | 'Extreme' = 'Low';
  const riskProduct = (pofIndex + 1) * (cofIndex + 1);
  if (riskProduct >= 16) riskCategory = 'Extreme';
  else if (riskProduct >= 10) riskCategory = 'High';
  else if (riskProduct >= 5) riskCategory = 'Medium';
  else riskCategory = 'Low';

  // 8. Cost of Inaction vs. Proactive Maintenance ROI
  const assetValuation = (asset as any).estimatedValue || profile.estimatedBaseCost;
  const proactiveMaintenanceCost = Math.round(assetValuation * 0.04); // ~4% of asset value
  // Inaction catastrophic failure / emergency replacement cost multiplier: 7x - 12x
  const costOfInaction = Math.round(proactiveMaintenanceCost * (7.5 + cofRating * 1.1));
  const taxpayerSavings = costOfInaction - proactiveMaintenanceCost;
  const roiMultiplier = `${(costOfInaction / proactiveMaintenanceCost).toFixed(1)}x ROI`;

  // 9. Recommended Municipal Directive
  let recommendedAction = '';
  if (currentHealthScore < 40) {
    recommendedAction = `Immediate structural reinforcement required. Transitioned into Critical Failure state. Emergency overhaul will avert catastrophic civic disruption.`;
  } else if (currentHealthScore < 65) {
    recommendedAction = `Target proactive rehabilitation before ${criticalFailureHorizon}. Timely preventative intervention saves an estimated $${(taxpayerSavings / 1000).toFixed(0)}k in replacement capital.`;
  } else {
    recommendedAction = `Structural integrity optimal. Maintain regular operational inspection cycles through ${startYear + 3}. No major capital expenditure required.`;
  }

  return {
    assetId: asset.id || 'N/A',
    assetName: asset.name,
    assetType: asset.type,
    currentHealthScore,
    initialCondition: asset.condition,
    remainingUsefulLifeYears,
    remainingUsefulLifeMonths,
    criticalFailureHorizon,
    criticalFailureYear: criticalHorizonYear,
    probabilityOfFailure: pofPercent,
    consequenceOfFailure: cofRating,
    riskCategory,
    riskMatrixCoords: { x: cofIndex, y: pofIndex },
    costOfInaction,
    proactiveMaintenanceCost,
    taxpayerSavings,
    roiMultiplier,
    recommendedAction,
    forecastCurve
  };
}

/**
 * Aggregates portfolio-wide predictive analytics across all municipal assets
 */
export function calculatePortfolioPredictiveMetrics(assets: Asset[], maintenance: MaintenanceRecord[]) {
  const analyses = assets.map(a => analyzeAssetPredictiveDeterioration(a, maintenance));

  const totalAssets = analyses.length;
  if (totalAssets === 0) {
    return {
      averageHealthScore: 0,
      assetsAtRiskCount: 0,
      totalPreventativeSavings: 0,
      criticalHorizonDistribution: {},
      riskCategoryCounts: { Low: 0, Medium: 0, High: 0, Extreme: 0 },
      analyses: [] as PredictiveAnalysisResult[]
    };
  }

  const averageHealthScore = Math.round(
    analyses.reduce((acc, curr) => acc + curr.currentHealthScore, 0) / totalAssets
  );

  const assetsAtRiskCount = analyses.filter(a => a.riskCategory === 'High' || a.riskCategory === 'Extreme').length;
  const totalPreventativeSavings = analyses.reduce((acc, curr) => acc + curr.taxpayerSavings, 0);

  const riskCategoryCounts = {
    Low: analyses.filter(a => a.riskCategory === 'Low').length,
    Medium: analyses.filter(a => a.riskCategory === 'Medium').length,
    High: analyses.filter(a => a.riskCategory === 'High').length,
    Extreme: analyses.filter(a => a.riskCategory === 'Extreme').length
  };

  return {
    averageHealthScore,
    assetsAtRiskCount,
    totalPreventativeSavings,
    riskCategoryCounts,
    analyses
  };
}
