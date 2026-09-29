import React from 'react';
import { Modal } from './Modal';
import { ShieldAlert, ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';
import { useAuth, type UserRole } from '../../context/AuthContext';

interface RbacModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionTitle: string;
  requiredRoles: UserRole[];
  explanation?: string;
  onRoleSwitched?: () => void;
}

export const RbacModal: React.FC<RbacModalProps> = ({
  isOpen,
  onClose,
  actionTitle,
  requiredRoles,
  explanation,
  onRoleSwitched
}) => {
  const { role, switchRole } = useAuth();

  const handleSwitchAndProceed = (targetRole: UserRole) => {
    switchRole(targetRole);
    if (onRoleSwitched) {
      onRoleSwitched();
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Access Restricted (RBAC Policy)" maxWidth="md">
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
              {explanation || `The action "${actionTitle}" requires specific authorization permissions that are not granted to your current role.`}
            </p>
          </div>
        </div>

        <div className="space-y-2 py-1">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Your Active Role:</span>
            <span className="font-bold text-slate-800 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
              {role}
            </span>
          </div>

          <div className="text-xs text-slate-500 font-medium">
            <span>Permitted Roles for this action:</span>
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

        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            Switch role to test or execute this action:
          </p>
          <div className="space-y-2">
            {requiredRoles.map((targetRole) => (
              <button
                key={targetRole}
                type="button"
                onClick={() => handleSwitchAndProceed(targetRole)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-800 text-xs font-semibold transition-colors"
              >
                <span className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Switch to {targetRole}
                </span>
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};
