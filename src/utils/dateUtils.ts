/**
 * Safe date and timestamp formatting for GovAsset 360
 * Prevents React Error #31 (attempting to render raw Firestore { seconds, nanoseconds } objects)
 */

export function formatTimestamp(val: any, fallback = 'N/A'): string {
  if (!val) return fallback;
  if (typeof val === 'string') return val;

  // Firestore Timestamp with .toDate()
  if (typeof val?.toDate === 'function') {
    try {
      const d = val.toDate();
      return isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
    } catch {
      return fallback;
    }
  }

  // Firestore Timestamp object serialized as { seconds, nanoseconds }
  if (typeof val?.seconds === 'number') {
    try {
      const d = new Date(val.seconds * 1000);
      return isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
    } catch {
      return fallback;
    }
  }

  // Native JS Date
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? fallback : val.toLocaleDateString();
  }

  // Millisecond timestamp number
  if (typeof val === 'number') {
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? fallback : d.toLocaleDateString();
    } catch {
      return fallback;
    }
  }

  return fallback;
}
