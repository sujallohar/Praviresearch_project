import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { MaintenanceRecord } from '../types';
import { Wrench, Plus, Search, Filter, Pencil, Trash2, Calendar, DollarSign, CheckCircle2, Clock, Download, Lock, Eye } from 'lucide-react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { MaintenanceModal } from '../components/modals/MaintenanceModal';
import { RbacModal } from '../components/modals/RbacModal';

export const Maintenance: React.FC = () => {
  const { role, isPublicCitizen, canScheduleMaintenance } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Scheduled' | 'In Progress' | 'Completed'>('All');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // RBAC Modal State
  const [rbacModalOpen, setRbacModalOpen] = useState(false);
  const [rbacActionTitle, setRbacActionTitle] = useState('');
  const [rbacRequiredRoles, setRbacRequiredRoles] = useState<UserRole[]>([]);
  const [rbacExplanation, setRbacExplanation] = useState('');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'maintenanceRecords'), orderBy('plannedDate', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceRecord));
      setRecords(data);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleOpenCreate = () => {
    if (!canScheduleMaintenance) {
      setRbacActionTitle("Schedule Maintenance Work Order");
      setRbacRequiredRoles(['Field Engineer', 'Government Officer', 'Admin']);
      setRbacExplanation("Creating preventative maintenance work orders and contracting repairs requires Field Engineer or Officer authorization.");
      setRbacModalOpen(true);
      return;
    }
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (record: MaintenanceRecord) => {
    if (!canScheduleMaintenance) {
      setRbacActionTitle("Modify Maintenance Record");
      setRbacRequiredRoles(['Field Engineer', 'Government Officer', 'Admin']);
      setRbacExplanation("Modifying maintenance logs, completion dates, or contractor notes requires operational staff authorization.");
      setRbacModalOpen(true);
      return;
    }
    setSelectedRecord(record);
    setIsModalOpen(true);
  };

  const handleQuickStatusChange = async (recordId: string, newStatus: 'Scheduled' | 'In Progress' | 'Completed') => {
    if (!canScheduleMaintenance) {
      setRbacActionTitle("Update Maintenance Status");
      setRbacRequiredRoles(['Field Engineer', 'Government Officer', 'Admin']);
      setRbacExplanation("Certifying maintenance completion or moving tasks to in-progress requires Field Engineer or Officer authorization.");
      setRbacModalOpen(true);
      return;
    }
    try {
      setActionLoadingId(recordId);
      const updateData: any = { status: newStatus };
      if (newStatus === 'Completed') {
        updateData.actualDate = new Date();
      }
      await updateDoc(doc(db, 'maintenanceRecords', recordId), updateData);
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, ...updateData } : r));
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (role !== 'Admin') {
      setRbacActionTitle("Delete Maintenance Record");
      setRbacRequiredRoles(['Admin']);
      setRbacExplanation("Deleting historical maintenance records and work orders is restricted exclusively to Administrators.");
      setRbacModalOpen(true);
      return;
    }
    if (!window.confirm("Are you sure you want to delete this maintenance record?")) {
      return;
    }
    try {
      setActionLoadingId(recordId);
      await deleteDoc(doc(db, 'maintenanceRecords', recordId));
      setRecords(prev => prev.filter(r => r.id !== recordId));
    } catch (err: any) {
      alert("Failed to delete record: " + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered records
  const filteredRecords = records.filter(r => {
    const matchesSearch = 
      (r.type || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.contractor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.assetId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate metrics
  const totalCost = records.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);
  const scheduledCount = records.filter(r => r.status === 'Scheduled').length;
  const inProgressCount = records.filter(r => r.status === 'In Progress').length;
  const completedCount = records.filter(r => r.status === 'Completed').length;

  const handleExportCSV = () => {
    const headers = "Record ID,Asset ID,Task Type,Contractor,Planned Date,Cost,Status,Notes\n";
    const rows = filteredRecords.map(r => {
      const date = r.plannedDate?.toDate ? new Date(r.plannedDate.toDate()).toISOString().split('T')[0] : '';
      return `"${r.id}","${r.assetId}","${r.type}","${r.contractor}","${date}","${r.cost}","${r.status}","${(r.notes || '').replace(/"/g, '""')}"`;
    }).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `GovAsset_Maintenance_${new Date().toISOString().split('T')[0]}.csv`;
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
              <span className="font-bold">Public Servicing Log:</span> Transparent record of scheduled and completed municipal maintenance, bridge repairs, and road resurfacing.
            </div>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded border border-blue-200 flex-shrink-0">
            Civil Transparency
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Maintenance & Work Orders</h1>
          <p className="text-sm text-slate-500 mt-1">
            Schedule, monitor, and execute routine preventative and corrective maintenance tasks.
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
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-all"
            title={canScheduleMaintenance ? "Schedule Maintenance" : "Restricted: Engineer/Officer only"}
          >
            {canScheduleMaintenance ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4 opacity-80" />}
            Schedule Maintenance
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tasks</p>
            <p className="text-2xl font-bold text-slate-900">{records.length}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scheduled / Active</p>
            <p className="text-2xl font-bold text-slate-900">{scheduledCount + inProgressCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Completed</p>
            <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Budgeted</p>
            <p className="text-2xl font-bold text-slate-900">₹{(totalCost / 100000).toFixed(1)}L</p>
          </div>
        </div>
      </div>

      {/* Main Content & Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Search & Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row gap-3 bg-slate-50/50 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by task, contractor, asset, notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Content Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-500">Loading maintenance records...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No maintenance tasks found</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
              {searchQuery || statusFilter !== 'All'
                ? 'Try broadening your search query or status filter.'
                : 'Get started by scheduling regular upkeep or corrective work.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
            >
              Schedule Maintenance
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Planned Date</th>
                  <th className="py-3 px-4">Maintenance Task</th>
                  <th className="py-3 px-4">Target Asset</th>
                  <th className="py-3 px-4">Contractor</th>
                  <th className="py-3 px-4">Cost</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredRecords.map(record => {
                  const dateStr = record.plannedDate?.toDate 
                    ? new Date(record.plannedDate.toDate()).toLocaleDateString()
                    : record.plannedDate 
                    ? new Date(record.plannedDate).toLocaleDateString() 
                    : 'N/A';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {dateStr}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        {record.type}
                        {record.notes && (
                          <span className="block text-xs font-normal text-slate-500 truncate max-w-xs mt-0.5">
                            {record.notes}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-mono text-xs">
                        {record.assetId}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs">
                        {record.contractor || 'Public Works Dept'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-900 text-xs">
                        ₹{(record.cost || 0).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                          record.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          record.status === 'In Progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {record.status !== 'Completed' && (
                            <button
                              onClick={() => handleQuickStatusChange(record.id!, 'Completed')}
                              disabled={actionLoadingId === record.id}
                              className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEdit(record)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit maintenance record"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.id!)}
                            disabled={actionLoadingId === record.id}
                            className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete record (Admin only)"
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

      {/* Dynamic Maintenance Modal */}
      <MaintenanceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recordToEdit={selectedRecord}
        onSuccess={fetchRecords}
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
