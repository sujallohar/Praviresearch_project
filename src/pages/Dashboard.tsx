import React, { useEffect, useState } from 'react';
import { 
  Building2, FolderKanban, AlertTriangle, 
  ClipboardCheck, Activity, Database, MapPin, 
  Plus, ZoomIn, Eye, Wrench, ArrowUpRight
} from 'lucide-react';
import { seedDemoData } from '../lib/seed';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Asset, Project, Issue, MaintenanceRecord } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { AssetModal } from '../components/modals/AssetModal';
import { MaintenanceModal } from '../components/modals/MaintenanceModal';
import { IssueModal } from '../components/modals/IssueModal';
import { ProjectModal } from '../components/modals/ProjectModal';

// Fix leaflet default icon assets
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom colored map marker based on risk / condition
const createCustomMarker = (risk?: string, condition?: string) => {
  let color = '#3b82f6'; // blue default
  let ring = '#93c5fd';
  if (risk === 'High' || condition === 'Critical' || condition === 'Poor') {
    color = '#ef4444'; // red
    ring = '#fca5a5';
  } else if (risk === 'Medium' || condition === 'Fair') {
    color = '#f59e0b'; // amber
    ring = '#fcd34d';
  } else if (condition === 'Excellent' || condition === 'Good') {
    color = '#10b981'; // emerald
    ring = '#6ee7b7';
  }

  return L.divIcon({
    className: 'custom-asset-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 0 0 2px ${ring}, 0 4px 10px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      ">
        <div style="width: 5px; height: 5px; background-color: white; border-radius: 50%;"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12]
  });
};

