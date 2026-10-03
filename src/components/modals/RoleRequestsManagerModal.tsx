import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { 
  Check, X, Shield, 
  Loader2, Building2, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth, type UserRole, SUPER_ADMIN_EMAIL } from '../../context/AuthContext';

interface RoleRequestItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  department: string;
  requestedRole: UserRole;
  badgeId: string;
  justification: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: any;
}

interface RoleRequestsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleRequestsManagerModal: React.FC<RoleRequestsManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, isSuperAdmin } = useAuth();
  const [requests, setRequests] = useState<RoleRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [grantedMessage, setGrantedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isSuperAdmin) return;

    setLoading(true);
    const unsub = onSnapshot(collection(db, 'roleRequests'), (snap) => {
      const items: RoleRequestItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data()
      } as RoleRequestItem));
      // Sort newest pending first
      items.sort((a, _b) => (a.status === 'Pending' ? -1 : 1));
      setRequests(items);
      setLoading(false);
    });

    return () => unsub();
  }, [isOpen, isSuperAdmin]);

  if (!isOpen) return null;

  // Strict Security Gate: Only Sujal Lohar (sujallohar17@gmail.com) can access
  if (!isSuperAdmin) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Security Access Denied"
        subtitle="Policy Violation • Unauthorized Access Attempt"
        maxWidth="md"
      >
        <div className="p-6 text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-slate-900 text-base">
            Restricted to Master Super Administrator
          </h4>
          <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
            Only the verified Central Municipal Head (<strong className="text-blue-700 font-mono">{SUPER_ADMIN_EMAIL}</strong>) has security credentials to review, grant, or revoke municipal authority permissions.
          </p>
          <div className="pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Close Panel
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  const handleGrantRole = async (req: RoleRequestItem) => {
    if (!isSuperAdmin) {
      alert(`Security Violation: Only ${SUPER_ADMIN_EMAIL} can grant permissions.`);
      return;
    }

    try {
      setActionLoadingId(req.id);

      // Security enforcement: Nobody can ever be elevated to Admin except sujallohar17@gmail.com
      const approvedRole: UserRole = req.requestedRole === 'Admin' ? 'Government Officer' : req.requestedRole;

      // 1. Update the request record in Cloud Firestore
      await updateDoc(doc(db, 'roleRequests', req.id), {
        status: 'Approved',
        grantedRole: approvedRole,
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.email || SUPER_ADMIN_EMAIL
      });

      // 2. Update user profile in Firestore
      if (req.userId && !req.userId.startsWith('guest-')) {
        await setDoc(doc(db, 'users', req.userId), {
          uid: req.userId,
          name: req.userName,
          email: req.userEmail,
          department: req.department,
          role: approvedRole,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      setGrantedMessage(`Authority granted! ${req.userName} is now approved as a ${approvedRole}.`);
      setTimeout(() => setGrantedMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to grant role:', err);
      alert('Error updating authority status: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineRole = async (req: RoleRequestItem) => {
    if (!isSuperAdmin) {
      alert(`Security Violation: Only ${SUPER_ADMIN_EMAIL} can decline requests.`);
      return;
    }

    try {
      setActionLoadingId(req.id);
      await updateDoc(doc(db, 'roleRequests', req.id), {
        status: 'Rejected',
        reviewedAt: serverTimestamp(),
        reviewedBy: currentUser?.email || SUPER_ADMIN_EMAIL
      });
    } catch (err: any) {
      console.error('Failed to decline role:', err);
      alert('Error declining request: ' + err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingCount = requests.filter(r => r.status === 'Pending').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Municipal Authority Access Approvals"
      subtitle={`Super Administrator Control Panel (${SUPER_ADMIN_EMAIL}) • Review and grant verified staff permissions`}
      maxWidth="2xl"
    >
      <div className="space-y-4">
        {grantedMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{grantedMessage}</span>
          </div>
        )}

        <div className="flex items-center justify-between px-1 text-xs">
          <span className="font-bold text-slate-700">
            Pending Queue: <span className="text-blue-700">{pendingCount} Requests</span>
          </span>
          <span className="text-slate-400">Total Records: {requests.length}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            Loading authorization requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
            <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Authority Requests in Queue</p>
            <p className="text-[11px] text-slate-400 mt-1">
              When citizens or field staff submit authorization requests, they will appear here for your review.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
            {requests.map((req) => (
              <div
                key={req.id}
                className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  req.status === 'Pending' ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/60 opacity-70'
                }`}
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 truncate">
                      {req.userName}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      ({req.userEmail})
                    </span>
                    <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border ${
                      req.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : req.status === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border-rose-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                    <span>
                      Requested: <strong className="text-blue-700 font-bold">{req.requestedRole}</strong>
                    </span>
                    <span>•</span>
                    <span className="text-slate-500 flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {req.department}
                    </span>
                    {req.badgeId && req.badgeId !== 'N/A' && (
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.2 rounded border">
                        ID: {req.badgeId}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    "{req.justification}"
                  </p>
                </div>

                {/* Action buttons */}
                {req.status === 'Pending' && (
                  <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                    <button
                      type="button"
                      onClick={() => handleDeclineRole(req)}
                      disabled={actionLoadingId === req.id}
                      className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleGrantRole(req)}
                      disabled={actionLoadingId === req.id}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                    >
                      {actionLoadingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Grant Authority</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Close Panel
          </button>
        </div>
      </div>
    </Modal>
  );
};
