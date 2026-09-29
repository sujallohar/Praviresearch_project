import React, { useEffect, useState } from 'react';
import { 
  Megaphone, CheckCircle2, Clock, AlertTriangle, 
  Building2, Wrench, Shield, Filter, Plus, 
  MapPin, Calendar, Sparkles, Eye, ArrowRight
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Asset, Project, Issue, MaintenanceRecord } from '../types';
import { IssueModal } from '../components/modals/IssueModal';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

interface UpdateItem {
  id: string;
  type: 'Maintenance' | 'Project' | 'Issue' | 'Advisory';
  title: string;
  department: string;
  location?: string;
  date: string;
  status: string;
  summary: string;
  impact: string;
  badgeColor: string;
}

export const PublicUpdates: React.FC = () => {
  const { role, switchRole } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubAssets = onSnapshot(collection(db, 'assets'), snap => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset)));
      setLoading(false);
    });
    const unsubProjects = onSnapshot(collection(db, 'projects'), snap => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() } as Project)));
    });
    const unsubIssues = onSnapshot(collection(db, 'issues'), snap => {
      setIssues(snap.docs.map(d => ({ id: d.id, ...d.data() } as Issue)));
    });
    const unsubMaint = onSnapshot(collection(db, 'maintenanceRecords'), snap => {
      setMaintenance(snap.docs.map(d => ({ id: d.id, ...d.data() } as MaintenanceRecord)));
    });

    return () => {
      unsubAssets();
      unsubProjects();
      unsubIssues();
      unsubMaint();
    };
  }, []);

  // Build public updates feed from live data
  const feedItems: UpdateItem[] = [
    // Project updates
    ...projects.map(p => ({
      id: `proj-${p.id}`,
      type: 'Project' as const,
      title: p.name,
      department: p.departmentId || 'Infrastructure',
      location: 'Municipal Zone',
      date: p.updatedAt ? new Date(p.updatedAt.seconds ? p.updatedAt.seconds * 1000 : p.updatedAt).toLocaleDateString() : 'Active',
      status: p.status,
      summary: p.description || `Civil project milestone at ${p.progressPercent}% completion.`,
      impact: `Progress: ${p.progressPercent}% • Contractor: ${p.contractor || 'Public Works'}`,
      badgeColor: p.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-blue-100 text-blue-800 border-blue-300'
    })),
    // Maintenance updates
    ...maintenance.map(m => {
      const relatedAsset = assets.find(a => a.id === m.assetId);
      return {
        id: `maint-${m.id}`,
        type: 'Maintenance' as const,
        title: `${m.type} on ${relatedAsset?.name || 'Public Asset'}`,
        department: relatedAsset?.departmentId || 'Public Works',
        location: relatedAsset?.location || 'Municipal Area',
        date: m.actualDate || m.plannedDate || 'Recent',
        status: m.status,
        summary: m.notes || `Scheduled servicing and safety certification.`,
        impact: `Status: ${m.status} • Performed by: ${m.contractor || 'Municipal Engineers'}`,
        badgeColor: m.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'
      };
    }),
    // Resolved and open citizen issues
    ...issues.map(i => {
      const relatedAsset = assets.find(a => a.id === i.assetId);
      return {
        id: `issue-${i.id}`,
        type: 'Issue' as const,
        title: i.title,
        department: relatedAsset?.departmentId || 'Civic Infrastructure',
        location: relatedAsset?.location || 'Public Area',
        date: i.createdAt ? new Date(i.createdAt.seconds ? i.createdAt.seconds * 1000 : i.createdAt).toLocaleDateString() : 'Reported',
        status: i.status,
        summary: i.description,
        impact: `Severity: ${i.severity} • Assigned: ${i.assignedTo || 'Field Team'}`,
        badgeColor: i.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
      };
    })
  ];

  const departments = ['All', ...Array.from(new Set(feedItems.map(f => f.department).filter(Boolean)))];

  const filteredFeed = feedItems.filter(item => {
    if (selectedDept === 'All') return true;
    return item.department.toLowerCase() === selectedDept.toLowerCase();
  });

  const completedProjects = projects.filter(p => p.status === 'Completed').length;
  const resolvedIssues = issues.filter(i => i.status === 'Resolved').length;
  const activeMaint = maintenance.filter(m => m.status === 'In Progress' || m.status === 'Scheduled').length;

  return (
    <div className="space-y-6">
      {/* Public Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Public Transparency Portal • No Login Required
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Municipal Infrastructure Updates & Citizen Board
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100 leading-relaxed">
            Real-time public tracking of government assets, road resurfacing, water utility repairs, and public work progress. All citizens can view live milestones and directly report local issues.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => setIsIssueModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm rounded-xl shadow-sm transition-all"
            >
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Report a Civic Issue (Citizen)
            </button>
            <Link
              to="/assets"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600/60 hover:bg-blue-600 text-white font-semibold text-sm rounded-xl border border-blue-400/30 transition-all"
            >
              <Eye className="w-4 h-4 text-blue-200" />
              Explore Public Assets
            </Link>
          </div>
        </div>

        {/* Decorative background element */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial-gradient opacity-15 pointer-events-none" />
      </div>

      {/* Citizen Transparency Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Assets Monitored</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : assets.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">100% public visibility</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Completed Projects</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : completedProjects}
          </div>
          <span className="text-[11px] text-slate-500">Delivered on public budget</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Active Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : activeMaint}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">Currently underway</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Resolved Issues</span>
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : resolvedIssues}
          </div>
          <span className="text-[11px] text-indigo-700 font-medium">Citizen reports closed</span>
        </div>
      </div>

      {/* Filter by Department */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Filter className="w-4 h-4 text-blue-600" />
          <span>Filter by Department:</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {departments.map(dept => (
            <button
              key={dept}
              onClick={() => setSelectedDept(dept)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                selectedDept === dept
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Updates Timeline List */}
      <div className="space-y-3">
        {filteredFeed.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
            <Megaphone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-sm">No updates found for {selectedDept}.</p>
          </div>
        ) : (
          filteredFeed.map(item => (
            <div 
              key={item.id} 
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${item.badgeColor}`}>
                    {item.status}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    {item.type} • {item.department}
                  </span>
                  {item.date && (
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {item.date}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900">
                  {item.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {item.summary}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-slate-500">
                  {item.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      {item.location}
                    </span>
                  )}
                  <span className="font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    {item.impact}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setIsIssueModalOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Report Feedback
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Citizen Issue Report Modal */}
      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        assets={assets}
      />
    </div>
  );
};
