import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Issue } from '../types';
import { AlertTriangle, CheckCircle2, Plus, Pencil, Trash2, Search, Calendar, User, Clock, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { IssueModal } from '../components/modals/IssueModal';

export const Issues: React.FC = () => {
  const { profile, role } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'In Progress' | 'Resolved'>('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchIssues = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'issues'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Issue));
      setIssues(data);
    } catch (error) {
      console.error('Error fetching issues:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleOpenCreate = () => {
    setSelectedIssue(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (issue: Issue) => {
    setSelectedIssue(issue);
    setIsModalOpen(true);
  };

  const handleResolveIssue = async (id: string) => {
    if (!id) return;
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
    if (role === 'Viewer') {
      alert("Access Denied: Viewers cannot delete issues.");
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
  const resolvedCount = issues.filter(i => i.status === 'Resolved').length;

  const handleExportCSV = () => {
    const headers = "Issue ID,Asset ID,Title,Severity,Status,Reported By,Assigned To,Due Date,Description\n";
    const rows = filteredIssues.map(i => {
      const date = i.dueDate?.toDate ? new Date(i.dueDate.toDate()).toISOString().split('T')[0] : '';
      return `"${i.id}","${i.assetId}","${i.title}","${i.severity}","${i.status}","${i.reportedBy}","${i.assignedTo}","${date}","${(i.description || '').replace(/"/g, '""')}"`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GovAsset_Issues_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Issues & Discrepancies</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track structural defects, compliance hazards, and field anomalies with priority response dispatch.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" /> Report Issue
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Open Discrepancies</p>
            <p className="text-2xl font-bold text-slate-900">{openCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolved Issues</p>
            <p className="text-2xl font-bold text-slate-900">{resolvedCount}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search issues by hazard, description, or asset ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium self-stretch md:self-auto justify-center">
          {(['All', 'Open', 'In Progress', 'Resolved'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                statusFilter === tab
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Issues */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          Loading issues...
        </div>
      ) : filteredIssues.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-xl shadow-sm border border-slate-200">
          <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No issues found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            {searchQuery || statusFilter !== 'All'
              ? 'Try broadening your search query or switching tabs.'
              : 'Great job! All physical assets are currently operating without reported anomalies.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
          >
            Report Defect
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredIssues.map((issue) => {
            const dueDateStr = issue.dueDate?.toDate
              ? new Date(issue.dueDate.toDate()).toLocaleDateString()
              : issue.dueDate
              ? new Date(issue.dueDate).toLocaleDateString()
              : 'N/A';

            return (
              <div
                key={issue.id}
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
                      {issue.title}
                    </h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border shrink-0 ${
                        issue.severity === 'Critical'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : issue.severity === 'High'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {issue.severity}
                    </span>
                  </div>

                  <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                    {issue.description || 'No detailed description logged.'}
                  </p>

                  <div className="space-y-1.5 text-xs text-slate-500 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-slate-400">Asset: {issue.assetId}</span>
                      <span className="flex items-center gap-1 text-slate-600">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> Due: {dueDateStr}
                      </span>
                    </div>
                    {issue.assignedTo && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Assigned: {issue.assignedTo}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      issue.status === 'Resolved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : issue.status === 'In Progress'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    {issue.status}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(issue)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                      title="Edit full issue"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {issue.status !== 'Resolved' && (
                      <button
                        onClick={() => handleResolveIssue(issue.id!)}
                        disabled={actionLoadingId === issue.id}
                        className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold px-2.5 py-1.5 rounded-md transition-colors border border-emerald-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteIssue(issue.id!)}
                      disabled={actionLoadingId === issue.id}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete issue"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Issue Modal */}
      <IssueModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        issueToEdit={selectedIssue}
        defaultReportedBy={profile?.name}
        onSuccess={fetchIssues}
      />
    </div>
  );
};
