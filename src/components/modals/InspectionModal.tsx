import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Inspection, Asset } from '../../types';
import { ClipboardCheck, Building2, User, Calendar, FileText, Loader2 } from 'lucide-react';

interface InspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspectionToEdit?: Inspection | null;
  defaultAssetId?: string;
  defaultInspector?: string;
  onSuccess: () => void;
}

const CONDITIONS: ('Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical')[] = [
  'Excellent',
  'Good',
  'Fair',
  'Poor',
  'Critical'
];

export const InspectionModal: React.FC<InspectionModalProps> = ({
  isOpen,
  onClose,
  inspectionToEdit,
  defaultAssetId,
  defaultInspector,
  onSuccess
}) => {
  const isEditing = Boolean(inspectionToEdit?.id);

  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [assetId, setAssetId] = useState('');
  const [inspector, setInspector] = useState('');
  const [date, setDate] = useState('');
  const [condition, setCondition] = useState<string>('Good');
  const [findings, setFindings] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [status, setStatus] = useState<'Pending' | 'Completed'>('Completed');
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
        console.error('Error fetching assets for inspection:', err);
      }
    };
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (inspectionToEdit) {
      setAssetId(inspectionToEdit.assetId || '');
      setInspector(inspectionToEdit.inspector || '');
      if (inspectionToEdit.date) {
        const d = inspectionToEdit.date?.toDate ? inspectionToEdit.date.toDate() : new Date(inspectionToEdit.date);
        if (!isNaN(d.getTime())) {
          setDate(d.toISOString().split('T')[0]);
        }
      } else {
        setDate(new Date().toISOString().split('T')[0]);
      }
      setCondition(inspectionToEdit.condition || 'Good');
      setFindings(inspectionToEdit.findings || '');
      setRecommendation(inspectionToEdit.recommendation || '');
      setStatus(inspectionToEdit.status || 'Completed');
    } else {
      setAssetId(defaultAssetId || '');
      setInspector(defaultInspector || 'Senior Field Auditor');
      setDate(new Date().toISOString().split('T')[0]);
      setCondition('Good');
      setFindings('');
      setRecommendation('');
      setStatus('Completed');
    }
    setError(null);
  }, [inspectionToEdit, defaultAssetId, defaultInspector, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!assetId) {
      setError('Please select an asset.');
      return;
    }

    try {
      setSubmitting(true);

      const inspectionTimestamp = date ? Timestamp.fromDate(new Date(date + 'T10:00:00')) : serverTimestamp();

      const payload = {
        assetId,
        inspector: inspector.trim() || 'Official Inspector',
        date: inspectionTimestamp,
        condition,
        findings: findings.trim() || 'Visual structural inspection conducted without major discrepancies.',
        recommendation: recommendation.trim() || 'Continue regular cycle maintenance.',
        status
      };

      if (isEditing && inspectionToEdit?.id) {
        await updateDoc(doc(db, 'inspections', inspectionToEdit.id), {
          ...payload,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'inspections'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving inspection:', err);
      setError(err.message || 'Failed to save inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Field Inspection Log' : 'Conduct & Log Asset Inspection'}
      subtitle={isEditing ? `Modifying Inspection ID: ${inspectionToEdit?.id}` : 'Record on-site evaluation, structural integrity score, and remediation steps'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Target Asset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Inspected Asset *
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              required
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

          {/* Condition Assessed */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" />
              Observed Condition *
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Inspector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Lead Inspector
            </label>
            <input
              type="text"
              value={inspector}
              onChange={(e) => setInspector(e.target.value)}
              placeholder="e.g. Officer Raman Sharma"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Inspection Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Completed">Completed</option>
              <option value="Pending">Pending Review</option>
            </select>
          </div>
        </div>

        {/* Findings */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Inspection Findings & Physical Observations *
          </label>
          <textarea
            rows={3}
            value={findings}
            onChange={(e) => setFindings(e.target.value)}
            placeholder="Record visible wear, structural deflection, corrosion, operating temperature, or calibration readouts..."
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Recommendations */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Remedial Recommendations & Action Items
          </label>
          <textarea
            rows={2}
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            placeholder="e.g. Schedule immediate bearing grease replacement, or conduct ultrasonic test within 30 days..."
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
              <span>{isEditing ? 'Update Inspection' : 'Submit Inspection Log'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
