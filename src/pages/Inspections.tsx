import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Inspection } from '../types';
import { ClipboardCheck, Plus, Search, Filter, Pencil, Trash2, Calendar, User, Download, Lock, Eye } from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { InspectionModal } from '../components/modals/InspectionModal';
import { RbacModal } from '../components/modals/RbacModal';
import { formatTimestamp } from '../utils/dateUtils';

export const Inspections: React.FC = () => {
  const { profile, role, isPublicCitizen, canLogInspection } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // RBAC Modal State
  const [rbacModalOpen, setRbacModalOpen] = useState(false);
  const [rbacActionTitle, setRbacActionTitle] = useState('');
  const [rbacRequiredRoles, setRbacRequiredRoles] = useState<UserRole[]>([]);
  const [rbacExplanation, setRbacExplanation] = useState('');

  const fetchInspections = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'inspections'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inspection));
      setInspections(data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, []);

  const handleOpenCreate = () => {
    if (!canLogInspection) {
      setRbacActionTitle("Log Engineering Inspection");
      setRbacRequiredRoles(['Field Engineer', 'Admin']);
      setRbacExplanation("Conducting on-site structural inspections and issuing safety ratings requires certified Field Engineer credentials or Administrator authority.");
      setRbacModalOpen(true);
      return;
    }
    setSelectedInspection(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inspection: Inspection) => {
    if (!canLogInspection) {
      setRbacActionTitle("Modify Inspection Findings");
      setRbacRequiredRoles(['Field Engineer', 'Admin']);
      setRbacExplanation("Modifying official inspection findings and engineering recommendations is restricted to Field Engineers and Administrators.");
      setRbacModalOpen(true);
      return;
    }
    setSelectedInspection(inspection);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (role !== 'Admin') {
      setRbacActionTitle("Delete Inspection Audit");
      setRbacRequiredRoles(['Admin']);
      setRbacExplanation("Deleting official engineering inspection records is restricted exclusively to System Administrators.");
      setRbacModalOpen(true);
      return;
    }
    if (!window.confirm("Are you sure you want to delete this inspection record?")) {
      return;
    }
    try {
      setActionLoadingId(id);
      await deleteDoc(doc(db, 'inspections', id));
      setInspections(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert("Failed to delete inspection: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredInspections = inspections.filter(insp => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      (insp.inspector || '').toLowerCase().includes(query) ||
      (insp.assetId || '').toLowerCase().includes(query) ||
      (insp.findings || '').toLowerCase().includes(query) ||
      (insp.recommendation || '').toLowerCase().includes(query);

    const matchesCondition = conditionFilter === 'All' || insp.condition === conditionFilter;

    return matchesSearch && matchesCondition;
  });

  const handleExportCSV = () => {
    const headers = "Inspection ID,Asset ID,Inspector,Date,Condition,Findings,Recommendations,Status\n";
    const rows = filteredInspections.map(i => {
      const date = i.date?.toDate ? new Date(i.date.toDate()).toISOString().split('T')[0] : '';
      return `"${i.id}","${i.assetId}","${i.inspector}","${date}","${i.condition}","${(i.findings || '').replace(/"/g, '""')}","${(i.recommendation || '').replace(/"/g, '""')}","${i.status}"`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GovAsset_Inspections_${new Date().toISOString().split('T')[0]}.csv`;
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
              <span className="font-bold">Public Inspection Records:</span> Transparent safety audits and structural condition reports conducted by certified municipal engineers.
            </div>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded border border-blue-200 flex-shrink-0">
            Open Audits
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Inspections & Audits</h1>
          <p className="text-sm text-slate-500 mt-1">
            Conduct on-site engineering assessments, structural evaluations, and safety audits.
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
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
            title={canLogInspection ? "Log Inspection" : "Restricted: Field Engineer/Admin only"}
          >
            {canLogInspection ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4 opacity-80" />}
            Log Inspection
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 bg-slate-50/50 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by inspector, asset, findings, or observations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Conditions</option>
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading inspections...</div>
        ) : filteredInspections.length === 0 ? (
          <div className="text-center py-16 px-4">
            <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No inspections logged</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
              {searchQuery || conditionFilter !== 'All'
                ? 'Try broadening your search query or condition filter.'
                : 'Get started by conducting and logging an on-site structural inspection.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Log Inspection
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Inspector</th>
                  <th className="py-3 px-4">Target Asset</th>
                  <th className="py-3 px-4">Assessed Condition</th>
                  <th className="py-3 px-4">Findings & Observations</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInspections.map(insp => {
                  const dateStr = formatTimestamp(insp.date, 'N/A');

                  return (
                    <tr key={insp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {dateStr}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-900 font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          {insp.inspector}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {insp.assetId}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          insp.condition === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                          insp.condition === 'Poor' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                          insp.condition === 'Fair' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {insp.condition}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs">
                        <p className="line-clamp-2 text-xs">{insp.findings || 'No notes'}</p>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-xs font-medium text-slate-700 border border-slate-200">
                          {insp.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(insp)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit inspection report"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(insp.id!)}
                            disabled={actionLoadingId === insp.id}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete inspection (Admin only)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Inspection Modal */}
      <InspectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inspectionToEdit={selectedInspection}
        defaultInspector={profile?.name}
        onSuccess={fetchInspections}
      />

      {/* RBAC Notice Modal */}
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
