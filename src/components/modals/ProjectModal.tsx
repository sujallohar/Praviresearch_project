import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import type { Project, Asset } from '../../types';
import { FolderKanban, Building2, HardHat, DollarSign, Percent, FileText, Loader2 } from 'lucide-react';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectToEdit?: Project | null;
  onSuccess: () => void;
}

const PROJECT_STATUSES: ('Planning' | 'Tender' | 'Awarded' | 'Construction' | 'Completed')[] = [
  'Planning',
  'Tender',
  'Awarded',
  'Construction',
  'Completed'
];

const DEPARTMENTS = [
  'Public Works',
  'Transportation & Highways',
  'Water Resources & Sanitation',
  'Energy & Power Grid',
  'Urban Development'
];

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  projectToEdit,
  onSuccess
}) => {
  const isEditing = Boolean(projectToEdit?.id);

  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [name, setName] = useState('');
  const [assetId, setAssetId] = useState('');
  const [departmentId, setDepartmentId] = useState(DEPARTMENTS[0]);
  const [status, setStatus] = useState<'Planning' | 'Tender' | 'Awarded' | 'Construction' | 'Completed'>('Planning');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [contractor, setContractor] = useState('');
  const [budget, setBudget] = useState<number>(1000000);
  const [spent, setSpent] = useState<number>(0);
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
        console.error('Error fetching assets:', err);
      }
    };
    if (isOpen) {
      fetchAssets();
    }
  }, [isOpen]);

  useEffect(() => {
    if (projectToEdit) {
      setName(projectToEdit.name || '');
      setAssetId(projectToEdit.assetId || '');
      setDepartmentId(projectToEdit.departmentId || DEPARTMENTS[0]);
      setStatus(projectToEdit.status || 'Planning');
      setProgressPercent(projectToEdit.progressPercent || 0);
      setContractor(projectToEdit.contractor || '');
      setBudget(projectToEdit.budget || 0);
      setSpent(projectToEdit.spent || 0);
      setDescription(projectToEdit.description || '');
    } else {
      setName('');
      setAssetId('');
      setDepartmentId(DEPARTMENTS[0]);
      setStatus('Planning');
      setProgressPercent(0);
      setContractor('');
      setBudget(1000000);
      setSpent(0);
      setDescription('');
    }
    setError(null);
  }, [projectToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required.');
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        name: name.trim(),
        assetId: assetId || 'unassigned',
        departmentId,
        status,
        progressPercent: Math.min(100, Math.max(0, Number(progressPercent) || 0)),
        contractor: contractor.trim() || 'TBD',
        budget: Number(budget) || 0,
        spent: Number(spent) || 0,
        description: description.trim(),
        updatedAt: serverTimestamp()
      };

      if (isEditing && projectToEdit?.id) {
        await updateDoc(doc(db, 'projects', projectToEdit.id), payload);
      } else {
        await addDoc(collection(db, 'projects'), {
          ...payload,
          createdAt: serverTimestamp()
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving project:', err);
      setError(err.message || 'Failed to save project.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Update Project Milestone & Budget' : 'Initiate Capital Infrastructure Project'}
      subtitle={isEditing ? `Modifying Project ID: ${projectToEdit?.id}` : 'Create a lifecycle tracked infrastructure project with budget controls and progress metrics'}
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
            <FolderKanban className="w-3.5 h-3.5 text-slate-400" />
            Project Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Metro Expressway Expansion Phase II"
            required
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Associated Asset */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              Associated Asset
            </label>
            <select
              value={assetId}
              onChange={(e) => setAssetId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Unassigned / Standalone</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Supervising Department *
            </label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Project Stage *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Contractor */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-slate-400" />
              Primary EPC Contractor
            </label>
            <input
              type="text"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              placeholder="e.g. Larsen & Toubro / Shivalik Infra"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Progress Slider */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5 text-slate-400" />
              Completion Progress: <span className="text-blue-600 font-bold">{progressPercent}%</span>
            </label>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={progressPercent}
            onChange={(e) => setProgressPercent(parseInt(e.target.value) || 0)}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Budget */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              Total Allocated Budget ($)
            </label>
            <input
              type="number"
              min="0"
              step="50000"
              value={budget}
              onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Spent */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              Disbursed / Spent Funds ($)
            </label>
            <input
              type="number"
              min="0"
              step="25000"
              value={spent}
              onChange={(e) => setSpent(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            Project Scope & Objective
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Key deliverables, timeline milestones, strategic justification..."
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
              <span>{isEditing ? 'Update Project' : 'Initiate Project'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
