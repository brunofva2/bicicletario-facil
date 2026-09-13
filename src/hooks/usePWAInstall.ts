import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    // Detect standalone mode (already installed & running as app window)
    const checkStandalone = () => {
      try {
        const isStandalone =
          (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
          (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: window-controls-overlay)').matches) ||
          Boolean((window?.navigator as unknown as { standalone?: boolean })?.standalone);
        setIsInstalled(Boolean(isStandalone));
      } catch {
        setIsInstalled(false);
      }
    };

    checkStandalone();

    let mediaQuery: MediaQueryList | null = null;
    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    try {
      if (typeof window !== 'undefined' && window.matchMedia) {
        mediaQuery = window.matchMedia('(display-mode: standalone)');
        mediaQuery.addEventListener('change', handleMediaChange);
      }
    } catch {
      // fallback
    }

    // Detect platform safely
    try {
      const userAgent = (typeof window !== 'undefined' && window.navigator?.userAgent?.toLowerCase()) || '';
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      setIsIOS(isIOSDevice);
      setIsDesktop(!isIOSDevice && !isAndroid);
    } catch {
      setIsIOS(false);
      setIsDesktop(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      try {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      } catch {
        // Ignore
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    try {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.addEventListener('appinstalled', handleAppInstalled);
    } catch {
      // Ignore iframe restrictions
    }

    return () => {
      try {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.removeEventListener('appinstalled', handleAppInstalled);
        if (mediaQuery) {
          mediaQuery.removeEventListener('change', handleMediaChange);
        }
      } catch {
        // Ignore
      }
    };
  }, []);

  const install = async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (!deferredPrompt) {
      return 'unsupported';
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        return 'accepted';
      }
      return 'dismissed';
    } catch (err) {
      console.warn('Install prompt error:', err);
      return 'unsupported';
    }
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isDesktop,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => {
    try {
      return typeof navigator !== 'undefined' ? navigator.onLine : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    try {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    } catch {
      // Ignore
    }

    return () => {
      try {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      } catch {
        // Ignore
      }
    };
  }, []);

  return isOnline;
}
