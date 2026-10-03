import React from 'react';
import type { Asset, MaintenanceRecord, Inspection } from '../../types';
import { 
  analyzeAssetPredictiveDeterioration, 
  type PredictiveAnalysisResult 
} from '../../utils/predictiveEngine';
import { 
  TrendingDown, ShieldAlert, DollarSign, Calendar, 
  Wrench, Activity, Sparkles, CheckCircle2, Clock, AlertTriangle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';

interface PredictiveLifecycleCardProps {
  asset: Asset;
  maintenanceRecords?: MaintenanceRecord[];
  inspections?: Inspection[];
  onScheduleMaintenance?: (assetId: string) => void;
}

export const PredictiveLifecycleCard: React.FC<PredictiveLifecycleCardProps> = ({
  asset,
  maintenanceRecords = [],
  inspections = [],
  onScheduleMaintenance
}) => {
  const analysis: PredictiveAnalysisResult = analyzeAssetPredictiveDeterioration(
    asset,
    maintenanceRecords,
    inspections
  );

  const {
    currentHealthScore,
    remainingUsefulLifeYears,
    remainingUsefulLifeMonths,
    criticalFailureHorizon,
    riskCategory,
    probabilityOfFailure,
    consequenceOfFailure,
    costOfInaction,
    proactiveMaintenanceCost,
    taxpayerSavings,
    roiMultiplier,
    recommendedAction,
    forecastCurve
  } = analysis;

  // Color mapping based on health score
  const healthBadgeColor =
    currentHealthScore >= 70
      ? 'bg-emerald-500 text-white'
      : currentHealthScore >= 40
      ? 'bg-amber-500 text-white'
      : 'bg-red-600 text-white';

  const riskBadgeColor =
    riskCategory === 'Extreme'
      ? 'bg-red-100 text-red-800 border-red-300'
      : riskCategory === 'High'
      ? 'bg-orange-100 text-orange-800 border-orange-300'
      : riskCategory === 'Medium'
      ? 'bg-amber-100 text-amber-800 border-amber-300'
      : 'bg-emerald-100 text-emerald-800 border-emerald-300';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-6 p-5 sm:p-6">
      
      {/* Top Banner / AI Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                Predictive Degradation Intelligence
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Sparkles className="w-3 h-3 text-indigo-500" />
                Weibull Reliability Model
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Client-side statistical failure forecasting, Remaining Useful Life (RUL), and cost-of-inaction ROI
            </p>
          </div>
        </div>

        {onScheduleMaintenance && (
          <button
            onClick={() => onScheduleMaintenance(asset.id || '')}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition-all self-start sm:self-auto"
          >
            <Wrench className="w-4 h-4" />
            <span>Schedule Preventative Work</span>
          </button>
        )}
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Metric 1: Health Index */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Current Health Index
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {currentHealthScore}
            </span>
            <span className="text-xs text-slate-500 font-semibold">/ 100</span>
            <span className={`ml-auto px-2 py-0.5 text-[10px] font-bold rounded-full ${healthBadgeColor}`}>
              {currentHealthScore >= 70 ? 'Optimal' : currentHealthScore >= 40 ? 'Fair' : 'Critical'}
            </span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                currentHealthScore >= 70 ? 'bg-emerald-500' : currentHealthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
              }`}
              style={{ width: `${currentHealthScore}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Remaining Useful Life (RUL) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Remaining Useful Life (RUL)
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {remainingUsefulLifeYears}
            </span>
            <span className="text-xs text-slate-600 font-medium">Years</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            Approx. {remainingUsefulLifeMonths} operational months
          </p>
        </div>

        {/* Metric 3: Critical Failure Horizon */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Critical Failure Horizon
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-amber-700">
              {criticalFailureHorizon}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-400" />
            Unmaintained cutoff limit (&lt;40 score)
          </p>
        </div>

        {/* Metric 4: Risk Matrix Category */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Risk Classification
          </span>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 text-xs font-extrabold rounded-full border ${riskBadgeColor}`}>
              {riskCategory} Risk
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            PoF: <strong className="text-slate-700">{probabilityOfFailure}%</strong> • CoF Rating: <strong className="text-slate-700">{consequenceOfFailure}/5</strong>
          </p>
        </div>

      </div>

      {/* Degradation Chart Section */}
      <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h4 className="font-bold text-sm sm:text-base text-slate-900 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-blue-600" />
              10-Year Lifecycle Degradation Projection
            </h4>
            <p className="text-xs text-slate-500">
              Comparison between unmaintained natural wear vs. proactive preventative cycle
            </p>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              With Early Maintenance
            </span>
            <span className="flex items-center gap-1 text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              Unmaintained Decay
            </span>
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={forecastCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorMaintained" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorDecay" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} />
              <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a', 
                  borderColor: '#1e293b', 
                  borderRadius: '0.75rem', 
                  color: '#fff', 
                  fontSize: '12px' 
                }} 
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
              
              <ReferenceLine y={70} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Good (70)', fill: '#10b981', fontSize: 10, position: 'right' }} />
              <ReferenceLine y={40} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Critical (40)', fill: '#ef4444', fontSize: 10, position: 'right' }} />

              <Area
                type="monotone"
                dataKey="withMaintenance"
                name="With Preventative Maintenance"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorMaintained)"
              />
              <Area
                type="monotone"
                dataKey="projectedHealth"
                name="Unmaintained Natural Decay"
                stroke="#f43f5e"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorDecay)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Grid: Financial ROI and Risk Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Card 1: Cost-of-Inaction ROI */}
        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-5 rounded-2xl flex flex-col justify-between shadow-md">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Cost-of-Inaction vs. Proactive ROI
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {roiMultiplier}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Deferring maintenance until failure forces emergency rebuilds at up to 10x the cost of proactive stabilization.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  Proactive Maintenance
                </span>
                <span className="text-lg font-bold text-white">
                  ${proactiveMaintenanceCost.toLocaleString()}
                </span>
              </div>
              <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                <span className="text-[10px] text-rose-300 uppercase tracking-wider block">
                  Cost of Inaction
                </span>
                <span className="text-lg font-bold text-rose-400">
                  ${costOfInaction.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                Net Taxpayer Capital Saved
              </span>
              <span className="text-xl font-extrabold text-emerald-400">
                +${taxpayerSavings.toLocaleString()}
              </span>
            </div>
            <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Card 2: 5x5 Risk Matrix & Engineering Directive */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Asset Risk Matrix (PoF × CoF)
              </h4>
              <span className="text-[11px] font-semibold text-slate-500">
                Level: <strong className="text-slate-800">{riskCategory}</strong>
              </span>
            </div>

            {/* 5x5 Mini Matrix Grid */}
            <div className="space-y-1 mb-4">
              <div className="flex items-center text-[10px] text-slate-400 justify-between mb-1">
                <span>Probability of Failure (PoF) ↑</span>
                <span>Consequence (CoF) →</span>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  ['#10b981', '#10b981', '#f59e0b', '#f97316', '#ef4444'],
                  ['#10b981', '#10b981', '#f59e0b', '#f97316', '#ef4444'],
                  ['#10b981', '#f59e0b', '#f59e0b', '#f97316', '#ef4444'],
                  ['#10b981', '#f59e0b', '#f97316', '#ef4444', '#ef4444'],
                  ['#f59e0b', '#f97316', '#ef4444', '#ef4444', '#ef4444'],
                ].reverse().map((row, y) => (
                  <React.Fragment key={y}>
                    {row.map((color, x) => {
                      const isCurrent = x === analysis.riskMatrixCoords.x && y === analysis.riskMatrixCoords.y;
                      return (
                        <div
                          key={`${x}-${y}`}
                          className={`h-5 rounded-md flex items-center justify-center transition-all ${
                            isCurrent
                              ? 'ring-2 ring-slate-900 scale-110 shadow-md font-bold text-white text-[9px]'
                              : 'opacity-40'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {isCurrent && '●'}
                        </div>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Directive banner */}
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Municipal Engineering Directive
            </span>
            <p className="text-xs text-slate-600 leading-snug">
              {recommendedAction}
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
