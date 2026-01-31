import React, { useState, useEffect, useCallback } from 'react';
import { showToast } from '../utils/toast';

const PwaInstallButton: React.FC = () => {
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    () => (window as any).deferredPrompt || null
  );

  useEffect(() => {
    // Check if running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true;
      
      setIsStandalone(isStandaloneMode);
      
      // If strictly standalone, we are definitely installed. 
      // Otherwise check local storage.
      if (isStandaloneMode) {
        setIsInstalled(true);
      } else {
        setIsInstalled(localStorage.getItem('fit_app_installed') === 'true');
      }
    };

    checkStandalone();
    
    // Listen for mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    try {
        mediaQuery.addEventListener('change', checkStandalone);
    } catch (e) {
        // Old browser support
        mediaQuery.addListener(checkStandalone);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e;
      console.log("Install prompt captured in component");
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('fit_app_installed', 'true');
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
      showToast("App successfully installed!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      try {
        mediaQuery.removeEventListener('change', checkStandalone);
      } catch (e) {
        mediaQuery.removeListener(checkStandalone);
      }
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    if (isInstalled) return;

    const promptEvent = deferredPrompt || (window as any).deferredPrompt;

    if (!promptEvent) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      if (isIOS) {
        showToast("Tap 'Share' then 'Add to Home Screen'");
      } else {
        showToast("Install via browser menu or address bar (+) icon");
      }
      return;
    }
    
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    
    if (outcome !== 'accepted') {
      showToast("Installation cancelled");
    }
    
    setDeferredPrompt(null);
    (window as any).deferredPrompt = null;
  }, [deferredPrompt, isInstalled]);

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the main click
    localStorage.removeItem('fit_app_installed');
    setIsInstalled(false);
    showToast("Install status reset");
  };

  return (
    <div 
      onClick={!isInstalled ? handleInstallClick : undefined}
      className={`relative w-full bg-white rounded-[2.5rem] p-8 border border-slate-100 flex items-center gap-6 shadow-sm transition-all text-left group ${
        !isInstalled 
          ? 'active:scale-[0.98] cursor-pointer hover:border-indigo-200' 
          : 'cursor-default'
      }`}
      role="button"
      tabIndex={isInstalled ? -1 : 0}
    >
      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-colors ${isInstalled ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
        {isInstalled ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
        )}
      </div>
      <div className="flex-1">
        <p className="font-black text-xl text-slate-800 leading-tight">{isInstalled ? "Successfully Installed" : "Enable Native App"}</p>
        <p className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mt-1">{isInstalled ? "" : "Add to home screen for best experience"}</p>
      </div>

      {/* Reset Pill Button - Only show if installed via flag but NOT currently running standalone */}
      {isInstalled && !isStandalone && (
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-full transition-all z-10 flex items-center gap-1"
          title="Reset install status if uninstalled"
        >
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};

export default PwaInstallButton;
