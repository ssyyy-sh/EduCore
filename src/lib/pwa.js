import { useEffect, useState } from 'react';

/*
 * Installable app (PWA): registers the service worker in production builds and keeps the
 * browser's "install" prompt so Settings can offer an Install button.
 */
let deferred = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

export function setupPWA() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
  const secure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (import.meta.env.PROD && secure && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
    });
  }
}

const standalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return {
    installed: standalone(),
    canInstall: !!deferred,
    isIOS: /iPhone|iPad|iPod/.test(ua),
    install: async () => {
      if (!deferred) return false;
      deferred.prompt();
      const { outcome } = await deferred.userChoice.catch(() => ({ outcome: 'dismissed' }));
      deferred = null;
      notify();
      return outcome === 'accepted';
    },
  };
}
