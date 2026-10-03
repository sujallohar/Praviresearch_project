import React, { useState } from 'react';
import { Modal } from './Modal';
import { Shield, Send, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth, type UserRole, SUPER_ADMIN_EMAIL } from '../../context/AuthContext';

interface RequestRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole?: UserRole;
  onSuccess?: () => void;
}

export const RequestRoleModal: React.FC<RequestRoleModalProps> = ({
  isOpen,
  onClose,
  targetRole = 'Field Engineer',
  onSuccess
}) => {
  const { profile } = useAuth();
  const [role, setRole] = useState<UserRole>(targetRole);
  const [userName, setUserName] = useState(profile?.name || '');
  const [userEmail, setUserEmail] = useState(profile?.email || '');
  const [department, setDepartment] = useState(profile?.department || 'Public Works');
  const [justification, setJustification] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim()) {
      setError('Please provide your name and email address.');
      return;
    }
    if (!justification.trim()) {
      setError('Please provide a brief justification or official municipal ID.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await addDoc(collection(db, 'roleRequests'), {
        userId: profile?.uid || `guest-${Date.now()}`,
        userName: userName.trim(),
        userEmail: userEmail.trim(),
        department: department.trim(),
        requestedRole: role,
        badgeId: badgeId.trim() || 'N/A',
        justification: justification.trim(),
        status: 'Pending',
        createdAt: serverTimestamp(),
        reviewedAt: null,
        reviewedBy: null
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    } catch (err: any) {
      console.error('Failed to submit role request:', err);
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Elevated Authority"
      subtitle={`Submit an official authorization request to Central Municipal Head (${SUPER_ADMIN_EMAIL})`}
      maxWidth="md"
    >
      {submitted ? (
        <div className="p-6 text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-base text-slate-900">Authorization Request Dispatched!</h4>
          <p className="text-xs text-slate-600 max-w-sm mx-auto">
            Your request for <strong className="text-blue-700">{role}</strong> credentials has been sent to Central Municipal Head (<code className="font-mono text-blue-700 font-bold">{SUPER_ADMIN_EMAIL}</code>). You will be notified once reviewed.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p>
              Under Municipal Governance rules, actions such as logging official safety audits and commissioning capital works require certified staff approval from Super Administrator Sujal Lohar (<strong>{SUPER_ADMIN_EMAIL}</strong>).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Your Full Name *</label>
              <input
                type="text"
                required
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Officer Sunita Rao"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Official / Contact Email *</label>
              <input
                type="email"
                required
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="e.g. s.rao@pwd.gov.in"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Authority Level *</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-blue-700"
              >
                <option value="Field Engineer">Field Engineer (Conduct Audits & Inspections)</option>
                <option value="Government Officer">Government Officer (Register Assets & Projects)</option>
                <option value="Contractor">Prime Contractor (Execute Maintenance)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee / Municipal Badge ID</label>
              <input
                type="text"
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder="e.g. PWD-ENG-8491"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Official Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Directorate of Urban Road Transport"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Justification & Scope of Work *</label>
            <textarea
              rows={2}
              required
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Briefly state your municipal assignment or reason for requesting these permissions..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Request to Admin</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
};
