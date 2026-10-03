import React, { useEffect, useState } from 'react';
import { 
  AlertTriangle, Plus, Search, Filter, 
  Trash2, CheckCircle, Clock, Eye, Download, Camera 
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { Issue } from '../types';
import { useAuth, type UserRole } from '../context/AuthContext';
import { IssueModal } from '../components/modals/IssueModal';
import { RbacModal } from '../components/modals/RbacModal';
import { StructuralDefectScanner } from '../components/ai/StructuralDefectScanner';

export const Issues: React.FC = () => {
  const { 
    isPublicCitizen,
    isSuperAdmin 
  } = useAuth();

  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState(false);
  const [prefilledIssue, setPrefilledIssue] = useState<any>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // RBAC Modal State
  const [rbacModalOpen, setRbacModalOpen] = useState(false);
  const [rbacActionTitle, setRbacActionTitle] = useState('');
  const [rbacRequiredRoles, setRbacRequiredRoles] = useState<UserRole[]>([]);
  const [rbacExplanation, setRbacExplanation] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubIssues = onSnapshot(collection(db, 'issues'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Issue));
      setIssues(data);
      setLoading(false);
    });

    return () => {
      unsubIssues();
    };
  }, []);

  const handleResolveIssue = async (id: string) => {
    if (!id) return;
    if (isPublicCitizen) {
      setRbacActionTitle("Resolve Civic Hazard Issue");
      setRbacRequiredRoles(['Field Engineer', 'Government Officer', 'Admin']);
      setRbacExplanation("Verifying and closing reported issues requires official certification by Field Engineers or Officers.");
      setRbacModalOpen(true);
      return;
    }
    try {
      setActionLoadingId(id);
      await updateDoc(doc(db, 'issues', id), { status: 'Resolved' });
      setIssues(prev => prev.map(i => i.id === id ? { ...i, status: 'Resolved' } : i));
    } catch (error) {
      console.error('Error resolving issue:', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!isSuperAdmin) {
      setRbacActionTitle("Delete Civic Issue Record");
      setRbacRequiredRoles(['Admin']);
      setRbacExplanation("Deleting public issue and incident audit records is restricted strictly to Super Administrator (sujallohar17@gmail.com).");
      setRbacModalOpen(true);
      return;
    }
    if (!window.confirm("Are you sure you want to delete this issue record?")) {
      return;
    }
    try {
      setActionLoadingId(id);
      await deleteDoc(doc(db, 'issues', id));
      setIssues(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert("Failed to delete issue: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredIssues = issues.filter(issue => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (issue.title || '').toLowerCase().includes(query) ||
      (issue.description || '').toLowerCase().includes(query) ||
      (issue.assetId || '').toLowerCase().includes(query) ||
      (issue.assignedTo || '').toLowerCase().includes(query);

    const matchesStatus = 
      statusFilter === 'All' ? true :
      statusFilter === 'Open' ? (issue.status === 'Open' || issue.status === 'Assigned') :
      issue.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const criticalCount = issues.filter(i => (i.severity === 'Critical' || i.severity === 'High') && i.status !== 'Resolved').length;
  const openCount = issues.filter(i => i.status !== 'Resolved' && i.status !== 'Closed').length;

  const handleExportCSV = () => {
    const headers = "Issue ID,Title,Asset ID,Severity,Status,Assigned To,Reported By,Description\n";
    const rows = filteredIssues.map(i => 
      `"${i.id}","${i.title}","${i.assetId}","${i.severity}","${i.status}","${i.assignedTo || ''}","${i.reportedBy || ''}","${(i.description || '').replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GovAsset_Issues_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Public Citizen Notice Banner */}
      {isPublicCitizen && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-blue-900">
          <div className="flex items-center gap-2.5">
            <Eye className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <div>
              <span className="font-bold">Citizen Hazard Hotline:</span> Anyone can report a damaged road, broken street lamp, water pipe leak, or municipal hazard. No login required!
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg shadow-xs transition-colors flex-shrink-0"
          >
            + Report New Issue
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Hazards & Civic Issues</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track and resolve reported hazards, citizen complaints, and failures.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">CSV</span>
          </button>
          <button 
            onClick={() => setIsAiScannerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            title="Scan physical hazard using Edge AI Camera"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">AI Camera Scan</span>
            <span className="sm:hidden">AI Scan</span>
          </button>
          <button 
            onClick={() => {
              setPrefilledIssue(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition-all"
            title="Open to all citizens and staff"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Report Issue</span>
            <span className="sm:hidden">Report</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Critical / High Severity</p>
            <p className="text-2xl font-bold text-slate-900">{criticalCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unresolved Issues</p>
            <p className="text-2xl font-bold text-slate-900">{openCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolved Total</p>
            <p className="text-2xl font-bold text-slate-900">{issues.length - openCount}</p>
          </div>
        </div>
      </div>

      {/* Controls & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-4 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search issues by title, asset ID, assignee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-slate-300 rounded-lg text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Issues</option>
              <option value="Open">Active Only</option>
              <option value="Resolved">Resolved Only</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Loading civic hazard records...
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No issues found matching criteria.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Target Asset</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Assigned Engineer</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredIssues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{issue.title}</div>
                      <div className="text-xs text-slate-500 line-clamp-1 mt-0.5">{issue.description}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {issue.assetId}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        issue.severity === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                        issue.severity === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                        issue.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                        'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        {issue.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        issue.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        issue.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {issue.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {issue.assignedTo || 'Unassigned'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isPublicCitizen ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                          Civic Record
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {issue.status !== 'Resolved' && (
                            <button
                              onClick={() => handleResolveIssue(issue.id!)}
                              disabled={actionLoadingId === issue.id}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded transition-colors"
                            >
                              Resolve
                            </button>
                          )}
                          {isSuperAdmin && (
                            <button
                              onClick={() => handleDeleteIssue(issue.id!)}
                              disabled={actionLoadingId === issue.id}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                              title="Delete issue (Super Admin only)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredIssues.map((issue) => (
              <div key={issue.id} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm text-slate-900 truncate">{issue.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{issue.description}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex-shrink-0 ${
                    issue.severity === 'Critical' ? 'bg-red-50 text-red-700 border border-red-200' :
                    issue.severity === 'High' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                    issue.severity === 'Medium' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-slate-50 text-slate-700 border border-slate-200'
                  }`}>
                    {issue.severity}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    issue.status === 'Resolved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    issue.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {issue.status}
                  </span>
                  <span className="text-[10px] text-slate-500">{issue.assignedTo || 'Unassigned'}</span>
                </div>
                {!isPublicCitizen && (
                  <div className="flex items-center gap-2 justify-end border-t border-slate-100 pt-2">
                    {issue.status !== 'Resolved' && (
                      <button
                        onClick={() => handleResolveIssue(issue.id!)}
                        disabled={actionLoadingId === issue.id}
                        className="text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Resolve
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteIssue(issue.id!)}
                        disabled={actionLoadingId === issue.id}
                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete (Super Admin only)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      </div>

      {/* Dynamic Issue Modal */}
      <IssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        issueToEdit={prefilledIssue}
        onSuccess={() => {}}
      />

      {/* RBAC Notice Modal */}
      <RbacModal
        isOpen={rbacModalOpen}
        onClose={() => setRbacModalOpen(false)}
        actionTitle={rbacActionTitle}
        requiredRoles={rbacRequiredRoles}
        explanation={rbacExplanation}
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
            reportedBy: 'Citizen Auditor'
          });
          setIsModalOpen(true);
        }}
      />
    </div>
  );
};
