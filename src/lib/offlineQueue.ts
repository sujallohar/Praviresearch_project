// Offline Queue Manager using native browser IndexedDB
// Guarantees zero data loss for field engineers working with spotty / zero internet connectivity.

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface OfflineRecord {
  id: string;
  type: 'inspection' | 'issue' | 'maintenance';
  data: Record<string, any>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
}

const DB_NAME = 'govasset_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_queue';

let dbInstance: IDBDatabase | null = null;

// Open or initialize IndexedDB
function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Queue a new offline record
export async function queueOfflineRecord(
  type: 'inspection' | 'issue' | 'maintenance',
  data: Record<string, any>
): Promise<string> {
  const db = await getDB();
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const record: OfflineRecord = {
    id,
    type,
    data: {
      ...data,
      _isOfflineSubmitted: true,
      _offlineQueuedAt: new Date().toISOString()
    },
    createdAt: new Date().toISOString(),
    retryCount: 0
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(record);

    req.onsuccess = () => {
      notifyQueueChange();
      resolve(id);
    };

    req.onerror = () => reject(req.error);
  });
}

// Get count of queued items
export async function getPendingCount(): Promise<number> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

// Get all pending records
export async function getPendingRecords(): Promise<OfflineRecord[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// Remove a synced record
export async function removeRecord(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);

    req.onsuccess = () => {
      notifyQueueChange();
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

// Flush and sync all queued items to Firestore
export async function flushOfflineQueue(): Promise<{ synced: number; failed: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  const records = await getPendingRecords();
  if (records.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const record of records) {
    try {
      let targetCollection = '';
      if (record.type === 'inspection') targetCollection = 'inspections';
      else if (record.type === 'issue') targetCollection = 'issues';
      else if (record.type === 'maintenance') targetCollection = 'maintenanceRecords';

      if (targetCollection) {
        // Prepare document payload with Firestore timestamps
        const payload = {
          ...record.data,
          syncedAt: serverTimestamp(),
          syncedFromOffline: true
        };

        // Write directly to cloud Firestore
        await addDoc(collection(db, targetCollection), payload);
        await removeRecord(record.id);
        synced++;
      }
    } catch (err: any) {
      console.warn(`[Offline Queue] Failed to sync record ${record.id}:`, err);
      failed++;
    }
  }

  notifyQueueChange(synced);
  return { synced, failed };
}

// Event dispatcher for UI components
function notifyQueueChange(syncedCount?: number) {
  if (typeof window !== 'undefined') {
    getPendingCount().then((count) => {
      window.dispatchEvent(
        new CustomEvent('govasset:queue-changed', {
          detail: { pendingCount: count, syncedCount: syncedCount || 0 }
        })
      );
    });
  }
}

// Subscribe to queue changes
export function subscribeToQueueUpdates(callback: (count: number, lastSynced?: number) => void) {
  if (typeof window === 'undefined') return () => {};

  const handler = (e: Event) => {
    const detail = (e as CustomEvent).detail;
    callback(detail?.pendingCount ?? 0, detail?.syncedCount);
  };

  window.addEventListener('govasset:queue-changed', handler);
  getPendingCount().then((c) => callback(c));

  return () => window.removeEventListener('govasset:queue-changed', handler);
}

// Auto-sync listener on window reconnect
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('[Offline Queue] Network restored! Triggering automatic background sync...');
    flushOfflineQueue();
  });

  window.addEventListener('govasset:sync-queue', () => {
    flushOfflineQueue();
  });
}
