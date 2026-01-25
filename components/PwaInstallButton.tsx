import React, { useEffect, useState, useCallback } from "react";
import { showToast } from "../utils/toast";

const PwaInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Detect install state + capture install prompt
  useEffect(() => {
    // Detect if already running as PWA
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;

    if (standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.log("beforeinstallprompt fired");
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      showToast("App installed successfully");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = useCallback(async () => {
    const ua = navigator.userAgent;

    // 1) If Chrome/Edge gave us a real install prompt
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;

      if (choice.outcome === "accepted") {
        showToast("Installing…");
      } else {
        showToast("Installation cancelled");
      }

      setDeferredPrompt(null);
      return;
    }

    // 2) iOS Safari (no prompt)
    if (/iPhone|iPad|iPod/.test(ua)) {
      showToast("Tap the Share icon → 'Add to Home Screen'");
      return;
    }

    // 3) macOS Safari (supports PWA install, but NO beforeinstallprompt)
    if (/Macintosh/.test(ua) && ua.includes("Safari") && !ua.includes("Chrome")) {
      showToast("In Safari: File → Add to Dock");
      return;
    }

    // 4) Firefox or unsupported browsers
    showToast("Your browser does not support app installation");
  }, [deferredPrompt]);

  return (
    <button
      onClick={!isInstalled ? handleInstallClick : undefined}
      disabled={isInstalled}
      className={`w-full bg-white rounded-[2.5rem] p-8 border border-slate-100 flex items-center gap-6 shadow-sm transition-all text-left ${
        !isInstalled
          ? "active:scale-[0.98] cursor-pointer hover:border-indigo-200"
          : "cursor-default"
      }`}
    >
      <div
        className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${
          isInstalled ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"
        }`}
      >
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
