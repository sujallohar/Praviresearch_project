import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GlobalSearch } from '../GlobalSearch';
import { NotificationPopover } from '../NotificationPopover';
import { RoleSwitcher } from '../RoleSwitcher';
import { NetworkStatusBanner } from '../common/NetworkStatusBanner';
import { StructuralDefectScanner } from '../ai/StructuralDefectScanner';
import { InspectionModal } from '../modals/InspectionModal';
import { IssueModal } from '../modals/IssueModal';
import { 
  LayoutDashboard, Building2, FolderKanban, 
  AlertTriangle, ClipboardCheck, Wrench, 
  BarChart3, MessageSquare, LogOut, Megaphone, 
  LogIn, Eye, ShieldCheck, Menu, X, Camera, Sparkles, QrCode,
  UserCheck, Shield, Info, Download
} from 'lucide-react';
import { QrScannerModal } from '../scanner/QrScannerModal';
import { RoleRequestsManagerModal } from '../modals/RoleRequestsManagerModal';
import { RequestRoleModal } from '../modals/RequestRoleModal';
import { PwaInstallPrompt } from '../common/PwaInstallPrompt';

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
  { name: 'About Architect', path: '/about', icon: Info, badge: 'Sujal' },
];

// Bottom nav items for mobile quick access
const bottomNavItems = [
  { name: 'Home', path: '/', icon: LayoutDashboard },
  { name: 'Assets', path: '/assets', icon: Building2 },
  { name: 'Issues', path: '/issues', icon: AlertTriangle },
  { name: 'AI', path: '/assistant', icon: MessageSquare },
  { name: 'About', path: '/about', icon: Info },
];

