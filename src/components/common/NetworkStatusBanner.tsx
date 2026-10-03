import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { 
  subscribeToQueueUpdates, 
  flushOfflineQueue, 
  getPendingCount 
} from '../../lib/offlineQueue';

export const NetworkStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [recentSyncMessage, setRecentSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync
      handleSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of queue count
    getPendingCount().then(setPendingCount);

    // Subscribe to queue changes
    const unsubscribe = subscribeToQueueUpdates((count, syncedCount) => {
      setPendingCount(count);
      if (syncedCount && syncedCount > 0) {
        setRecentSyncMessage(`Synced ${syncedCount} record${syncedCount > 1 ? 's' : ''} to cloud!`);
        setTimeout(() => setRecentSyncMessage(null), 4000);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const res = await flushOfflineQueue();
      if (res.synced > 0) {
        setRecentSyncMessage(`Successfully synced ${res.synced} record${res.synced > 1 ? 's' : ''}!`);
        setTimeout(() => setRecentSyncMessage(null), 4000);
      }
    } finally {
      setSyncing(false);
    }
  };

  // If online, no pending items, and no recent sync message, keep UI clean
  if (isOnline && pendingCount === 0 && !recentSyncMessage) {
    return null;
  }

  return (
    <aside 
      aria-label="Network and offline synchronization status"
      className="fixed bottom-16 md:bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto transition-all duration-300 animate-in fade-in slide-in-from-bottom-2"
    >
      {/* 1. Offline Mode */}
      {!isOnline && (
        <div className="bg-amber-950/90 text-amber-200 border border-amber-500/40 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-100">Offline Mode Active</span>
              <p className="text-[11px] text-amber-300/80">
                {pendingCount > 0 
                  ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} queued locally (zero data loss)` 
                  : 'Submissions will save to local device'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Online with pending queue */}
      {isOnline && pendingCount > 0 && !recentSyncMessage && (
        <div className="bg-blue-950/90 text-blue-200 border border-blue-500/40 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <CloudUpload className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <span className="font-bold text-white">
                {pendingCount} Offline Record{pendingCount > 1 ? 's' : ''} Ready
              </span>
              <p className="text-[11px] text-blue-300/80">Stored locally in IndexedDB</p>
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      )}

      {/* 3. Recently Synced Banner */}
      {recentSyncMessage && (
        <div className="bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 backdrop-blur-md px-3.5 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold text-white">{recentSyncMessage}</span>
        </div>
      )}
    </aside>
  );
};
