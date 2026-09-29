import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GlobalSearch } from '../GlobalSearch';
import { NotificationPopover } from '../NotificationPopover';
import { RoleSwitcher } from '../RoleSwitcher';
import { 
  LayoutDashboard, Building2, FolderKanban, 
  AlertTriangle, ClipboardCheck, Wrench, 
  BarChart3, MessageSquare, LogOut, Megaphone, 
  LogIn, Eye, ShieldCheck
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Public Updates', path: '/updates', icon: Megaphone, badge: 'Citizens' },
  { name: 'Assets', path: '/assets', icon: Building2 },
  { name: 'Projects', path: '/projects', icon: FolderKanban },
  { name: 'Issues', path: '/issues', icon: AlertTriangle },
  { name: 'Inspections', path: '/inspections', icon: ClipboardCheck },
  { name: 'Maintenance', path: '/maintenance', icon: Wrench },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'AI Assistant', path: '/assistant', icon: MessageSquare },
];

export const AppLayout: React.FC = () => {
  const { logout, profile, role, isAuthenticatedStaff, isPublicCitizen } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full z-20">
        <div className="p-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg shadow-sm">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">GovAsset 360</h1>
              <p className="text-xs text-blue-400 font-medium">Public & Staff Portal</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white font-semibold' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer User & Role Controls */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
              isAuthenticatedStaff ? 'bg-blue-600' : 'bg-slate-700'
            }`}>
              {isAuthenticatedStaff ? <ShieldCheck className="w-4 h-4 text-white" /> : 'C'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold truncate text-white">{profile?.name || 'Public Citizen'}</p>
              <p className="text-[11px] text-slate-400 truncate">{role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticatedStaff ? (
              <button 
                onClick={logout}
                className="flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-red-300 hover:bg-slate-800 w-full py-1.5 rounded transition-colors"
                title="Sign out of staff session and return to Public Citizen view"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-xs text-blue-300 hover:text-white bg-blue-600/30 hover:bg-blue-600 w-full py-1.5 rounded transition-colors font-medium border border-blue-500/30"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Staff Sign In</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 ml-64 overflow-auto bg-slate-50 min-h-screen flex flex-col">
        {/* Sticky Header with Search, Role Badge, and Notifications */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sm:px-8 sticky top-0 z-10 shadow-sm">
          <div className="flex-1 max-w-xl">
            <GlobalSearch />
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Public Portal Pill */}
            {isPublicCitizen ? (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Public Citizen Mode</span>
              </div>
            ) : (
              <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Verified Authority</span>
              </div>
            )}

            {/* Role Badge (Read-Only Security Indicator) */}
            <RoleSwitcher />

            {/* Quick Staff Sign In / Sign Out Button */}
            {isAuthenticatedStaff ? (
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 bg-slate-100 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors"
                title="Sign out of staff mode"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Staff Sign In</span>
              </Link>
            )}

            {/* Notifications Popover */}
            <NotificationPopover />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6 sm:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
