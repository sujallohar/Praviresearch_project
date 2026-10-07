import React, { useEffect, useState } from 'react';
import { 
  Megaphone, CheckCircle2, Clock, AlertTriangle, 
  Building2, Wrench, Filter, 
  MapPin, Sparkles, Eye, Camera, Star, ThumbsUp, DollarSign
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import type { Asset, Project, Issue, MaintenanceRecord, CitizenFeedback } from '../types';
import { IssueModal } from '../components/modals/IssueModal';
import { StructuralDefectScanner } from '../components/ai/StructuralDefectScanner';
import { ProjectFeedbackModal } from '../components/modals/ProjectFeedbackModal';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { formatTimestamp } from '../utils/dateUtils';
import { calculatePortfolioPredictiveMetrics } from '../utils/predictiveEngine';

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
  const { currentUser } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [feedbackList, setFeedbackList] = useState<CitizenFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Active'>('All');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [prefilledIssue, setPrefilledIssue] = useState<any>(null);

  // Dedicated Citizen Review & Feedback Modal state
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [selectedItemForFeedback, setSelectedItemForFeedback] = useState<any>(null);
  const [selectedExistingFeedback, setSelectedExistingFeedback] = useState<CitizenFeedback | null>(null);
  const [selectedInitialRating, setSelectedInitialRating] = useState<number>(4);

  // Citizen interactive ratings state fallback from localStorage
  const [ratings, setRatings] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('govasset_citizen_ratings');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [ratedFeedbackMessage, setRatedFeedbackMessage] = useState<string | null>(null);

  // Persistent guest identifier for non-logged-in citizens
  const getGuestIdentifier = () => {
    if (currentUser?.uid) return currentUser.uid;
    let guestId = localStorage.getItem('govasset_citizen_guest_id');
    if (!guestId) {
      guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('govasset_citizen_guest_id', guestId);
    }
    return guestId;
  };

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
    const unsubFeedback = onSnapshot(collection(db, 'citizenFeedback'), snap => {
      setFeedbackList(snap.docs.map(d => ({ id: d.id, ...d.data() } as CitizenFeedback)));
    });

    return () => {
      unsubAssets();
      unsubProjects();
      unsubIssues();
      unsubMaint();
      unsubFeedback();
    };
  }, []);

  const handleOpenFeedback = (item: UpdateItem, star?: number) => {
    const guestId = getGuestIdentifier();
    const existing = feedbackList.find(f => 
      f.itemId === item.id && (
        (currentUser?.uid && f.userId === currentUser.uid) ||
        (currentUser?.email && f.userEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
        f.userId === guestId
      )
    );

    setSelectedItemForFeedback({
      id: item.id,
      title: item.title,
      type: item.type,
      department: item.department,
      location: item.location
    });
    setSelectedExistingFeedback(existing || null);
    setSelectedInitialRating(star || existing?.rating || ratings[item.id] || 4);
    setFeedbackModalOpen(true);
  };

  // Build public updates feed from live data
  const feedItems: UpdateItem[] = [
    // Project updates
    ...projects.map(p => ({
      id: `proj-${p.id}`,
      type: 'Project' as const,
      title: p.name,
      department: p.departmentId || 'Infrastructure',
      location: 'Municipal Zone',
      date: formatTimestamp(p.updatedAt, 'Active'),
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
        date: formatTimestamp(m.actualDate || m.plannedDate, 'Recent'),
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
        date: formatTimestamp(i.createdAt, 'Reported'),
        status: i.status,
        summary: i.description,
        impact: `Severity: ${i.severity} • Assigned: ${i.assignedTo || 'Field Team'}`,
        badgeColor: i.status === 'Resolved' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-rose-100 text-rose-800 border-rose-300'
      };
    })
  ];

  const departments = ['All', ...Array.from(new Set(feedItems.map(f => f.department).filter(Boolean)))];

  const filteredFeed = feedItems.filter(item => {
    const matchesDept = selectedDept === 'All' || item.department.toLowerCase() === selectedDept.toLowerCase();
    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Completed' && (item.status === 'Completed' || item.status === 'Resolved')) ||
      (statusFilter === 'Active' && item.status !== 'Completed' && item.status !== 'Resolved');
    return matchesDept && matchesStatus;
  });

  const activeMaint = maintenance.filter(m => m.status === 'In Progress' || m.status === 'Scheduled').length;

  // Calculate live taxpayer savings from predictive engine
  const predictiveMetrics = calculatePortfolioPredictiveMetrics(assets, maintenance);
  const totalTaxpayerSavingsMillions = (predictiveMetrics.totalPreventativeSavings / 1000000).toFixed(2);

  return (
    <div className="space-y-6">
      {/* Toast Feedback Notification */}
      {ratedFeedbackMessage && (
        <div className="fixed top-16 right-4 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{ratedFeedbackMessage}</span>
        </div>
      )}

      {/* Public Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/30 border border-blue-400/40 text-blue-200 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-300" />
            Public Transparency Portal • Open Data & Community Oversight
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Municipal Infrastructure Updates & Citizen Board
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100 leading-relaxed">
            Real-time public tracking of government assets, bridge safety audits, road repairs, and civil project progress. Rate completed municipal projects or use your camera to report local defects.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => {
                setPrefilledIssue(null);
                setIsIssueModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-blue-900 hover:bg-blue-50 font-bold text-sm rounded-xl shadow-sm transition-all"
            >
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Report a Civic Issue (Citizen)
            </button>
            <button
              onClick={() => setIsAiScannerOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-bold text-sm rounded-xl shadow-md transition-all"
            >
              <Camera className="w-4 h-4 text-slate-950" />
              AI Camera Defect Triage
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

      {/* Citizen Live Impact Ticker */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Assets Audited</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : assets.length}
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">100% public transparency</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Capital Saved</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-2">
            +${totalTaxpayerSavingsMillions}M
          </div>
          <span className="text-[11px] text-slate-500">Via early preventative cycle</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Repairs & Maint.</span>
            <Wrench className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-2">
            {loading ? '...' : maintenance.length}
          </div>
          <span className="text-[11px] text-amber-700 font-medium">{activeMaint} underway</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Citizen Satisfaction</span>
            <ThumbsUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-600 mt-2">
            96.4%
          </div>
          <span className="text-[11px] text-indigo-700 font-medium">Verified community approval</span>
        </div>
      </div>

      {/* Filter by Department & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-semibold text-slate-700">Filter Department:</span>
          <div className="flex flex-wrap gap-1.5">
            {departments.map(dept => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedDept === dept
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start md:self-auto">
          {(['All', 'Completed', 'Active'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s === 'All' ? 'All Works' : s}
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
          filteredFeed.map(item => {
            const guestId = getGuestIdentifier();
            const itemFeedbacks = feedbackList.filter(f => f.itemId === item.id);
            const userFeedback = itemFeedbacks.find(f => 
              (currentUser?.uid && f.userId === currentUser.uid) ||
              (currentUser?.email && f.userEmail?.toLowerCase() === currentUser.email.toLowerCase()) ||
              f.userId === guestId
            );

            const averageRating = itemFeedbacks.length > 0
              ? (itemFeedbacks.reduce((sum, f) => sum + f.rating, 0) / itemFeedbacks.length)
              : (ratings[item.id] || 4.0);

            const displayRating = userFeedback ? userFeedback.rating : averageRating;

            return (
              <div 
                key={item.id} 
                className="bg-white p-5 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
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

                  <h3 className="text-base font-bold text-slate-900 truncate">
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

                {/* Citizen Rating & Action Column */}
                <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Citizen Community Rating
                    </span>
                    {itemFeedbacks.length > 0 && (
                      <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        {itemFeedbacks.length} review{itemFeedbacks.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleOpenFeedback(item, star)}
                        className={`p-1 transition-transform hover:scale-125 ${
                          star <= Math.round(displayRating) ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300'
                        }`}
                        title={`Rate ${star} Stars & Submit Review`}
                      >
                        <Star className="w-4 h-4 fill-current" />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-slate-700 ml-1">
                      {displayRating.toFixed(1)}
                    </span>
                  </div>

                  {userFeedback ? (
                    <div className="flex flex-col items-start sm:items-end gap-1 mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Your Rating: {userFeedback.rating}★ (Saved in DB)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenFeedback(item)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors mt-0.5"
                      >
                        View / Update My Review
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenFeedback(item)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors mt-1"
                    >
                      Rate & Report Feedback
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Dedicated Citizen Project Feedback & Review Modal */}
      <ProjectFeedbackModal
        isOpen={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        item={selectedItemForFeedback}
        initialRating={selectedInitialRating}
        existingFeedback={selectedExistingFeedback}
        onSuccess={(saved) => {
          setRatings(prev => ({ ...prev, [saved.itemId]: saved.rating }));
          setRatedFeedbackMessage(`Your ${saved.rating}-star review was saved to the Municipal Database!`);
          setTimeout(() => setRatedFeedbackMessage(null), 4000);
        }}
      />

      {/* Citizen Issue Report Modal */}
      <IssueModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        issueToEdit={prefilledIssue}
        onSuccess={() => {}}
      />

      {/* Edge AI Structural Defect Scanner Modal */}
      <StructuralDefectScanner
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        onSelectForIssue={(data) => {
          setPrefilledIssue({
            title: data.title,
            severity: data.severity,
            description: data.description,
            status: 'Open',
            reportedBy: 'Citizen Reporter'
          });
          setIsIssueModalOpen(true);
        }}
      />
    </div>
  );
};
