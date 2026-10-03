// Service Worker Registration & Lifecycle Manager

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered successfully with scope:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[PWA] New version available! Content will refresh on next visit.');
            }
          });
        }
      });

      // Register background sync if supported
      if ('sync' in registration) {
        try {
          await (registration as any).sync.register('sync-govasset-inspections');
        } catch (syncErr) {
          // Normal on browsers without sync support
        }
      }
    } catch (error) {
      console.warn('[PWA] Service Worker registration failed:', error);
    }
  });

  // Listen for messages from service worker (e.g. background sync trigger)
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'TRIGGER_OFFLINE_SYNC') {
      window.dispatchEvent(new CustomEvent('govasset:sync-queue'));
    }
  });
}
