import React, { useEffect, useState } from 'react';
import { 
  Building2, FolderKanban, AlertTriangle, 
  Activity, Database, MapPin, 
  Plus, ZoomIn, Eye, Wrench, ArrowUpRight, 
  Megaphone, Lock, ShieldCheck, CheckCircle2
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
import { RbacModal } from '../components/modals/RbacModal';
import { useAuth, type UserRole } from '../context/AuthContext';
import { formatTimestamp } from '../utils/dateUtils';

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
  const { 
    role, 
    isPublicCitizen, 
    canCreateAsset, 
    canCreateProject, 
    canScheduleMaintenance, 
    logout 
  } = useAuth();

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

  // RBAC Permission Modal state
  const [rbacModalOpen, setRbacModalOpen] = useState(false);
  const [rbacActionTitle, setRbacActionTitle] = useState('');
  const [rbacRequiredRoles, setRbacRequiredRoles] = useState<UserRole[]>([]);
  const [rbacExplanation, setRbacExplanation] = useState('');

  // Real-time Firestore sync
  useEffect(() => {
    setLoading(true);

    const unsubAssets = onSnapshot(collection(db, 'assets'), (snap) => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
      setLoading(false);
    }, (err) => {
      console.warn("Assets snapshot error:", err);
      setLoading(false);
    });

    const unsubProjects = onSnapshot(collection(db, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    }, (err) => {
      console.warn("Projects snapshot error:", err);
    });

    const unsubIssues = onSnapshot(collection(db, 'issues'), (snap) => {
      setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() } as Issue)));
    }, (err) => {
      console.warn("Issues snapshot error:", err);
    });

    const unsubMaint = onSnapshot(collection(db, 'maintenanceRecords'), (snap) => {
      setMaintenance(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord)));
    }, (err) => {
      console.warn("Maintenance snapshot error:", err);
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
      alert("Demo data successfully loaded into Cloud Firestore!");
    } catch (err: any) {
      alert("Error seeding data: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  // RBAC-gated Action Triggers
  const handleTriggerRegisterAsset = () => {
    if (!canCreateAsset) {
      setRbacActionTitle("Register New Asset");
      setRbacRequiredRoles(['Government Officer', 'Admin']);
      setRbacExplanation("Creating and registering public infrastructure assets is restricted to authorized Government Officers and Administrators. As a Public Citizen or Field Engineer, you can browse assets and report issues.");
      setRbacModalOpen(true);
      return;
    }
    setIsAssetModalOpen(true);
  };

  const handleTriggerScheduleWork = () => {
    if (!canScheduleMaintenance) {
      setRbacActionTitle("Schedule Maintenance Work");
      setRbacRequiredRoles(['Government Officer', 'Field Engineer', 'Admin']);
      setRbacExplanation("Issuing maintenance work orders requires operational privileges granted to Field Engineers, Department Officers, or Administrators.");
      setRbacModalOpen(true);
      return;
    }
    setMaintAssetId(undefined);
    setIsMaintModalOpen(true);
  };

  const handleTriggerNewProject = () => {
    if (!canCreateProject) {
      setRbacActionTitle("Create New Capital Project");
      setRbacRequiredRoles(['Government Officer', 'Admin']);
      setRbacExplanation("Creating and funding municipal infrastructure projects requires Government Officer or Admin authorization.");
      setRbacModalOpen(true);
      return;
    }
    setIsProjectModalOpen(true);
  };

  const handleScheduleMaintForAsset = (assetId: string) => {
    if (!canScheduleMaintenance) {
      setRbacActionTitle("Schedule Maintenance for Asset");
      setRbacRequiredRoles(['Government Officer', 'Field Engineer', 'Admin']);
      setRbacExplanation("Scheduling maintenance on specific assets is reserved for Field Engineers and Officers.");
      setRbacModalOpen(true);
      return;
    }
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
      {/* Public Citizen & Transparency Welcome Banner */}
      {isPublicCitizen ? (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col gap-3 sm:gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-[10px] sm:text-xs font-semibold mb-2">
                <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Public Portal • Open Access
              </div>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-extrabold tracking-tight leading-tight">
                Live Infrastructure Transparency Portal
              </h2>
              <p className="text-[11px] sm:text-xs lg:text-sm text-blue-100 mt-1 leading-relaxed">
                Unrestricted live access to infrastructure maps, road projects, and maintenance updates. Report hazards directly.
              </p>
            </div>

            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2">
              <button
                onClick={() => setIsIssueModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Report a Civic Issue
              </button>
              <Link
                to="/updates"
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 bg-blue-600/70 hover:bg-blue-600 text-white font-semibold text-xs rounded-xl border border-blue-400/30 transition-all"
              >
                <Megaphone className="w-4 h-4 text-blue-200" />
                Citizen Updates Feed
              </Link>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-3 border-t border-blue-600/40 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-blue-200">
            <span>Certified officer or inspector?</span>
            <Link 
              to="/login"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-900 hover:bg-blue-50 font-bold text-xs rounded-lg transition-colors shadow-xs"
            >
              Staff Login →
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900">Active Role: {role}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                  Authorized Staff
                </span>
              </div>
              <p className="text-xs text-slate-500">
                You have verified operational permissions to manage records, inspections, and work orders.
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-xs font-semibold text-slate-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-red-50 transition-colors"
          >
            Sign Out to Public View
          </button>
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Overview Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time asset governance, spatial mapping, and lifecycle KPIs.
          </p>
        </div>
        <div className="flex overflow-x-auto gap-2 pb-1 -mx-1 px-1 scrollbar-hide">
          <button 
            onClick={handleTriggerRegisterAsset}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all whitespace-nowrap flex-shrink-0"
            title={canCreateAsset ? "Register a new asset" : "Restricted: Officer/Admin only"}
          >
            {canCreateAsset ? <Plus className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 opacity-80" />}
            Register Asset
          </button>
          <button 
            onClick={handleTriggerScheduleWork}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
            title={canScheduleMaintenance ? "Schedule maintenance" : "Restricted: Engineer/Officer only"}
          >
            {canScheduleMaintenance ? <Wrench className="w-3.5 h-3.5 text-blue-600" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
            Schedule Work
          </button>
          <button 
            onClick={() => setIsIssueModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
            title="Open to everyone (Citizens & Staff)"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            Report Issue
          </button>
          <button 
            onClick={handleTriggerNewProject}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
            title={canCreateProject ? "New capital project" : "Restricted: Officer/Admin only"}
          >
            {canCreateProject ? <FolderKanban className="w-3.5 h-3.5 text-indigo-600" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
            New Project
          </button>
          <button 
            onClick={handleSeed} 
            disabled={seeding}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 whitespace-nowrap flex-shrink-0"
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

        <Link 
          to="/maintenance" 
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center">
            <div className="bg-amber-50 group-hover:bg-amber-100 p-3 rounded-xl mr-4 transition-colors">
              <Wrench className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Work Orders</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{loading ? '-' : scheduledMaint.length}</p>
            </div>
          </div>
          <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
        </Link>
      </div>

      {/* Main Grid: Interactive Map + Status Side Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left 2 Cols: GIS Spatial Map */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-3 sm:p-4 flex flex-col h-[320px] sm:h-[420px] lg:h-[520px]">
          <div className="flex flex-col gap-2 mb-2 sm:mb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
                  <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                  <span className="truncate">GIS Asset Monitor</span>
                </h2>
                <p className="text-[10px] sm:text-xs text-slate-500">
                  {mappedAssets.length} mapped assets with condition color coding.
                </p>
              </div>
              <button
                onClick={() => { setFocusedAsset(null); setFitTrigger(prev => prev + 1); }}
                className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex-shrink-0"
                title="Fit all markers in view"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Map Filters — horizontally scrollable on mobile */}
            <div className="flex overflow-x-auto gap-1 scrollbar-hide -mx-1 px-1">
              <div className="flex bg-slate-100 p-0.5 rounded-lg text-[11px] sm:text-xs font-semibold flex-shrink-0">
                {(['All', 'High Risk', 'Operational', 'Under Maintenance'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setMapFilter(tab); setFocusedAsset(null); }}
                    className={`px-2 sm:px-2.5 py-1 rounded-md transition-all whitespace-nowrap ${
                      mapFilter === tab 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Map Leaflet Container */}
          <div className="flex-1 rounded-lg overflow-hidden border border-slate-200 relative z-0">
            <MapContainer
              center={[28.6139, 77.2090]} // New Delhi / National Capital center
              zoom={11}
              style={{ height: '100%', width: '100%' }}
              className="z-0"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapBoundsController 
                assets={mappedAssets} 
                focusedAsset={focusedAsset}
                fitTrigger={fitTrigger} 
              />

              {mappedAssets.map(asset => (
                <Marker
                  key={asset.id}
                  position={[Number(asset.latitude), Number(asset.longitude)]}
                  icon={createCustomMarker(asset.riskLevel, asset.condition)}
                >
                  <Popup>
                    <div className="p-1 min-w-[210px] space-y-2">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-1.5">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs leading-tight">{asset.name}</h4>
                          <p className="text-[11px] text-slate-500">{asset.type} • {asset.departmentId}</p>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          asset.condition === 'Critical' || asset.condition === 'Poor' ? 'bg-red-100 text-red-800' :
                          asset.condition === 'Fair' ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {asset.condition}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-0.5">
                        <p><strong className="text-slate-700">Location:</strong> {asset.location}</p>
                        <p><strong className="text-slate-700">Status:</strong> {asset.status}</p>
                        <p><strong className="text-slate-700">Risk:</strong> {asset.riskLevel}</p>
                      </div>

                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                        <Link
                          to={`/assets/${asset.id}`}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" /> Full Profile
                        </Link>
                        <button
                          onClick={() => handleScheduleMaintForAsset(asset.id!)}
                          className="text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 px-2 py-0.5 rounded"
                        >
                          Work Order
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Map Legend */}
          <div className="mt-2 sm:mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px] sm:text-[11px] text-slate-500 pt-1">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <span className="flex items-center gap-1 sm:gap-1.5 font-medium">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                Good
              </span>
              <span className="flex items-center gap-1 sm:gap-1.5 font-medium">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-amber-500 inline-block"></span>
                Fair
              </span>
              <span className="flex items-center gap-1 sm:gap-1.5 font-medium">
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500 inline-block"></span>
                Critical
              </span>
            </div>
            <span className="hidden sm:inline">Click any marker to inspect asset lifecycle</span>
          </div>
        </div>

        {/* Right 1 Col: High Risk Watchlist & Recent Hazards */}
        <div className="flex flex-col gap-4 h-auto lg:h-[520px]">
          {/* Critical Risk Attention List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 overflow-hidden flex flex-col">
            <div className="p-3.5 border-b border-slate-200 bg-slate-50/75 flex justify-between items-center">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Critical Attention ({highRiskAssets.length})
              </h2>
              <span className="text-[11px] text-red-600 font-semibold bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                Action Required
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 divide-y divide-slate-100">
              {highRiskAssets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No assets currently flagged at critical risk.
                </div>
              ) : (
                highRiskAssets.slice(0, 5).map(asset => (
                  <div key={asset.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{asset.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{asset.location} • {asset.type}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
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
                    <p className="text-[11px] text-slate-500">Asset: {issue.assetId} • Due: {formatTimestamp(issue.dueDate, 'Pending')}</p>
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

      {/* Live Public Updates & Transparency Feed for Citizens and Visitors */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-blue-600" />
              Live Infrastructure Updates & Civic Activity
            </h2>
            <p className="text-xs text-slate-500">
              Transparent real-time feed of completed maintenance, road repairs, and project progress visible to all citizens.
            </p>
          </div>
          <Link
            to="/updates"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            Open Dedicated Citizen Board <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Recent Maintenance Completed */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-blue-600" />
                Latest Maintenance
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-semibold">
                Servicing
              </span>
            </div>
            {maintenance.slice(0, 3).map(m => (
              <div key={m.id} className="py-2 border-b border-slate-200 last:border-b-0">
                <p className="text-xs font-bold text-slate-900">{m.type}</p>
                <p className="text-[11px] text-slate-500 line-clamp-1">{m.notes || `Work order executed for asset ${m.assetId}`}</p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span>Status: <strong className="text-slate-700">{m.status}</strong></span>
                  <span>{formatTimestamp(m.actualDate || m.plannedDate, 'Scheduled')}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Capital Projects Milestones */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
              <span className="flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5 text-indigo-600" />
                Active Projects Progress
              </span>
              <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-semibold">
                Civil Works
              </span>
            </div>
            {projects.slice(0, 3).map(p => (
              <div key={p.id} className="py-2 border-b border-slate-200 last:border-b-0">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900 truncate max-w-[170px]">{p.name}</p>
                  <span className="text-[11px] font-bold text-indigo-700">{p.progressPercent}%</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all"
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                  <span>Contractor: {p.contractor || 'Public Works'}</span>
                  <span className="font-semibold text-slate-600">{p.status}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Resolved Civic Issues */}
          <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Resolved Civic Reports
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-semibold">
                Fixed
              </span>
            </div>
            {issues.slice(0, 3).map(i => (
              <div key={i.id} className="py-2 border-b border-slate-200 last:border-b-0">
                <p className="text-xs font-bold text-slate-900 truncate">{i.title}</p>
                <p className="text-[11px] text-slate-500 line-clamp-1">{i.description}</p>
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="text-slate-400">Severity: {i.severity}</span>
                  <span className={`font-semibold ${i.status === 'Resolved' ? 'text-emerald-600' : 'text-slate-600'}`}>
                    {i.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Action Modals */}
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

      {/* RBAC Permission Notice Modal */}
      <RbacModal
        isOpen={rbacModalOpen}
        onClose={() => setRbacModalOpen(false)}
        actionTitle={rbacActionTitle}
        requiredRoles={rbacRequiredRoles}
        explanation={rbacExplanation}
      />
    </div>
  );
};
