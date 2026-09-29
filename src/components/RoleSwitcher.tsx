import React, { useState, useRef, useEffect } from 'react';
import { useAuth, type UserRole } from '../context/AuthContext';
import { 
  ShieldCheck, Briefcase, Wrench, HardHat, 
  Eye, ChevronDown, Check, Sparkles 
} from 'lucide-react';

const ROLE_CONFIG: Record<UserRole, {
  label: string;
  icon: React.FC<{ className?: string }>;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  desc: string;
}> = {
  'Admin': {
    label: 'Admin',
    icon: ShieldCheck,
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
    desc: 'Full system control, asset registration & deletion'
  },
  'Government Officer': {
    label: 'Gov Officer',
    icon: Briefcase,
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-200',
    desc: 'Asset management, project creation & budget approval'
  },
  'Field Engineer': {
    label: 'Field Engineer',
    icon: Wrench,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
    desc: 'Safety inspections, field maintenance & defect logs'
  },
  'Contractor': {
    label: 'Contractor',
    icon: HardHat,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
    desc: 'Project milestones & execution work orders'
  },
  'Viewer': {
    label: 'Public Citizen',
    icon: Eye,
    badgeBg: 'bg-slate-100',
    badgeText: 'text-slate-700',
    badgeBorder: 'border-slate-300',
    desc: 'Public transparency, live updates & issue reporting'
  }
};

export const RoleSwitcher: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { role, switchRole, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentConfig = ROLE_CONFIG[role] || ROLE_CONFIG['Viewer'];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all hover:shadow hover:opacity-90 ${currentConfig.badgeBg} ${currentConfig.badgeText} ${currentConfig.badgeBorder}`}
        title="Click to switch role (RBAC preview)"
      >
        <CurrentIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-none">
          {compact ? currentConfig.label : `Role: ${currentConfig.label}`}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white shadow-xl ring-1 ring-black ring-opacity-5 z-50 p-2 border border-slate-200 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Role-Based Access Control (RBAC)
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Switch roles to experience GovAsset 360 from different governance perspectives.
            </p>
          </div>

          <div className="space-y-1">
            {(Object.keys(ROLE_CONFIG) as UserRole[]).map((r) => {
              const config = ROLE_CONFIG[r];
              const Icon = config.icon;
              const isSelected = role === r;

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    switchRole(r);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left flex items-start gap-2.5 p-2 rounded-lg text-xs transition-colors ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-900 border border-blue-200' 
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`p-1.5 rounded-md mt-0.5 ${config.badgeBg} ${config.badgeText}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {r === 'Viewer' ? 'Public Citizen (Viewer)' : r}
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                      {config.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 px-2 text-[10px] text-slate-400">
            Active persona: <strong className="text-slate-600">{profile.name}</strong>
          </div>
        </div>
      )}
    </div>
  );
};
