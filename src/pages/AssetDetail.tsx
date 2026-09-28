import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Asset, Inspection, Issue, MaintenanceRecord, Project } from '../types';
import { 
  Building2, ArrowLeft, Activity, MapPin, 
  ShieldAlert, CheckCircle2, Pencil, Plus, 
  Wrench, ClipboardCheck, AlertTriangle, FolderKanban
} from 'lucide-react';
import { AssetModal } from '../components/modals/AssetModal';
import { MaintenanceModal } from '../components/modals/MaintenanceModal';
import { IssueModal } from '../components/modals/IssueModal';
import { InspectionModal } from '../components/modals/InspectionModal';

const tabs = ['Overview', 'Lifecycle', 'Inspections', 'Issues', 'Maintenance', 'Project'];

export const AssetDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Overview');

  // Related data
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Modal triggers
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isInspModalOpen, setIsInspModalOpen] = useState(false);

  const fetchAssetAndRelated = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const docRef = doc(db, 'assets', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setAsset({ id: docSnap.id, ...docSnap.data() } as Asset);
      }

      // Fetch related records
      // 1. Inspections
      try {
        const inspSnap = await getDocs(collection(db, 'inspections'));
        const inspData = inspSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Inspection))
          .filter(i => i.assetId === id || i.assetId === 'demo-asset');
        setInspections(inspData);
      } catch (e) {
        console.warn('Could not fetch inspections for asset:', e);
      }

      // 2. Issues
      try {
        const issueSnap = await getDocs(collection(db, 'issues'));
        const issueData = issueSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Issue))
          .filter(i => i.assetId === id || i.assetId === 'demo-asset');
        setIssues(issueData);
      } catch (e) {
        console.warn('Could not fetch issues for asset:', e);
      }

      // 3. Maintenance
      try {
        const maintSnap = await getDocs(collection(db, 'maintenanceRecords'));
        const maintData = maintSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord))
          .filter(m => m.assetId === id || m.assetId === 'demo-asset');
        setMaintenance(maintData);
      } catch (e) {
        console.warn('Could not fetch maintenance for asset:', e);
      }

      // 4. Projects
      try {
        const projSnap = await getDocs(collection(db, 'projects'));
        const projData = projSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as Project))
          .filter(p => p.assetId === id);
        setProjects(projData);
      } catch (e) {
        console.warn('Could not fetch projects for asset:', e);
      }

    } catch (error) {
      console.error("Error fetching asset details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetAndRelated();
  }, [id]);

  if (loading) return <div className="p-12 text-center text-slate-500">Loading asset details...</div>;
  
  if (!asset) return (
    <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
      <h2 className="text-xl font-bold text-slate-900">Asset not found</h2>
      <p className="text-sm text-slate-500 mt-2">The requested asset ID does not exist or may have been removed.</p>
      <button onClick={() => navigate('/assets')} className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
        Return to Assets
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Top Bar with Back and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/assets')} 
            className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors bg-white border border-slate-200"
            aria-label="Back to assets"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{asset.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {asset.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Asset ID: {asset.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Pencil className="w-4 h-4 text-slate-500" />
            Edit Asset
          </button>
          <button
            onClick={() => setIsMaintModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Schedule Work
          </button>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs Header */}
        <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/75 px-4 pt-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-blue-600 text-blue-600 bg-white font-semibold rounded-t-lg' 
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {activeTab === 'Overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-4">Core Specifications</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Asset Category</p>
                      <p className="font-semibold text-slate-900 flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-400" /> {asset.type}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Physical Location</p>
                      <p className="font-semibold text-slate-900 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400" /> {asset.location}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Supervising Department</p>
                      <p className="font-semibold text-slate-900">{asset.departmentId}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Operating Agency / Custodian</p>
                      <p className="font-semibold text-slate-900">{asset.owner || 'Unassigned'}</p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">GPS Coordinates</p>
                      <p className="font-mono text-sm text-slate-800">
                        {asset.latitude !== undefined && asset.longitude !== undefined 
                          ? `${asset.latitude.toFixed(4)}, ${asset.longitude.toFixed(4)}`
                          : 'Not calibrated'}
                      </p>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Valuation</p>
                      <p className="font-semibold text-slate-900">
                        ${((asset as any).estimatedValue || 500000).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">Description & Scope</h3>
                  <p className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {asset.description || 'No engineering notes provided for this asset record.'}
                  </p>
                </div>
              </div>
              
              {/* Sidebar Cards */}
              <div className="space-y-5">
                <div className={`p-5 rounded-xl border ${
                  asset.condition === 'Critical' ? 'bg-red-50 border-red-200' :
                  asset.condition === 'Poor' ? 'bg-orange-50 border-orange-200' :
                  asset.condition === 'Fair' ? 'bg-amber-50 border-amber-200' :
                  'bg-emerald-50 border-emerald-200'
                }`}>
                  <h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    {asset.condition === 'Critical' ? <ShieldAlert className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    Health Assessment
                  </h3>
                  <p className="text-3xl font-extrabold text-slate-900 mt-1">{asset.condition}</p>
                  <p className="text-xs mt-2 text-slate-600">
                    Risk Classification: <strong className="text-slate-900 uppercase">{asset.riskLevel}</strong>
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Quick Dispatch Actions
                  </h3>
                  <div className="space-y-2">
                    <button 
                      onClick={() => setIsInspModalOpen(true)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors border border-slate-100 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-blue-600" /> Log Inspection
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">Conduct check</span>
                    </button>
                    <button 
                      onClick={() => setIsIssueModalOpen(true)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-red-50 hover:text-red-700 rounded-lg transition-colors border border-slate-100 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" /> Report Defect
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">Flag hazard</span>
                    </button>
                    <button 
                      onClick={() => setIsMaintModalOpen(true)}
                      className="w-full text-left px-3.5 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg transition-colors border border-slate-100 flex items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-emerald-600" /> Schedule Maintenance
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal">Work order</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'Lifecycle' && (
            <div className="py-6 max-w-2xl">
              <h3 className="text-lg font-bold text-slate-900 mb-8">Asset Lifecycle Progression</h3>
              <div className="relative pl-6">
                <div className="absolute left-11 top-4 bottom-4 w-0.5 bg-slate-200" />
                
                {['Planning', 'Procurement', 'Implementation', 'Commissioning', 'Operational', 'Maintenance', 'Retirement'].map((stage, i) => {
                  const stages = ['Planning', 'Procurement', 'Implementation', 'Commissioning', 'Operational', 'Maintenance', 'Retirement'];
                  const currentIndex = stages.indexOf(asset.status);
                  const stageIndex = stages.indexOf(stage);
                  const isPast = stageIndex < currentIndex;
                  const isCurrent = stageIndex === currentIndex;
                  
                  return (
                    <div key={stage} className="relative flex items-start gap-5 mb-8 last:mb-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-4 border-white ${
                        isPast ? 'bg-emerald-500' : isCurrent ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-200'
                      }`}>
                        {isPast ? <CheckCircle2 className="w-5 h-5 text-white" /> : <span className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-slate-500'}`}>{i + 1}</span>}
                      </div>
                      <div className="pt-1">
                        <h4 className={`text-base font-semibold ${isCurrent ? 'text-blue-700 font-bold' : 'text-slate-900'}`}>{stage}</h4>
                        <p className="text-slate-500 text-xs mt-0.5">
                          {isPast ? 'Stage completed & audited' : isCurrent ? 'Currently active operational stage' : 'Future milestone'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'Inspections' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">Inspection History</h3>
                <button
                  onClick={() => setIsInspModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Inspection
                </button>
              </div>

              {inspections.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  <ClipboardCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm">No inspections recorded for this asset yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {inspections.map((insp) => (
                    <div key={insp.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            insp.condition === 'Critical' ? 'bg-red-100 text-red-700' :
                            insp.condition === 'Poor' ? 'bg-orange-100 text-orange-700' :
                            'bg-emerald-100 text-emerald-700'
                          }`}>
                            {insp.condition}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">{insp.inspector}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{insp.findings}</p>
                        {insp.recommendation && (
                          <p className="text-xs text-blue-600 mt-1">Rec: {insp.recommendation}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {insp.date?.toDate ? new Date(insp.date.toDate()).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Issues' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">Recorded Discrepancies & Hazards</h3>
                <button
                  onClick={() => setIsIssueModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Report Issue
                </button>
              </div>

              {issues.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  <AlertTriangle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm">No issues reported for this asset.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {issues.map((iss) => (
                    <div key={iss.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            iss.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {iss.severity}
                          </span>
                          <span className="text-sm font-semibold text-slate-900">{iss.title}</span>
                          <span className="text-xs text-slate-400 font-mono">({iss.status})</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{iss.description}</p>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {iss.reportedBy}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Maintenance' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-slate-900">Maintenance Records</h3>
                <button
                  onClick={() => setIsMaintModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" /> Schedule Task
                </button>
              </div>

              {maintenance.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm">No maintenance history logged for this asset.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {maintenance.map((m) => (
                    <div key={m.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{m.type}</span>
                          <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
                            {m.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Contractor: {m.contractor} • Cost: ${m.cost}</p>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {m.plannedDate?.toDate ? new Date(m.plannedDate.toDate()).toLocaleDateString() : 'Scheduled'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'Project' && (
            <div className="space-y-4">
              <h3 className="text-base font-bold text-slate-900">Capital Projects Associated with this Asset</h3>
              {projects.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  <FolderKanban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm">No ongoing capital projects assigned directly to this asset.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {projects.map((proj) => (
                    <div key={proj.id} className="p-4 hover:bg-slate-50 flex items-start justify-between gap-4">
                      <div>
                        <span className="text-sm font-semibold text-slate-900">{proj.name}</span>
                        <p className="text-xs text-slate-500 mt-1">
                          Contractor: {proj.contractor} • Stage: {proj.status} • Progress: {proj.progressPercent}%
                        </p>
                      </div>
                      <span className="text-xs font-mono font-medium text-slate-700">
                        ${proj.spent.toLocaleString()} / ${proj.budget.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AssetModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        assetToEdit={asset}
        onSuccess={fetchAssetAndRelated}
      />
      <MaintenanceModal
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
        defaultAssetId={asset.id}
        onSuccess={fetchAssetAndRelated}
      />
      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        defaultAssetId={asset.id}
        onSuccess={fetchAssetAndRelated}
      />
      <InspectionModal
        isOpen={isInspModalOpen}
        onClose={() => setIsInspModalOpen(false)}
        defaultAssetId={asset.id}
        onSuccess={fetchAssetAndRelated}
      />
    </div>
  );
};
