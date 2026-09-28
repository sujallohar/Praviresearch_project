import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, Wrench, Building2, Check, ExternalLink } from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';

interface AppNotification {
  id: string;
  type: 'issue' | 'maintenance' | 'asset';
  title: string;
  description: string;
  time: string;
  unread: boolean;
  link: string;
}

export const NotificationPopover: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const notifs: AppNotification[] = [];

        // 1. Fetch critical issues
        const issuesSnap = await getDocs(query(collection(db, 'issues'), limit(5)));
        issuesSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status !== 'Resolved' && data.status !== 'Closed') {
            notifs.push({
              id: `issue-${doc.id}`,
              type: 'issue',
              title: `Issue Alert: ${data.title || 'Unresolved Issue'}`,
              description: `Severity: ${data.severity || 'Medium'} • Reported by: ${data.reportedBy || 'Staff'}`,
              time: 'Recent',
              unread: true,
              link: '/issues'
            });
          }
        });

        // 2. Fetch scheduled maintenance
        const maintSnap = await getDocs(query(collection(db, 'maintenanceRecords'), limit(5)));
        maintSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.status === 'Scheduled' || data.status === 'In Progress') {
            notifs.push({
              id: `maint-${doc.id}`,
              type: 'maintenance',
              title: `Maintenance: ${data.type || 'Scheduled Task'}`,
              description: `Contractor: ${data.contractor || 'Internal'} • Cost: $${data.cost || 0}`,
              time: 'Scheduled',
              unread: true,
              link: '/maintenance'
            });
          }
        });

        // 3. Check for critical assets
        const assetSnap = await getDocs(query(collection(db, 'assets'), limit(10)));
        assetSnap.docs.forEach((doc) => {
          const data = doc.data();
          if (data.condition === 'Critical' || data.condition === 'Poor') {
            notifs.push({
              id: `asset-${doc.id}`,
              type: 'asset',
              title: `Asset Warning: ${data.name}`,
              description: `Condition: ${data.condition} • Risk: ${data.riskLevel || 'High'}`,
              time: 'Attention',
              unread: true,
              link: `/assets/${doc.id}`
            });
          }
        });

        setNotifications(notifs);
        setUnreadCount(notifs.filter((n) => n.unread).length);
      } catch (err) {
        console.error('Error fetching notifications:', err);
      }
    };

    fetchNotifications();
  }, []);

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

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  const handleNotificationClick = (notif: AppNotification) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    setIsOpen(false);
    navigate(notif.link);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="View notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-slate-900">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-sm">
                No active notifications or alerts.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                    notif.unread ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {notif.type === 'issue' ? (
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
                    <p className="text-xs font-semibold text-slate-900 truncate">
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {notif.description}
                    </p>
                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                      <span>{notif.time}</span>
                      <span className="text-blue-600 font-medium flex items-center gap-0.5">
                        View <ExternalLink className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                  {notif.unread && (
                    <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
