import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GlobalSearch } from '../GlobalSearch';
import { NotificationPopover } from '../NotificationPopover';
import { RoleSwitcher } from '../RoleSwitcher';
import { NetworkStatusBanner } from '../common/NetworkStatusBanner';
import { 
  LayoutDashboard, Building2, FolderKanban, 
  AlertTriangle, ClipboardCheck, Wrench, 
  BarChart3, MessageSquare, LogOut, Megaphone, 
  LogIn, Eye, ShieldCheck, Menu, X
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

// Bottom nav items for mobile quick access
const bottomNavItems = [
  { name: 'Home', path: '/', icon: LayoutDashboard },
  { name: 'Assets', path: '/assets', icon: Building2 },
  { name: 'Issues', path: '/issues', icon: AlertTriangle },
  { name: 'Reports', path: '/reports', icon: BarChart3 },
  { name: 'AI', path: '/assistant', icon: MessageSquare },
];

export const AppLayout: React.FC = () => {
  const { logout, profile, role, isAuthenticatedStaff, isPublicCitizen } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Overlay Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed on desktop, slide-in overlay on mobile */}
      <aside className={`
        fixed top-0 left-0 h-full z-40 w-72 lg:w-64 bg-slate-900 text-white flex flex-col
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        {/* Sidebar Header */}
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
          {/* Close button visible only on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
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
      <main className="flex-1 lg:ml-64 overflow-auto bg-slate-50 min-h-screen flex flex-col pb-16 lg:pb-0">
        {/* Sticky Header with Hamburger, Search, Role Badge, and Notifications */}
        <header className="bg-white border-b border-slate-200 h-14 lg:h-16 flex items-center justify-between px-3 sm:px-4 lg:px-6 xl:px-8 sticky top-0 z-20 shadow-sm">
          {/* Left: Hamburger (mobile) + Search */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-1 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors flex-shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex-1 max-w-md lg:max-w-xl min-w-0">
              <GlobalSearch />
            </div>
          </div>

          {/* Right: Role badges and actions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 flex-shrink-0 ml-2">
            {/* Public Portal Pill — hidden on small screens */}
            {isPublicCitizen ? (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Public Citizen Mode</span>
              </div>
            ) : (
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Verified Authority</span>
              </div>
            )}

            {/* Role Badge (Read-Only Security Indicator) — hidden on very small */}
            <div className="hidden sm:block">
              <RoleSwitcher />
            </div>

            {/* Quick Staff Sign In / Sign Out Button — hidden on mobile (already in sidebar) */}
            <div className="hidden md:block">
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
            </div>

            {/* Notifications Popover */}
            <NotificationPopover />
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 flex-1">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-around h-14">
          {bottomNavItems.map((item) => {
            const isActive = location.pathname === item.path || 
                             (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg min-w-[48px] transition-colors ${
                  isActive 
                    ? 'text-blue-600' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Offline and Cloud Sync Banner */}
      <NetworkStatusBanner />
    </div>
  );
};