// Map controller to automatically fit bounds to markers or fly to selected asset
const MapBoundsController: React.FC<{ 
  assets: Asset[]; 
  focusedAsset: Asset | null;
  fitTrigger: number;
}> = ({ assets, focusedAsset, fitTrigger }) => {
  const map = useMap();

  useEffect(() => {
    if (focusedAsset && focusedAsset.latitude && focusedAsset.longitude) {
      map.flyTo([Number(focusedAsset.latitude), Number(focusedAsset.longitude)], 15, {
        duration: 1.2
      });
      return;
    }

    const validCoords = assets
      .filter(a => a.latitude !== undefined && a.longitude !== undefined && !isNaN(Number(a.latitude)) && !isNaN(Number(a.longitude)))
      .map(a => [Number(a.latitude), Number(a.longitude)] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [assets, focusedAsset, fitTrigger, map]);

  return null;
};

export const Dashboard: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // Map state
  const [mapFilter, setMapFilter] = useState<'All' | 'High Risk' | 'Operational' | 'Under Maintenance'>('All');
  const [focusedAsset, setFocusedAsset] = useState<Asset | null>(null);
  const [fitTrigger, setFitTrigger] = useState(0);

  // Modals state
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [maintAssetId, setMaintAssetId] = useState<string | undefined>();

  // Real-time Firestore sync
  useEffect(() => {
    setLoading(true);

    const unsubAssets = onSnapshot(collection(db, 'assets'), (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
      setLoading(false);
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    });

    const unsubIssues = onSnapshot(collection(db, 'issues'), (snap) => {
      setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() } as Issue)));
    });

    const unsubMaint = onSnapshot(collection(db, 'maintenanceRecords'), (snap) => {
      setMaintenance(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord)));
    });

    return () => {
      unsubAssets();
      unsubProjects();
      unsubIssues();
      unsubMaint();
    };
  }, []);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      await seedDemoData();
      setFitTrigger(prev => prev + 1);
    } catch (err: any) {
      alert("Error seeding data: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleScheduleMaintForAsset = (assetId: string) => {
    setMaintAssetId(assetId);
    setIsMaintModalOpen(true);
  };

  // Filtered assets for map
  const mappedAssets = assets.filter(a => {
    if (!a.latitude || !a.longitude || isNaN(Number(a.latitude)) || isNaN(Number(a.longitude))) {
      return false;
    }
    if (mapFilter === 'High Risk') return a.riskLevel === 'High' || a.condition === 'Critical';
    if (mapFilter === 'Operational') return a.status === 'Operational';
    if (mapFilter === 'Under Maintenance') return a.status === 'Maintenance';
    return true;
  });

  const highRiskAssets = assets.filter(a => a.riskLevel === 'High' || a.condition === 'Critical');
  const activeProjects = projects.filter(p => p.status !== 'Completed');
  const openIssues = issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed');
  const scheduledMaint = maintenance.filter(m => m.status === 'Scheduled' || m.status === 'In Progress');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time public asset governance, geographic spatial mapping, and lifecycle KPIs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => setIsAssetModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
          <button 
            onClick={() => { setMaintAssetId(undefined); setIsMaintModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            Schedule Work
          </button>
          <button 
            onClick={() => setIsIssueModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Report Issue
          </button>
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
            New Project
          </button>
          <button 
            onClick={handleSeed} 
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            title="Reset to fresh demo dataset"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" /> 
            {seeding ? 'Seeding...' : 'Reset Demo'}
          </button>
        </div>
      </div>

      {/* Interactive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link 
          to="/assets" 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between hover:border-blue-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center">
            <div className="bg-blue-50 group-hover:bg-blue-100 p-3 rounded-xl mr-4 transition-colors">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Assets</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{loading ? '-' : assets.length}</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
        </Link>

        <Link 
          to="/projects" 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between hover:border-indigo-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center">
            <div className="bg-indigo-50 group-hover:bg-indigo-100 p-3 rounded-xl mr-4 transition-colors">
              <FolderKanban className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Projects</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{loading ? '-' : activeProjects.length}</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
        </Link>

        <Link 
          to="/maintenance" 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center">
            <div className="bg-amber-50 group-hover:bg-amber-100 p-3 rounded-xl mr-4 transition-colors">
              <ClipboardCheck className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Maint. Scheduled</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{loading ? '-' : scheduledMaint.length}</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
        </Link>

        <Link 
          to="/issues" 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between hover:border-red-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center">
            <div className="bg-red-50 group-hover:bg-red-100 p-3 rounded-xl mr-4 transition-colors">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Open Hazards</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{loading ? '-' : openIssues.length}</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-red-600 transition-colors" />
        </Link>
      </div>

      {/* Main Grid: Interactive Map + Attention Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Spatial GIS Map */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden flex flex-col h-[560px]">
          {/* Map Header & Controls */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/75 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="text-sm font-bold text-slate-900">Spatial Asset Geography</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {mappedAssets.length} on map
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Map Filter Tabs */}
              <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-medium">
                {(['All', 'High Risk', 'Operational', 'Under Maintenance'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => { setMapFilter(filter); setFocusedAsset(null); }}
                    className={`px-2.5 py-1 rounded-md transition-colors ${
                      mapFilter === filter
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {/* Fit All Button */}
              <button
                onClick={() => { setFocusedAsset(null); setFitTrigger(prev => prev + 1); }}
                className="p-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                title="Fit all markers in view"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fit All</span>
              </button>
            </div>
          </div>

          {/* Map Container */}
          <div className="flex-1 w-full h-full relative z-0">
            <MapContainer 
              center={[23.0225, 72.5714]} 
              zoom={12} 
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />

              <MapBoundsController 
                assets={mappedAssets} 
                focusedAsset={focusedAsset} 
                fitTrigger={fitTrigger} 
              />

              {mappedAssets.map((asset) => (
                <Marker 
                  key={asset.id} 
                  position={[Number(asset.latitude), Number(asset.longitude)]}
                  icon={createCustomMarker(asset.riskLevel, asset.condition)}
                >
                  <Popup>
                    <div className="min-w-[200px] p-1 space-y-2">
                      <div>
                        <div className="font-bold text-sm text-slate-900">{asset.name}</div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {asset.type} • {asset.location}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          asset.condition === 'Critical' ? 'bg-red-100 text-red-700' :
                          asset.condition === 'Poor' ? 'bg-orange-100 text-orange-700' :
                          asset.condition === 'Fair' ? 'bg-amber-100 text-amber-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {asset.condition} Condition
                        </span>

                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {asset.status}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <Link 
                          to={`/assets/${asset.id}`} 
                          className="font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Details
                        </Link>
                        <button
                          onClick={() => handleScheduleMaintForAsset(asset.id!)}
                          className="font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-0.5"
                        >
                          <Wrench className="w-3.5 h-3.5 text-blue-600" /> Work Order
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>

            {/* Map Legend */}
            <div className="absolute bottom-3 left-3 z-[1000] bg-white p-2 rounded-lg shadow-md border border-slate-200 text-[11px] font-medium text-slate-700 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Good / Safe
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Medium Risk
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Critical / High Risk
              </span>
            </div>
          </div>
        </div>

        {/* Right Side Column: Attention Required & Quick Focus */}
        <div className="flex flex-col gap-6 h-[560px]">
          {/* Critical Assets List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/75 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Critical Attention ({highRiskAssets.length})
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
              {highRiskAssets.length === 0 ? (
                <div className="text-center text-slate-500 text-xs py-10">
                  No high-risk assets currently flagged.
                </div>
              ) : (
                highRiskAssets.map(asset => (
                  <div key={asset.id} className="pt-2 first:pt-0 flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-semibold text-slate-900 truncate">{asset.name}</h3>
                      <p className="text-[11px] text-red-600 font-medium">
                        {asset.condition} • Risk: {asset.riskLevel}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {asset.latitude && asset.longitude && (
                        <button
                          onClick={() => setFocusedAsset(asset)}
                          className="px-2 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition-colors"
                          title="Zoom to location on map"
                        >
                          Locate
                        </button>
                      )}
                      <Link 
                        to={`/assets/${asset.id}`} 
                        className="px-2 py-1 text-[11px] font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 rounded transition-colors"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Active Hazards / Issues */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/75 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-orange-500" />
                Recent Hazards ({openIssues.length})
              </h2>
              <Link to="/issues" className="text-[11px] text-blue-600 font-semibold hover:underline">
                View All
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
              {openIssues.slice(0, 5).map(issue => (
                <div key={issue.id} className="pt-2 first:pt-0 flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-900 truncate">{issue.title}</p>
                    <p className="text-[11px] text-slate-500">Asset: {issue.assetId} • Due: {issue.dueDate?.toDate ? new Date(issue.dueDate.toDate()).toLocaleDateString() : 'Pending'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    issue.severity === 'Critical' ? 'bg-red-100 text-red-800' :
                    issue.severity === 'High' ? 'bg-orange-100 text-orange-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {issue.severity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Modals wired to Dashboard actions */}
      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onSuccess={() => setFitTrigger(prev => prev + 1)}
      />

      <MaintenanceModal
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
        defaultAssetId={maintAssetId}
        onSuccess={() => {}}
      />

      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={() => {}}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSuccess={() => {}}
      />
    </div>
  );
};
