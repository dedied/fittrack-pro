import React, { useState, useEffect, useCallback } from 'react';
import { showToast } from '../utils/toast';

const PwaInstallButton: React.FC = () => {
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || localStorage.getItem('fit_app_installed') === 'true'
  );
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(
    () => (window as any).deferredPrompt || null
  );

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      (window as any).deferredPrompt = e; // Keep global in sync
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
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    const promptEvent = deferredPrompt || (window as any).deferredPrompt;

    if (!promptEvent) {
      // Logic for when we don't have the prompt event (iOS or Desktop Edge/Chrome manual install)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      if (isInstalled) {
         showToast("App is already installed.");
      } else if (isIOS) {
        showToast("Tap 'Share' then 'Add to Home Screen'");
      } else {
        // Desktop/Android fallback: Guide user to browser menu
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

  return (
    <button 
      onClick={!isInstalled ? handleInstallClick : undefined}
      disabled={isInstalled}
      className={`w-full bg-white rounded-[2.5rem] p-8 border border-slate-100 flex items-center gap-6 shadow-sm transition-all text-left ${!isInstalled ? 'active:scale-[0.98] cursor-pointer hover:border-indigo-200' : 'cursor-default'}`}
    >
      <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${isInstalled ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
        {isInstalled ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
        )}
      </div>
      <div className="flex-1">
        <p className="font-black text-xl text-slate-800 leading-tight">{isInstalled ? "Successfully Installed" : "Enable Native App"}</p>
        <p className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mt-1">{isInstalled ? "Ready for offline training" : "Add to home screen for best experience"}</p>
      </div>
    </button>
  );
};

export default PwaInstallButton;