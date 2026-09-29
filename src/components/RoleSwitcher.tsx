import React from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { 
  ShieldCheck, Briefcase, Wrench, HardHat, 
  Eye
} from 'lucide-react';

const ROLE_CONFIG: Record<UserRole, {
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}> = {
  'Admin': {
    label: 'Admin (Full Privileges)',
    icon: ShieldCheck,
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200'
  },
  'Government Officer': {
    label: 'Government Officer',
    icon: Briefcase,
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200'
  },
  'Field Engineer': {
    label: 'Field Engineer',
    icon: Wrench,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200'
  },
  'Contractor': {
    label: 'Prime Contractor',
    icon: HardHat,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200'
  },
  'Viewer': {
    label: 'Public Citizen',
    icon: Eye,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300'
  }
};

export const RoleSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { role } = useAuth();
  const currentConfig = ROLE_CONFIG[role] || ROLE_CONFIG['Viewer'];
  const CurrentIcon = currentConfig.icon;

  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-xs ${currentConfig.badgeBg} ${currentConfig.badgeText} ${currentConfig.badgeBorder}`}
      title={`Active Security Role: ${currentConfig.label}`}
    >
      <CurrentIcon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{compact ? currentConfig.label.split(' ')[0] : currentConfig.label}</span>
    </div>
  );
};
