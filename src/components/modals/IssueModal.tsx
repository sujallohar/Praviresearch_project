import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { queueOfflineRecord } from '../../lib/offlineQueue';
import type { Issue, Asset } from '../../types';
import { AlertTriangle, Building2, User, Calendar, FileText, Loader2 } from 'lucide-react';

interface IssueModalProps {
  isOpen: boolean;
  onClose: () => void;
  issueToEdit?: Issue | null;
  defaultAssetId?: string;
  defaultReportedBy?: string;
  onSuccess: () => void;
}

const SEVERITIES: ('Low' | 'Medium' | 'High' | 'Critical')[] = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES: ('Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed')[] = [
  'Open',
  'Assigned',
  'In Progress',
  'Resolved',
  'Closed'
];

export const IssueModal: React.FC<IssueModalProps> = ({
  isOpen,
  onClose,
  issueToEdit,
  defaultAssetId,
  defaultReportedBy,
  onSuccess
}) => {
  const isEditing = Boolean(issueToEdit?.id);

  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [title, setTitle] = useState('');
  const [assetId, setAssetId] = useState('');
  const [severity, setSeverity] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [status, setStatus] = useState<'Open' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed'>('Open');
  const [reportedBy, setReportedBy] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        console.error('Error fetching assets for issue modal:', err);
      }
    };
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (issueToEdit) {
      setTitle(issueToEdit.title || '');
      setAssetId(issueToEdit.assetId || '');
      setSeverity(issueToEdit.severity || 'Medium');
      setStatus(issueToEdit.status || 'Open');
      setReportedBy(issueToEdit.reportedBy || '');
      setAssignedTo(issueToEdit.assignedTo || '');
      if (issueToEdit.dueDate) {
        const d = issueToEdit.dueDate?.toDate ? issueToEdit.dueDate.toDate() : new Date(issueToEdit.dueDate);
        if (!isNaN(d.getTime())) {
          setDueDate(d.toISOString().split('T')[0]);
        }
      } else {
        setDueDate('');
      }
      setDescription(issueToEdit.description || '');
    } else {
      setTitle('');
      setAssetId(defaultAssetId || '');
      setSeverity('Medium');
      setStatus('Open');
      setReportedBy(defaultReportedBy || 'Field Engineer');
      setAssignedTo('Unassigned');
      const inThreeDays = new Date();
      inThreeDays.setDate(inThreeDays.getDate() + 3);
      setDueDate(inThreeDays.toISOString().split('T')[0]);
      setDescription('');
    }
    setError(null);
  }, [issueToEdit, defaultAssetId, defaultReportedBy, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Please provide an issue title.');
      return;
    }

    try {
      setSubmitting(true);

      const dueTimestamp = dueDate ? Timestamp.fromDate(new Date(dueDate + 'T18:00:00')) : serverTimestamp();

      const payload = {
        title: title.trim(),
        assetId: assetId || 'demo-asset',
        severity,
        status,
        reportedBy: reportedBy.trim() || 'Auditor',
        assignedTo: assignedTo.trim() || 'Maintenance Crew',
        dueDate: dueTimestamp,
        description: description.trim()
      };

      // Check if browser is offline
      if (typeof navigator !== 'undefined' && !navigator.onLine && !isEditing) {
        await queueOfflineRecord('issue', {
          ...payload,
          dueDate: dueDate || new Date().toISOString()
        });
        alert('🌐 Offline Mode Active: Civic issue report saved locally on your device. It will automatically synchronize to Cloud Firestore when internet connection is restored.');
        onSuccess();
        onClose();
        return;
      }

      if (isEditing && issueToEdit?.id) {
        await updateDoc(doc(db, 'issues', issueToEdit.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'issues'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving issue:', err);
      // Offline fallback on network failure
      if (!isEditing) {
        try {
          await queueOfflineRecord('issue', {
            title: title.trim(),
            assetId: assetId || 'demo-asset',
            severity,
            status,
            reportedBy: reportedBy.trim() || 'Auditor',
            assignedTo: assignedTo.trim() || 'Maintenance Crew',
            dueDate: dueDate || new Date().toISOString(),
            description: description.trim()
          });
          alert('🌐 Network unavailable: Saved civic hazard report locally to offline queue! It will automatically sync once connected.');
          onSuccess();
          onClose();
          return;
        } catch (queueErr) {
          console.error('Failed to queue offline issue:', queueErr);
        }
      }
      setError(err.message || 'Failed to save issue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Discrepancy / Issue' : 'Report Physical Asset Defect / Discrepancy'}
      subtitle={isEditing ? `Modifying Issue ID: ${issueToEdit?.id}` : 'Log field anomalies, structural hazards, or regulatory compliance failures'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Issue Summary / Hazard Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Structural hairline crack along North Pier column #4"
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Associated Asset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Impacted Asset *
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Asset...</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Severity */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Severity Level *
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Lifecycle Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Resolution Deadline
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Reported By */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Reported By
            </label>
            <input
              type="text"
              value={reportedBy}
              onChange={(e) => setReportedBy(e.target.value)}
              placeholder="e.g. Field Engineer or Inspector"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Assigned To */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Assigned Contractor / Engineer
            </label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder="e.g. Rapid Response Team A"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Full Defect Description & Remediation Advice
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed description of defect, environmental causes, immediate risks, and recommended fix..."
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
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg shadow-sm hover:shadow transition-all disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{isEditing ? 'Update Defect' : 'Submit Issue'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
