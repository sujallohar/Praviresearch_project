import React, { useState } from 'react';
import { Modal } from './Modal';
import { ShieldAlert, LogIn, CheckCircle2, Send } from 'lucide-react';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { RequestRoleModal } from './RequestRoleModal';

interface RbacModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle: string;
  requiredRoles: UserRole[];
  explanation?: string;
}

export const RbacModal: React.FC<RbacModalProps> = ({
  isOpen,
  onClose,
  actionTitle,
  requiredRoles,
  explanation
}) => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);

  const handleGoToLogin = () => {
    onClose();
    navigate('/login');
  };

  const handleOpenRequest = () => {
    setIsRequestModalOpen(true);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Staff Access Required" maxWidth="md">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 rounded-xl border border-amber-200">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-700 flex-shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                Role-Based Access Control
              </h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                {explanation || `The action "${actionTitle}" requires verified municipal authority credentials and is not permitted for your current access level.`}
              </p>
            </div>
          </div>

          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Your Current Access:</span>
              <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                {role === 'Viewer' ? 'Public Citizen (Viewer)' : role}
              </span>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              <span>Authorized Roles for this operation:</span>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {requiredRoles.map((r) => (
                  <span 
                    key={r} 
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200"
                  >
                    <CheckCircle2 className="w-3 h-3 text-blue-500" />
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action options */}
          <div className="border-t border-slate-200 pt-3 space-y-2">
            <p className="text-xs text-slate-600 mb-2">
              Need access for your municipal duties? Request official authorization directly from the Central Municipal Head, or sign in if you already possess credentials.
            </p>
            
            <button
              type="button"
              onClick={handleOpenRequest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Request Authority from Main Head</span>
            </button>

            <button
              type="button"
              onClick={handleGoToLogin}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Staff Account</span>
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>

      {/* Role Request Modal */}
      <RequestRoleModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        targetRole={requiredRoles[0] || 'Field Engineer'}
        onSuccess={() => {
          setIsRequestModalOpen(false);
          onClose();
        }}
      />
    </>
  );
};