export const AppLayout: React.FC = () => {
  const { logout, profile, role, isAuthenticatedStaff, isPublicCitizen, isSuperAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiScannerOpen, setAiScannerOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [roleRequestsModalOpen, setRoleRequestsModalOpen] = useState(false);
  const [requestRoleModalOpen, setRequestRoleModalOpen] = useState(false);
  const [prefilledInspection, setPrefilledInspection] = useState<any>(null);
  const [prefilledIssue, setPrefilledIssue] = useState<any>(null);

  const handleSelectForInspection = (data: { condition: string; findings: string; recommendation: string }) => {
    setPrefilledInspection({
      condition: data.condition,
      findings: data.findings,
      recommendation: data.recommendation,
      status: 'Completed',
      inspector: profile?.name || 'Field Auditor'
    });
    setInspectionModalOpen(true);
  };

  const handleSelectForIssue = (data: { title: string; severity: string; description: string }) => {
    setPrefilledIssue({
      title: data.title,
      severity: data.severity,
      description: data.description,
      reportedBy: profile?.name || 'Citizen Auditor',
      status: 'Open'
    });
    setIssueModalOpen(true);
  };

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

  // Standalone PWA & mobile safe area status bar handling
  useEffect(() => {
    const updateSafeArea = () => {
      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');

      if (isStandalone && window.innerWidth < 768) {
        document.documentElement.style.setProperty(
          '--safe-area-top',
          'max(env(safe-area-inset-top, 0px), 32px)'
        );
      }
    };
    updateSafeArea();
    window.addEventListener('resize', updateSafeArea);
    return () => window.removeEventListener('resize', updateSafeArea);
  }, []);

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
        <div 
          className="p-4 flex items-center justify-between border-b border-slate-800"
          style={{
            paddingTop: 'calc(var(--safe-area-top, 0px) + 1rem)'
          }}
        >
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

        {/* AI Scanner Direct Launch Action in Sidebar */}
        <div className="p-3 mx-2 my-2 bg-gradient-to-r from-blue-900/60 to-indigo-900/60 border border-blue-500/30 rounded-xl">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-blue-200 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-blue-400" /> Edge AI Vision
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/30 text-emerald-300">
              FREE
            </span>
          </div>
          <p className="text-[10px] text-slate-300 mb-2 leading-tight">
            Scan roads, concrete, & pipes for structural defects via live camera.
          </p>
          <button
            onClick={() => setAiScannerOpen(true)}
            className="w-full py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition-all mb-1.5"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            Launch AI Scanner
          </button>
          <button
            onClick={() => setQrScannerOpen(true)}
            className="w-full py-1.5 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
          >
            <QrCode className="w-3 h-3 text-amber-300" />
            Scan Asset QR
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('govasset:open-install'))}
            className="w-full py-1.5 px-2.5 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-1.5 shadow-xs"
            title="Download & Install GovAsset 360 App on your phone or desktop ($0 Free)"
          >
            <Download className="w-3 h-3 text-white" />
            Install Mobile App
          </button>
        </div>

        {/* Sidebar Footer User & Role Controls */}
        <div 
          className="p-4 border-t border-slate-800 bg-slate-900/60"
          style={{
            paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 1rem)'
          }}
        >
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

          {isSuperAdmin ? (
            <button
              onClick={() => setRoleRequestsModalOpen(true)}
              className="w-full mt-2 py-1.5 px-2 text-[11px] font-semibold text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              title="Review pending elevated authority requests (Sujal Lohar)"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Authority Approvals Queue</span>
            </button>
          ) : isPublicCitizen ? (
            <button
              onClick={() => setRequestRoleModalOpen(true)}
              className="w-full mt-2 py-1.5 px-2 text-[11px] font-semibold text-blue-300 hover:text-white bg-blue-950/50 hover:bg-blue-900 border border-blue-700/40 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
              title="Submit a role authorization request to Sujal Lohar"
            >
              <Shield className="w-3.5 h-3.5 text-blue-400" />
              <span>Request Staff Role</span>
            </button>
          ) : null}
        </div>
      </aside>

      {/* Main Content Area */}
      <main 
        className="flex-1 lg:ml-64 overflow-y-auto overflow-x-hidden min-w-0 max-w-full bg-slate-50 min-h-screen flex flex-col lg:!pb-0"
        style={{
          paddingBottom: 'calc(4.5rem + var(--safe-area-bottom, 0px))'
        }}
      >
        {/* Sticky Header with Hamburger, Search, Role Badge, and Notifications */}
        <header 
          className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-xs transition-[padding] duration-150"
          style={{
            paddingTop: 'var(--safe-area-top, 0px)'
          }}
        >
          <div className="h-14 lg:h-16 flex items-center justify-between px-2.5 sm:px-4 lg:px-6 xl:px-8">
            {/* Left: Hamburger (mobile) + Search */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-1 min-w-0 mr-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors flex-shrink-0 touch-manipulation"
                aria-label="Open navigation menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex-1 max-w-md lg:max-w-xl min-w-0">
                <GlobalSearch onScanQr={() => setQrScannerOpen(true)} />
              </div>
            </div>

            {/* Right: Role badges and actions */}
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 flex-shrink-0">
              {/* Public Portal Pill / Verified Authority / Super Admin Pill */}
              {isSuperAdmin ? (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-900 text-xs font-black shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  <span>Super Admin (Sujal Lohar)</span>
                </div>
              ) : isPublicCitizen ? (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-medium">
                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                  <span>Public Citizen Mode</span>
                </div>
              ) : (
                <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>Verified: {role}</span>
                </div>
              )}

              {/* Role Badge (Read-Only Security Indicator) — hidden on small screens */}
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

              {/* Scan Asset QR Code Button — hidden on mobile (integrated inside search bar & sidebar) */}
              <button
                onClick={() => setQrScannerOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Scan Physical Asset QR Tag"
              >
                <QrCode className="w-3.5 h-3.5 text-amber-300" />
                <span>Scan QR</span>
              </button>

              {/* Quick AI Scanner Header Button — hidden on mobile (accessible via bottom nav 'AI' tab & sidebar) */}
              <button
                onClick={() => setAiScannerOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                title="Open Edge AI Structural Defect Scanner"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>AI Scanner</span>
              </button>

              {/* Super Admin Access Approvals Button (Only for emailsujallohar17@gmail.com) */}
              {isSuperAdmin ? (
                <button
                  onClick={() => setRoleRequestsModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                  title="Review authority access requests from citizens & staff (Sujal Lohar)"
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="hidden lg:inline">Approvals Queue</span>
                </button>
              ) : isPublicCitizen ? (
                <button
                  onClick={() => setRequestRoleModalOpen(true)}
                  className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition-colors"
                  title="Request elevated authority from Head of Department"
                >
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>Request Role</span>
                </button>
              ) : null}

              {/* Download/Install PWA button — hidden on mobile (available in sidebar & install prompt) */}
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('govasset:open-install'))}
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold transition-colors shadow-2xs"
                title="Download & Install GovAsset 360 App on Mobile or Desktop ($0 Free)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden xl:inline">Install App</span>
              </button>

              {/* Notifications Popover */}
              <NotificationPopover onOpenRoleRequests={() => setRoleRequestsModalOpen(true)} />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 flex-1 min-w-0 max-w-full">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        className="fixed bottom-0 left-0 right-0 z-30 lg:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
        style={{
          paddingBottom: 'var(--safe-area-bottom, 0px)'
        }}
      >
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

      {/* Edge AI Structural Defect Scanner Modal */}
      <StructuralDefectScanner
        isOpen={aiScannerOpen}
        onClose={() => setAiScannerOpen(false)}
        onSelectForInspection={handleSelectForInspection}
        onSelectForIssue={handleSelectForIssue}
      />

      {/* Pre-filled Inspection Modal from AI */}
      <InspectionModal
        isOpen={inspectionModalOpen}
        onClose={() => setInspectionModalOpen(false)}
        inspectionToEdit={prefilledInspection}
        onSuccess={() => {}}
      />

      {/* Pre-filled Issue Modal from AI */}
      <IssueModal
        isOpen={issueModalOpen}
        onClose={() => setIssueModalOpen(false)}
        issueToEdit={prefilledIssue}
        onSuccess={() => {}}
      />

      {/* Asset Physical QR Code Scanner Modal */}
      <QrScannerModal
        isOpen={qrScannerOpen}
        onClose={() => setQrScannerOpen(false)}
      />

      {/* Role Requests Approvals Modal (Admin Head) */}
      <RoleRequestsManagerModal
        isOpen={roleRequestsModalOpen}
        onClose={() => setRoleRequestsModalOpen(false)}
      />

      {/* Request Elevated Staff Role Modal (Citizens & Staff) */}
      <RequestRoleModal
        isOpen={requestRoleModalOpen}
        onClose={() => setRequestRoleModalOpen(false)}
      />

      {/* Progressive Web App Install Engine & Banner */}
      <PwaInstallPrompt />
    </div>
  );
};
