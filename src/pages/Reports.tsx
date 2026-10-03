import React, { useEffect, useState } from 'react';
import { 
  BarChart3, PieChart, 
  AlertTriangle, Wrench, Download, FileText, 
  DollarSign, TrendingUp, Filter, RefreshCw, Sparkles, Clock, ArrowUpRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import type { Asset, Project, Issue, MaintenanceRecord } from '../types';
import { Link } from 'react-router-dom';
import { 
  PieChart as RePieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculatePortfolioPredictiveMetrics } from '../utils/predictiveEngine';
import { downloadBlob, downloadCsv } from '../utils/fileDownloader';

const COLORS = ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export const Reports: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visuals' | 'tables' | 'predictive'>('visuals');
  const [departmentFilter, setDepartmentFilter] = useState('All');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetsSnap, projectsSnap, issuesSnap, maintSnap] = await Promise.all([
        getDocs(collection(db, 'assets')),
        getDocs(collection(db, 'projects')),
        getDocs(collection(db, 'issues')),
        getDocs(collection(db, 'maintenanceRecords'))
      ]);
      
      setAssets(assetsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
      setProjects(projectsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
      setIssues(issuesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Issue)));
      setMaintenance(maintSnap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord)));
    } catch (err) {
      console.error("Failed to fetch report data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered Assets by department
  const filteredAssets = departmentFilter === 'All' 
    ? assets 
    : assets.filter(a => a.departmentId === departmentFilter);

  // Prepare Chart Data
  const assetsByType = Object.entries(
    filteredAssets.reduce((acc, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const assetsByCondition = Object.entries(
    filteredAssets.reduce((acc, curr) => {
      acc[curr.condition] = (acc[curr.condition] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  // Projects Budget vs Spent
  const projectsBudgetChart = projects.slice(0, 6).map(p => ({
    name: p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name,
    budget: Math.round(Number(p.budget || 0) / 1000),
    spent: Math.round(Number(p.spent || 0) / 1000)
  }));

  // Maintenance Cost by Status
  const maintenanceByStatus = Object.entries(
    maintenance.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + (Number(curr.cost) || 0);
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, cost]) => ({ name, cost }));

  // Comprehensive PDF Export
  const exportPDF = () => {
    const doc = new jsPDF();
    
    // Title & Header
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text("GovAsset 360 - Comprehensive Executive Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleString()} | Filter: Department - ${departmentFilter}`, 14, 30);
    
    // Summary KPI Block
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Assets: ${filteredAssets.length}`, 14, 42);
    doc.text(`Active Projects: ${projects.length}`, 75, 42);
    doc.text(`Scheduled Maintenance: ${maintenance.length}`, 135, 42);

    // Section 1: Asset Inventory Summary
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("1. Registered Public Assets", 14, 54);
    
    const assetTableData = filteredAssets.slice(0, 20).map(a => [
      a.id?.substring(0, 8) || '',
      a.name,
      a.type,
      a.location,
      a.condition,
      a.riskLevel
    ]);
    
    autoTable(doc, {
      startY: 58,
      head: [['ID', 'Name', 'Category', 'Location', 'Condition', 'Risk']],
      body: assetTableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235] },
      styles: { fontSize: 8 }
    });

    // Section 2: Projects Overview
    const finalY1 = (doc as any).lastAutoTable?.finalY || 120;
    doc.setFontSize(14);
    doc.text("2. Capital Infrastructure Projects", 14, finalY1 + 14);

    const projectTableData = projects.map(p => [
      p.name,
      p.contractor || 'TBD',
      p.status,
      `${p.progressPercent}%`,
      `$${Number(p.spent || 0).toLocaleString()}`,
      `$${Number(p.budget || 0).toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: finalY1 + 18,
      head: [['Project Name', 'Contractor', 'Status', 'Progress', 'Spent', 'Budget']],
      body: projectTableData,
      theme: 'grid',
      headStyles: { fillColor: [99, 102, 241] },
      styles: { fontSize: 8 }
    });

    // Section 3: Open Hazards & Discrepancies
    const finalY2 = (doc as any).lastAutoTable?.finalY || 200;
    if (finalY2 < 240) {
      doc.setFontSize(14);
      doc.text("3. Priority Hazards & Issues", 14, finalY2 + 14);

      const issueTableData = issues.slice(0, 10).map(i => [
        i.title,
        i.severity,
        i.status,
        i.reportedBy || 'Staff'
      ]);

      autoTable(doc, {
        startY: finalY2 + 18,
        head: [['Issue Title', 'Severity', 'Status', 'Reported By']],
        body: issueTableData,
        theme: 'grid',
        headStyles: { fillColor: [220, 38, 38] },
        styles: { fontSize: 8 }
      });
    }

    const filename = `GovAsset_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    const pdfBlob = doc.output('blob');
    downloadBlob(pdfBlob, filename);
  };

  // CSV Export for Assets
  const exportAssetsCSV = () => {
    const headers = "ID,Name,Type,Department,Location,Condition,Risk Level,Status\n";
    const csvContent = filteredAssets.map(a => 
      `"${a.id}","${a.name}","${a.type}","${a.departmentId}","${a.location}","${a.condition}","${a.riskLevel}","${a.status}"`
    ).join("\n");
    downloadCsv(headers + csvContent, `GovAsset_Assets_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // CSV Export for Projects
  const exportProjectsCSV = () => {
    const headers = "Project Name,Contractor,Department,Status,Progress,Spent,Budget\n";
    const csvContent = projects.map(p => 
      `"${p.name}","${p.contractor}","${p.departmentId}","${p.status}","${p.progressPercent}%","${p.spent}","${p.budget}"`
    ).join("\n");
    downloadCsv(headers + csvContent, `GovAsset_Projects_${new Date().toISOString().split('T')[0]}.csv`);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Loading comprehensive analytics...</div>;
  }

  const openIssuesCount = issues.filter(i => i.status !== 'Closed' && i.status !== 'Resolved').length;
  const totalMaintCost = maintenance.reduce((sum, m) => sum + (Number(m.cost) || 0), 0);
  const totalProjectBudget = projects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);

  const departments = ['All', ...Array.from(new Set(assets.map(a => a.departmentId).filter(Boolean)))];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Reports & Analytics</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Asset distribution, expenditure audit, and document export.
          </p>
        </div>
        <div className="flex overflow-x-auto gap-2 scrollbar-hide -mx-1 px-1 pb-1">
          <button 
            onClick={fetchData} 
            className="p-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors flex-shrink-0"
            title="Refresh analytics data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={exportAssetsCSV} 
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
          >
            <FileText className="w-3.5 h-3.5" /> Assets CSV
          </button>
          <button 
            onClick={exportProjectsCSV} 
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
          >
            <FileText className="w-3.5 h-3.5" /> Projects CSV
          </button>
          <button 
            onClick={exportPDF} 
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
          >
            <Download className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter Department:</span>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('visuals')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'visuals' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Visual Charts
          </button>
          <button
            onClick={() => setActiveTab('predictive')}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'predictive' ? 'bg-white text-indigo-700 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3 h-3 text-indigo-600" />
            Predictive AI
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'tables' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Data Tables & Audit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><TrendingUp className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filtered Assets</p>
            <p className="text-2xl font-bold text-slate-900">{filteredAssets.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600"><DollarSign className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Capital</p>
            <p className="text-2xl font-bold text-slate-900">${(totalProjectBudget / 1000000).toFixed(2)}M</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg text-amber-600"><Wrench className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Maint. Investment</p>
            <p className="text-2xl font-bold text-slate-900">${totalMaintCost.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-lg text-red-600"><AlertTriangle className="w-6 h-6" /></div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Open Hazards</p>
            <p className="text-2xl font-bold text-slate-900">{openIssuesCount}</p>
          </div>
        </div>
      </div>

      {activeTab === 'visuals' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset Distribution Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-96">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <PieChart className="w-4 h-4 text-blue-600" />
              Asset Distribution by Category
            </h2>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={assetsByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                    label={({name, percent = 0}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {assetsByType.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ReTooltip formatter={(value) => [value, 'Assets']} />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Condition Overview Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-96">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              Asset Health & Condition Overview
            </h2>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assetsByCondition} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <ReTooltip cursor={{fill: 'rgba(241, 245, 249, 0.6)'}} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Asset Count" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Projects Budget vs Expenditure */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-96">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Capital Budget vs Spent ($k)
            </h2>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsBudgetChart} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip cursor={{fill: 'rgba(241, 245, 249, 0.6)'}} />
                  <Legend />
                  <Bar dataKey="budget" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Budget ($k)" />
                  <Bar dataKey="spent" fill="#10b981" radius={[4, 4, 0, 0]} name="Disbursed ($k)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Maintenance Cost by Status */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-96">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
              <Wrench className="w-4 h-4 text-amber-600" />
              Maintenance Expenditure by Status ($)
            </h2>
            <div className="flex-1 w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintenanceByStatus} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ReTooltip cursor={{fill: 'rgba(241, 245, 249, 0.6)'}} />
                  <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cost ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        /* Tabular Breakdown */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6 space-y-6">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3">Asset Distribution Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                    <th className="py-2.5 px-4">Category</th>
                    <th className="py-2.5 px-4">Count</th>
                    <th className="py-2.5 px-4">Share (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assetsByType.map(t => (
                    <tr key={t.name} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{t.name}</td>
                      <td className="py-3 px-4 font-bold text-slate-700">{t.value}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {filteredAssets.length > 0 ? `${((t.value / filteredAssets.length) * 100).toFixed(1)}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-3">Major Capital Projects</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                    <th className="py-2.5 px-4">Project Name</th>
                    <th className="py-2.5 px-4">Stage</th>
                    <th className="py-2.5 px-4">Progress</th>
                    <th className="py-2.5 px-4">Spent / Budget</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {projects.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-medium text-slate-900">{p.name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-800">{p.status}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-blue-600">{p.progressPercent}%</td>
                      <td className="py-3 px-4 font-mono text-xs">
                        ${(Number(p.spent) || 0).toLocaleString()} / ${(Number(p.budget) || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Predictive AI & Deterioration Forecast */}
      {activeTab === 'predictive' && (() => {
        const portfolioMetrics = calculatePortfolioPredictiveMetrics(filteredAssets, maintenance);
        const { analyses, averageHealthScore, assetsAtRiskCount, totalPreventativeSavings, riskCategoryCounts } = portfolioMetrics;

        // Group by Remaining Useful Life Horizon
        const horizonBuckets = [
          { name: '< 2 Yrs', count: analyses.filter(a => a.remainingUsefulLifeYears < 2).length, fill: '#ef4444' },
          { name: '2 - 5 Yrs', count: analyses.filter(a => a.remainingUsefulLifeYears >= 2 && a.remainingUsefulLifeYears < 5).length, fill: '#f97316' },
          { name: '5 - 10 Yrs', count: analyses.filter(a => a.remainingUsefulLifeYears >= 5 && a.remainingUsefulLifeYears < 10).length, fill: '#f59e0b' },
          { name: '> 10 Yrs', count: analyses.filter(a => a.remainingUsefulLifeYears >= 10).length, fill: '#10b981' }
        ];

        // Risk breakdown
        const riskChartData = [
          { name: 'Low Risk', value: riskCategoryCounts.Low, fill: '#10b981' },
          { name: 'Medium Risk', value: riskCategoryCounts.Medium, fill: '#f59e0b' },
          { name: 'High Risk', value: riskCategoryCounts.High, fill: '#f97316' },
          { name: 'Extreme Risk', value: riskCategoryCounts.Extreme, fill: '#ef4444' }
        ].filter(r => r.value > 0);

        return (
          <div className="space-y-6">
            {/* Predictive KPI Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-indigo-800">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                  Average Portfolio Health Index
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold">{averageHealthScore}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                  <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200">
                    Weibull Weighted
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div className="bg-indigo-400 h-full rounded-full" style={{ width: `${averageHealthScore}%` }} />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  At-Risk Infrastructure Assets
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-rose-600">{assetsAtRiskCount}</span>
                  <span className="text-xs text-slate-500">of {filteredAssets.length} assets</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Assets categorized in High or Extreme Probability/Consequence bracket
                </p>
              </div>

              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Taxpayer Savings via Proactive Cycle
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600">
                    +${(totalPreventativeSavings / 1000000).toFixed(2)}M
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Estimated capital saved vs emergency failure replacements
                </p>
              </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Horizon Bar Chart */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Remaining Useful Life (RUL) Horizon
                  </h3>
                  <p className="text-xs text-slate-500">Distribution of municipal assets by time-to-critical cutoff</p>
                </div>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={horizonBuckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" fontSize={12} stroke="#64748b" />
                      <YAxis allowDecimals={false} fontSize={12} stroke="#64748b" />
                      <ReTooltip contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                      <Bar dataKey="count" name="Assets" radius={[6, 6, 0, 0]}>
                        {horizonBuckets.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Risk Category Pie Chart */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div className="mb-4">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Failure Consequence Risk Distribution
                  </h3>
                  <p className="text-xs text-slate-500">5x5 Risk Matrix distribution across current portfolio</p>
                </div>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RePieChart>
                      <Pie
                        data={riskChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {riskChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ReTooltip contentStyle={{ borderRadius: '0.5rem', fontSize: '12px' }} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            {/* At-Risk Infrastructure Watchlist Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Infrastructure Risk & Deterioration Watchlist
                  </h3>
                  <p className="text-xs text-slate-500">Assets sorted by shortest Remaining Useful Life (RUL)</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700">
                  {analyses.length} Total Evaluated
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase bg-slate-50">
                      <th className="py-3 px-4">Asset Details</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Health Index</th>
                      <th className="py-3 px-4">Remaining Life</th>
                      <th className="py-3 px-4">Critical Horizon</th>
                      <th className="py-3 px-4">Risk Level</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyses
                      .sort((a, b) => a.remainingUsefulLifeYears - b.remainingUsefulLifeYears)
                      .slice(0, 15)
                      .map(item => (
                        <tr key={item.assetId} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <Link 
                              to={`/assets/${item.assetId}`}
                              className="font-semibold text-slate-900 hover:text-blue-600 block truncate max-w-xs"
                            >
                              {item.assetName}
                            </Link>
                            <span className="font-mono text-[10px] text-slate-400">{item.assetId}</span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">{item.assetType}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                              item.currentHealthScore >= 70 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              item.currentHealthScore >= 40 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {item.currentHealthScore} / 100
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-xs text-slate-800">
                            {item.remainingUsefulLifeYears} Years
                          </td>
                          <td className="py-3 px-4 font-semibold text-xs text-amber-700">
                            {item.criticalFailureHorizon}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                              item.riskCategory === 'Extreme' ? 'bg-red-100 text-red-800' :
                              item.riskCategory === 'High' ? 'bg-orange-100 text-orange-800' :
                              item.riskCategory === 'Medium' ? 'bg-amber-100 text-amber-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {item.riskCategory}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              to={`/assets/${item.assetId}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                              <span>View Forecast</span>
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}
    </div>
  );
};
