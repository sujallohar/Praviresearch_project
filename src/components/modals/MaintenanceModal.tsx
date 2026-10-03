import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { queueOfflineRecord } from '../../lib/offlineQueue';
import type { MaintenanceRecord, Asset } from '../../types';
import { Wrench, Calendar, DollarSign, Building2, HardHat, FileText, Loader2 } from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit?: MaintenanceRecord | null;
  defaultAssetId?: string;
  onSuccess: () => void;
}

const COMMON_MAINTENANCE_TYPES = [
  'HVAC Servicing & Filter Replacement',
  'Structural Concrete Inspection',
  'Roadway Bitumen Resurfacing',
  'Water Pump Impeller Overhaul',
  'Electrical Substation Testing',
  'Fire Safety & Sprinkler Certification',
  'Bridge Joint Lubrication & Bearing Check',
  'Emergency Generator Load Test',
  'Roof Membrane Repair',
  'Pipeline Descaling & Pressure Test',
  'General Preventative Maintenance'
];

export const MaintenanceModal: React.FC<MaintenanceModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  defaultAssetId,
  onSuccess
}) => {
  const isEditing = Boolean(recordToEdit?.id);

  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [assetId, setAssetId] = useState('');
  const [type, setType] = useState(COMMON_MAINTENANCE_TYPES[0]);
  const [customType, setCustomType] = useState('');
  const [contractor, setContractor] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [actualDate, setActualDate] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [status, setStatus] = useState<'Scheduled' | 'In Progress' | 'Completed'>('Scheduled');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available assets for dropdown
  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const snap = await getDocs(collection(db, 'assets'));
        const list = snap.docs.map(d => ({
          id: d.id,
          name: (d.data() as Asset).name || d.id
        }));
        setAssets(list);
      } catch (err) {
        console.error('Error fetching assets for maintenance form:', err);
      }
    };
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  // Reset or pre-fill form
  useEffect(() => {
    if (recordToEdit) {
      setAssetId(recordToEdit.assetId || '');
      if (COMMON_MAINTENANCE_TYPES.includes(recordToEdit.type)) {
        setType(recordToEdit.type);
        setCustomType('');
      } else {
        setType('Other');
        setCustomType(recordToEdit.type || '');
      }
      setContractor(recordToEdit.contractor || '');

      // Parse plannedDate
      if (recordToEdit.plannedDate) {
        const d = recordToEdit.plannedDate?.toDate ? recordToEdit.plannedDate.toDate() : new Date(recordToEdit.plannedDate);
        if (!isNaN(d.getTime())) {
          setPlannedDate(d.toISOString().split('T')[0]);
        }
      } else {
        setPlannedDate(new Date().toISOString().split('T')[0]);
      }

      // Parse actualDate
      if (recordToEdit.actualDate) {
        const d = recordToEdit.actualDate?.toDate ? recordToEdit.actualDate.toDate() : new Date(recordToEdit.actualDate);
        if (!isNaN(d.getTime())) {
          setActualDate(d.toISOString().split('T')[0]);
        }
      } else {
        setActualDate('');
      }

      setCost(recordToEdit.cost || 0);
      setStatus(recordToEdit.status || 'Scheduled');
      setNotes(recordToEdit.notes || '');
    } else {
      // Default new record
      setAssetId(defaultAssetId || '');
      setType(COMMON_MAINTENANCE_TYPES[0]);
      setCustomType('');
      setContractor('');
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setPlannedDate(tomorrow.toISOString().split('T')[0]);
      setActualDate('');
      setCost(2500);
      setStatus('Scheduled');
      setNotes('');
    }
    setError(null);
  }, [recordToEdit, defaultAssetId, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalType = type === 'Other' ? customType.trim() : type;
    if (!finalType) {
      setError('Please specify a maintenance type.');
      return;
    }

    if (!assetId) {
      setError('Please select or specify an asset.');
      return;
    }

    try {
      setSubmitting(true);

      const plannedTimestamp = plannedDate ? Timestamp.fromDate(new Date(plannedDate + 'T09:00:00')) : serverTimestamp();
      const actualTimestamp = actualDate ? Timestamp.fromDate(new Date(actualDate + 'T17:00:00')) : null;

      const payload = {
        assetId,
        type: finalType,
        contractor: contractor.trim() || 'Internal Maintenance Crew',
        plannedDate: plannedTimestamp,
        actualDate: actualTimestamp,
        cost: Number(cost) || 0,
        status,
        notes: notes.trim(),
        updatedAt: serverTimestamp()
      };

      // Check if browser is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine && !isEditing) {
        await queueOfflineRecord('maintenance', {
          assetId,
          type: finalType,
          contractor: contractor.trim() || 'Internal Maintenance Crew',
          plannedDate: plannedDate || new Date().toISOString(),
          actualDate: actualDate || null,
          cost: Number(cost) || 0,
          status,
          notes: notes.trim()
        });
        alert('🌐 Offline Mode Active: Maintenance record saved locally. It will automatically synchronize to Cloud Firestore when internet connection is restored.');
        onSuccess();
        onClose();
        return;
      }

      if (isEditing && recordToEdit?.id) {
        await updateDoc(doc(db, 'maintenanceRecords', recordToEdit.id), payload);
      } else {
        await addDoc(collection(db, 'maintenanceRecords'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving maintenance record:', err);
      // Offline fallback on network failure
      if (!isEditing) {
        try {
          await queueOfflineRecord('maintenance', {
            assetId,
            type: finalType,
            contractor: contractor.trim() || 'Internal Maintenance Crew',
            plannedDate: plannedDate || new Date().toISOString(),
            actualDate: actualDate || null,
            cost: Number(cost) || 0,
            status,
            notes: notes.trim()
          });
          alert('🌐 Network unavailable: Saved maintenance task locally to offline queue! It will automatically sync once connected.');
          onSuccess();
          onClose();
          return;
        } catch (queueErr) {
          console.error('Failed to queue offline maintenance:', queueErr);
        }
      }
      setError(err.message || 'Failed to save maintenance record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Maintenance Record' : 'Schedule Maintenance Work Order'}
      subtitle={isEditing ? `Modifying record ID: ${recordToEdit?.id}` : 'Create a comprehensive scheduled maintenance task with cost and contractor tracking'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Asset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Target Asset *
            </label>
            {assets.length > 0 ? (
              <select
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="">Select Asset...</option>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.id.slice(0, 8)}...)
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                placeholder="e.g. asset-001 or bridge-north"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Work Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Maintenance Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-slate-400" />
            Maintenance Type / Activity *
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
          >
            {COMMON_MAINTENANCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="Other">Other (Custom specification)</option>
          </select>

          {type === 'Other' && (
            <input
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Specify custom maintenance operation..."
              required
              className="w-full px-3.5 py-2.5 bg-white border border-blue-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contractor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-slate-400" />
              Contractor / Assigned Team
            </label>
            <input
              type="text"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              placeholder="e.g. Apex Infra Services or Dept Team 4"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Cost */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              Estimated / Actual Cost ($)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={cost}
              onChange={(e) => setCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Planned Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Planned Date *
            </label>
            <input
              type="date"
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Actual Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Actual Completion Date (Optional)
            </label>
            <input
              type="date"
              value={actualDate}
              onChange={(e) => setActualDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Detailed Work Notes & Specifications
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe specific parts to replace, safety protocols, inspection checklists, or completion findings..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Form Actions */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? 'Update Record' : 'Schedule Work Order'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
