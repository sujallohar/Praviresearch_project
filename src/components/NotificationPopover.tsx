import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, AlertTriangle, Wrench, Building2, Check, 
  ExternalLink, UserCheck, Trash2, X 
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export interface AppNotification {
  id: string;
  type: 'issue' | 'maintenance' | 'asset' | 'role_request';
  title: string;
  description: string;
  time: string;
  unread: boolean;
  link: string;
}

interface NotificationPopoverProps {
  onOpenRoleRequests?: () => void;
}

export const NotificationPopover: React.FC<NotificationPopoverProps> = ({ onOpenRoleRequests }) => {
  const { isSuperAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('govasset_read_notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persistent set of dismissed/cleared notifications (Trash button fix)
  const [clearedIds, setClearedIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('govasset_cleared_notifs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Save read notification IDs to localStorage
  const persistReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem('govasset_read_notifs', JSON.stringify(Array.from(newSet)));
    } catch {
      // Ignore
    }
  };

  // Save cleared notification IDs to localStorage
  const persistClearedIds = (newSet: Set<string>) => {
    setClearedIds(newSet);
    try {
      localStorage.setItem('govasset_cleared_notifs', JSON.stringify(Array.from(newSet)));
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    let issueNotifs: AppNotification[] = [];
    let maintNotifs: AppNotification[] = [];
    let roleNotifs: AppNotification[] = [];
    let assetNotifs: AppNotification[] = [];

    const updateAll = () => {
      const all = [...roleNotifs, ...issueNotifs, ...assetNotifs, ...maintNotifs];
      // Exclude any notifications permanently cleared by the user
      const filtered = all.filter((n) => !clearedIds.has(n.id));
      setNotifications(filtered);
    };

    // 1. Issues
    const unsubIssues = onSnapshot(collection(db, 'issues'), (snap) => {
      const list: AppNotification[] = [];
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data.status !== 'Resolved' && data.status !== 'Closed') {
          list.push({
            id: `issue-${d.id}`,
            type: 'issue',
            title: `Issue Alert: ${data.title || 'Unresolved Issue'}`,
            description: `Severity: ${data.severity || 'Medium'} • Location: ${data.location || 'Municipal Zone'}`,
            time: 'Active Hazard',
            unread: !readIds.has(`issue-${d.id}`),
            link: '/issues'
          });
        }
      });
      issueNotifs = list;
      updateAll();
    });

    // 2. Maintenance
    const unsubMaint = onSnapshot(collection(db, 'maintenanceRecords'), (maintSnap) => {
      const list: AppNotification[] = [];
      maintSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.status === 'Scheduled' || data.status === 'In Progress') {
          list.push({
            id: `maint-${d.id}`,
            type: 'maintenance',
            title: `Maintenance: ${data.type || 'Scheduled Task'}`,
            description: `Contractor: ${data.contractor || 'Public Works'} • Cost: $${(data.cost || 0).toLocaleString()}`,
            time: 'Scheduled Work',
            unread: !readIds.has(`maint-${d.id}`),
            link: '/maintenance'
          });
        }
      });
      maintNotifs = list;
      updateAll();
    });

    // 3. Role requests (Only for Super Admin Sujal Lohar)
    let unsubRoles = () => {};
    if (isSuperAdmin) {
      unsubRoles = onSnapshot(
        query(collection(db, 'roleRequests'), orderBy('createdAt', 'desc'), limit(10)),
        (roleSnap) => {
          const list: AppNotification[] = [];
          roleSnap.docs.forEach((d) => {
            const data = d.data();
            if (data.status === 'Pending') {
              list.push({
                id: `role-${d.id}`,
                type: 'role_request',
                title: `Authority Request: ${data.userName || 'Staff Member'}`,
                description: `Requested: ${data.requestedRole} • ${data.justification || 'Pending Admin Approval'}`,
                time: 'Requires Approval',
                unread: !readIds.has(`role-${d.id}`),
                link: '#role-approval'
              });
            }
          });
          roleNotifs = list;
          updateAll();
        },
        (err) => {
          console.warn('Role requests listener:', err);
        }
      );
    }

    // 4. Critical assets
    const unsubAssets = onSnapshot(collection(db, 'assets'), (assetSnap) => {
      const list: AppNotification[] = [];
      assetSnap.docs.forEach((d) => {
        const data = d.data();
        if (data.condition === 'Critical' || (data.riskLevel === 'High' && data.condition === 'Poor')) {
          list.push({
            id: `asset-${d.id}`,
            type: 'asset',
            title: `Critical Infrastructure: ${data.name}`,
            description: `Condition: ${data.condition} • Risk: ${data.riskLevel || 'High'}`,
            time: 'Immediate Attention',
            unread: !readIds.has(`asset-${d.id}`),
            link: `/assets/${d.id}`
          });
        }
      });
      assetNotifs = list;
      updateAll();
    });

    return () => {
      unsubIssues();
      unsubMaint();
      unsubRoles();
      unsubAssets();
    };
  }, [readIds, isSuperAdmin]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllAsRead = () => {
    const allIds = new Set(readIds);
    notifications.forEach((n) => allIds.add(n.id));
    persistReadIds(allIds);
  };

  const clearAllNotifications = () => {
    markAllAsRead();
    const newCleared = new Set(clearedIds);
    notifications.forEach((n) => newCleared.add(n.id));
    persistClearedIds(newCleared);
    setNotifications([]);
  };

  const handleDismissSingle = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newCleared = new Set(clearedIds);
    newCleared.add(id);
    persistClearedIds(newCleared);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationClick = (notif: AppNotification) => {
    const allIds = new Set(readIds);
    allIds.add(notif.id);
    persistReadIds(allIds);
    setIsOpen(false);

    if (notif.link === '#role-approval') {
      if (onOpenRoleRequests) {
        onOpenRoleRequests();
      } else {
        navigate('/reports');
      }
      return;
    }

    navigate(notif.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-600 hover:text-slate-900 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="View notifications and alerts"
        title="Live Municipal Alerts & Work Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900">Live Activity & Alerts</h4>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded-full">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 rounded-full">
                  All caught up
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                  title="Mark all as read"
                >
                  <Check className="w-3.5 h-3.5" /> Read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-slate-400 hover:text-rose-600 transition-colors p-1"
                  title="Clear notification list"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="font-semibold text-slate-700">No active alerts</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  New infrastructure issues, role requests, and scheduled work orders will appear here in real time.
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                    notif.unread ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {notif.type === 'role_request' ? (
                      <span className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                        <UserCheck className="w-4 h-4" />
                      </span>
                    ) : notif.type === 'issue' ? (
                      <span className="p-1.5 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                    ) : notif.type === 'maintenance' ? (
                      <span className="p-1.5 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Wrench className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="p-1.5 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Building2 className="w-4 h-4" />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {notif.title}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {notif.unread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                        )}
                        <button
                          type="button"
                          onClick={(e) => handleDismissSingle(e, notif.id)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Dismiss this alert"
                          aria-label="Dismiss this alert"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {notif.description}
                    </p>
                    <div className="flex items-center justify-between mt-1.5 text-[10px]">
                      <span className="font-semibold text-slate-400">{notif.time}</span>
                      <span className="text-blue-600 font-bold flex items-center gap-0.5">
                        Open <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
