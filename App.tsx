import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import Layout, { TabType, SyncStatus } from './components/Layout';
import DashboardView from './components/DashboardView';
import AddLogView from './components/AddLogView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import AppDialogs from './components/AppDialogs';
import PinLockScreen from './components/PinLockScreen';
import TestDashboard from './components/TestDashboard';
import { WorkoutLog, EXERCISES, ExerciseType } from './types';
import { secureStore } from './utils/secureStore';
import { generateId } from './utils/dateUtils';

const SUPABASE_URL = 'https://infdrucgfquyujuqtajr.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_1dq2GSISKJheR-H149eEvg_uU_EuISF';
const APP_VERSION = '2.4.8';
const MAX_PIN_ATTEMPTS = 5;

export type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';
type AppState = 'loading' | 'locked' | 'unlocked' | 'onboarding' | 'creatingPin' | 'confirmingPinForBio';
type SyncResult = 'success' | 'error' | 'offline' | 'conflict_cloud_empty';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [totalsTimeFrame, setTotalsTimeFrame] = useState<TimeFrame>(() => (localStorage.getItem('fit_totals_timeframe') as TimeFrame) || 'weekly');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showSyncErrorDialog, setShowSyncErrorDialog] = useState(false);
  const [showCloudWipeDialog, setShowCloudWipeDialog] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<ExerciseType | null>(null);
  const [showTestDashboard, setShowTestDashboard] = useState(false);
  const [devModeCount, setDevModeCount] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pinError, setPinError] = useState<string | null>(null);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  
  // Auth State
  const [onboardingStep, setOnboardingStep] = useState<'welcome' | 'email' | 'otp'>('welcome');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  
  const [user, setUser] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('unconfigured');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [logs, setLogs] = useState<WorkoutLog[]>(() => {
    try {
      const saved = localStorage.getItem('fit_logs');
      return saved ? JSON.parse(saved).map((l: any) => ({ ...l, owner_id: l.owner_id || undefined })) : [];
    } catch { return []; }
  });
  const logsRef = useRef(logs);
  useEffect(() => { logsRef.current = logs; }, [logs]);
  const [newEntry, setNewEntry] = useState({ type: 'pushups' as ExerciseType, reps: '', weight: '' });
  const [entryDate, setEntryDate] = useState(new Date());

  useEffect(() => { localStorage.setItem('fit_totals_timeframe', totalsTimeFrame); }, [totalsTimeFrame]);
  useEffect(() => { localStorage.setItem('fit_logs', JSON.stringify(logs)); }, [logs]);

  const updateHasBio = async () => {
    const bio = await secureStore.hasBiometrics();
    setHasBiometrics(bio);
  };
  
  const triggerToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3000); };

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone || localStorage.getItem('fit_app_installed') === 'true') setIsInstalled(true);

    // PWA Install Handlers
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    
    const handleAppInstalled = () => {
      setIsInstalled(true);
      localStorage.setItem('fit_app_installed', 'true');
      setDeferredPrompt(null);
      triggerToast("App successfully installed!");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setSupabase(client);
    
    const init = async () => {
      await updateHasBio();
      if (await secureStore.isPinSet()) setAppState('locked');
      else {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) { setUser(session.user); setAppState('unlocked'); }
        else if (localStorage.getItem('fit_skip_auth') === 'true') setAppState('unlocked');
        else { setAppState('onboarding'); setOnboardingStep('welcome'); }
      }
    };
    init();
    
    const { data: { subscription } } = client.auth.onAuthStateChange((_, s) => {
      setUser(s?.user ?? null);
      if (s?.user) {
        setAppState(prev => (prev === 'onboarding' ? 'unlocked' : prev));
      }
    });
    return () => {
      subscription.unsubscribe();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        triggerToast("Tap 'Share' then 'Add to Home Screen'");
      } else {
        triggerToast("Installation not available right now");
      }
      return;
    }
    
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome !== 'accepted') {
        triggerToast("Installation cancelled");
      }
      setDeferredPrompt(null);
    });
  };

  const syncWithCloud = async (skip = false): Promise<SyncResult> => {
    if (!supabase || !user) return 'error';
    if (!navigator.onLine) { setSyncStatus('offline'); return 'offline'; }
    setSyncStatus('syncing');
    try {
      const { data: cloudLogs, error } = await supabase.from('workouts').select('*');
      if (error) throw error;
      if (!skip && (!cloudLogs || cloudLogs.length === 0) && logsRef.current.length > 0) {
        setSyncStatus('synced'); setShowCloudWipeDialog(true); return 'conflict_cloud_empty';
      }
      const cloudMap = new Map(cloudLogs?.map(l => [l.id, l]));
      const toUpload = logsRef.current.filter(l => !cloudMap.has(l.id) || !l.owner_id).map(l => ({ ...l, owner_id: user.id }));
      if (toUpload.length > 0) { const { error: e } = await supabase.from('workouts').upsert(toUpload); if (e) throw e; }
      setLogs(prev => {
        const map = new Map();
        cloudLogs?.forEach(cl => map.set(cl.id, cl));
        prev.forEach(pl => { if (!map.has(pl.id)) map.set(pl.id, { ...pl, owner_id: user.id }); });
        return Array.from(map.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      setSyncStatus('synced'); return 'success';
    } catch (err: any) { setSyncStatus('error'); setSyncError(err.message); return 'error'; }
  };

  useEffect(() => { if (appState === 'unlocked' && user && supabase) syncWithCloud(); }, [appState, user, supabase]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!supabase || !cleanEmail) return;
    setIsAuthLoading(true);
    setOtpCode(''); // Clear previous code
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      triggerToast("Code sent to your email!");
      setOnboardingStep('otp');
    } catch (err: any) {
      triggerToast(err.message || "Failed to send code");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = otpCode.trim();
    if (!supabase || !cleanEmail || !cleanCode) return;
    setIsAuthLoading(true);

    try {
      // STRATEGY: Try 'email' (for existing users) first.
      // If that fails, try 'signup' (for new users).
      // This is necessary because Supabase issues different token types based on user status
      // but the client doesn't know the status beforehand.
      
      let data, error;

      // Attempt 1: Email (Login)
      const res1 = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanCode,
        type: 'email'
      });

      data = res1.data;
      error = res1.error;

      // Attempt 2: Signup (Registration) if first attempt failed
      if (error) {
        // console.log("Email verification failed, trying signup type...");
        const res2 = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: 'signup'
        });
        
        // If second attempt succeeds, use it. If it fails, we keep the error to show user.
        if (!res2.error && res2.data.session) {
          data = res2.data;
          error = null;
        }
      }

      if (error) throw error;

      if (data && data.session) {
        localStorage.setItem('fit_skip_auth', 'true');
        setAppState('unlocked');
        triggerToast("Welcome!");
      } else {
        throw new Error("Verification failed. Please try again.");
      }
    } catch (err: any) {
      let message = err.message || "Invalid verification code";
      if (message.toLowerCase().includes('token has expired')) {
        message = "Code has expired. Please request a new one.";
      }
      triggerToast(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAddLog = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const reps = parseInt(newEntry.reps);
    if (!reps || reps <= 0) return;
    const log: WorkoutLog = { id: generateId(), date: entryDate.toISOString(), type: newEntry.type, reps, weight: newEntry.weight ? parseFloat(newEntry.weight) : undefined, owner_id: user?.id };
    setLogs(prev => [log, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    triggerToast("✓ Saved!");
    setNewEntry(prev => ({ ...prev, reps: '' }));
    if (user && supabase && navigator.onLine) await supabase.from('workouts').insert(log);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try { 
      if (supabase) await supabase.auth.signOut();
      await secureStore.removeSession();
      localStorage.removeItem('fit_skip_auth');
      setUser(null); setAppState('onboarding'); setOnboardingStep('welcome');
    } finally { setIsLoggingOut(false); setLogoutConfirm(false); }
  };

  const handleDeleteAccount = async () => {
    if (!supabase || !user) return;
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      triggerToast("Account deleted permanently");
      await handleLogout();
    } catch (err: any) {
      triggerToast("Deletion failed: " + err.message);
      setIsLoggingOut(false);
    } finally {
      setShowDeleteAccountConfirm(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) { triggerToast("No data to export"); return; }
    const headers = ["Date", "Type", "Reps", "Weight (kg)"];
    const rows = logs.map(log => [new Date(log.date).toISOString(), log.type, log.reps, log.weight || '']);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fittrack_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const newLogs: WorkoutLog[] = [];
        const lines = text.split('\n');
        lines.forEach((line, i) => {
          if (i === 0 || !line.trim()) return;
          const [d, t, r, w] = line.split(',').map(s => s.trim().replace(/"/g, ''));
          if (d && t && r) {
            newLogs.push({ id: generateId(), date: new Date(d).toISOString(), type: t as ExerciseType, reps: parseInt(r), weight: w ? parseFloat(w) : undefined, owner_id: user?.id });
          }
        });
        setLogs(prev => [...newLogs, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        triggerToast(`✓ Imported ${newLogs.length} logs!`);
        if (user && supabase && navigator.onLine) setTimeout(() => syncWithCloud(true), 500);
      } catch { triggerToast("Import failed"); }
    };
    reader.readAsText(file);
  };

  const handleVersionClick = () => {
    setDevModeCount(prev => {
      const next = prev + 1;
      if (next >= 3) { setShowTestDashboard(true); return 0; }
      return next;
    });
  };

  const handleSecurityToggle = async () => {
    const isSet = await secureStore.isPinSet();
    if (isSet || hasBiometrics) {
      await secureStore.clear();
      await updateHasBio();
      triggerToast("App lock disabled");
    } else {
      setAppState('creatingPin');
    }
  };

  const filteredStats = useMemo(() => {
    const now = new Date();
    return EXERCISES.map(ex => ({ ...ex, totalReps: logs.filter(l => {
      if (l.type !== ex.id) return false;
      const d = new Date(l.date);
      if (totalsTimeFrame === 'daily') return d.toDateString() === now.toDateString();
      if (totalsTimeFrame === 'weekly') { const w = new Date(); w.setDate(now.getDate() - 7); return d >= w; }
      if (totalsTimeFrame === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear();
    }).reduce((a, c) => a + c.reps, 0) }));
  }, [logs, totalsTimeFrame]);

  const maxStats = useMemo(() => EXERCISES.map(ex => {
    const exLogs = logs.filter(l => l.type === ex.id);
    let mr = 0, mrd, mw = 0, mwd;
    exLogs.forEach(l => { if (l.reps > mr) { mr = l.reps; mrd = l.date; } if (l.weight && l.weight > mw) { mw = l.weight; mwd = l.date; } });
    return { ...ex, maxRep: mr, maxRepDate: mrd, maxWeight: mw, maxWeightDate: mwd };
  }), [logs]);

  const historyLogs = useMemo(() => {
    if (!viewingHistory) return [];
    const now = new Date();
    return logs.filter(l => {
      if (l.type !== viewingHistory) return false;
      const d = new Date(l.date);
      if (totalsTimeFrame === 'daily') return d.toDateString() === now.toDateString();
      if (totalsTimeFrame === 'weekly') { const w = new Date(); w.setDate(now.getDate() - 7); return d >= w; }
      if (totalsTimeFrame === 'monthly') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return d.getFullYear() === now.getFullYear();
    });
  }, [logs, viewingHistory, totalsTimeFrame]);

  if (appState === 'loading') return <div className="h-[100dvh] bg-slate-50 flex items-center justify-center"><div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (appState === 'locked' || appState === 'confirmingPinForBio') return <PinLockScreen isCreating={false} onPinEnter={async pin => { if (await secureStore.verify(pin)) setAppState('unlocked'); else setPinError("Invalid PIN"); }} onReset={() => setAppState('onboarding')} error={pinError} showBiometrics={hasBiometrics} onBiometricAuth={async () => { const p = await secureStore.getBiometricPin(); if (p) setAppState('unlocked'); }} />;
  if (appState === 'creatingPin') return (
    <PinLockScreen 
      isCreating={true} 
      onPinCreate={async p => { 
        await secureStore.set(p, null);
        if (window.PublicKeyCredential) {
          try {
            const success = await secureStore.enableBiometrics(p);
            if (success) triggerToast("Biometrics enabled!");
          } catch (e) {
            console.warn("Biometric enroll skipped/failed", e);
          }
        }
        await updateHasBio();
        setAppState('unlocked'); 
      }} 
      onReset={() => setAppState('unlocked')} 
      error={null} 
    />
  );
  
  if (appState === 'onboarding') return (
    <div className="fixed inset-0 bg-indigo-600 z-50 p-8 flex flex-col items-center justify-center text-white text-center">
      <div className="mb-8">
        <div className="w-20 h-20 bg-white/20 rounded-3xl mx-auto mb-4 flex items-center justify-center text-4xl">⚡</div>
        <h1 className="text-3xl font-black">FitTrack Pro</h1>
        <p className="text-indigo-200 text-sm mt-2 font-medium">Your progress, everywhere.</p>
      </div>

      {onboardingStep === 'welcome' && (
        <div className="w-full max-w-xs space-y-4">
          <button onClick={() => setOnboardingStep('email')} className="w-full bg-white text-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-800/20 active:scale-95 transition-all">Sign In with Email</button>
          <button onClick={() => { localStorage.setItem('fit_skip_auth', 'true'); setAppState('unlocked'); }} className="text-indigo-200 text-xs font-bold uppercase tracking-widest py-2">Continue as Guest</button>
        </div>
      )}

      {onboardingStep === 'email' && (
        <form onSubmit={handleSendCode} className="w-full max-w-xs space-y-4">
          <div className="space-y-1">
            <input 
              type="email" 
              required
              placeholder="Enter your email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={isAuthLoading}
              className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 outline-none focus:bg-white/20 focus:border-white/40 transition-all placeholder:text-white/40 text-center" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isAuthLoading || !email}
            className="w-full bg-white text-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isAuthLoading ? "Sending..." : "Send Code"}
          </button>
          <button 
            type="button"
            onClick={() => setOnboardingStep('welcome')}
            className="text-indigo-200 text-xs font-bold uppercase tracking-widest py-2"
          >
            Back
          </button>
        </form>
      )}

      {onboardingStep === 'otp' && (
        <form onSubmit={handleVerifyCode} className="w-full max-w-xs space-y-4">
          <p className="text-xs text-indigo-100 mb-2">Verification code sent to<br/><span className="font-bold">{email}</span></p>
          <div className="space-y-1">
            <input 
              type="text" 
              required
              inputMode="numeric"
              placeholder="6-digit code" 
              value={otpCode}
              onChange={e => setOtpCode(e.target.value)}
              disabled={isAuthLoading}
              maxLength={6}
              className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 outline-none focus:bg-white/20 focus:border-white/40 transition-all placeholder:text-white/40 text-center text-2xl tracking-[0.5em] font-black" 
            />
          </div>
          <button 
            type="submit" 
            disabled={isAuthLoading || otpCode.length < 6}
            className="w-full bg-white text-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isAuthLoading ? "Verifying..." : "Verify & Continue"}
          </button>
          <div className="flex flex-col gap-2">
            <button 
              type="button"
              onClick={handleSendCode}
              disabled={isAuthLoading}
              className="text-indigo-200 text-[10px] font-black uppercase tracking-widest"
            >
              Resend Code
            </button>
            <button 
              type="button"
              onClick={() => setOnboardingStep('email')}
              className="text-indigo-200 text-xs font-bold uppercase tracking-widest py-2"
            >
              Change Email
            </button>
          </div>
        </form>
      )}
    </div>
  );

  return (
    <>
      {viewingHistory ? (
        <HistoryView viewingHistory={viewingHistory} onClose={() => setViewingHistory(null)} totalsTimeFrame={totalsTimeFrame} historyLogs={historyLogs} onDeleteLog={setLogToDelete} />
      ) : (
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} syncStatus={syncStatus} onSyncClick={() => syncWithCloud()} onShowToast={triggerToast}>
          {activeTab === 'dashboard' && <DashboardView logs={logs} totalsTimeFrame={totalsTimeFrame} setTotalsTimeFrame={setTotalsTimeFrame} filteredStats={filteredStats} maxStats={maxStats} setViewingHistory={setViewingHistory} />}
          {activeTab === 'add' && <AddLogView newEntry={newEntry} setNewEntry={setNewEntry} entryDate={entryDate} handleDateChange={e => setEntryDate(new Date(e.target.value))} handleAddLog={handleAddLog} />}
          {activeTab === 'settings' && <SettingsView user={user} isInstalled={isInstalled} handleInstallClick={handleInstallClick} syncStatus={syncStatus} onSyncManual={() => syncWithCloud()} onImportClick={() => fileInputRef.current?.click()} onExportCSV={handleExportCSV} onClearDataTrigger={() => setShowClearDataConfirm(true)} onDeleteAccountTrigger={() => setShowDeleteAccountConfirm(true)} hasBiometrics={hasBiometrics} onSecurityToggle={handleSecurityToggle} onChangePin={() => setAppState('creatingPin')} onPrivacyClick={() => setShowPrivacyDialog(true)} onAuthAction={() => { 
            if (user) { 
              if (logoutConfirm) handleLogout(); 
              else setLogoutConfirm(true); 
            } else { 
              setAppState('onboarding'); 
              setOnboardingStep('email'); 
            } 
          }} isLoggingOut={isLoggingOut} logoutConfirm={logoutConfirm} appVersion={APP_VERSION} onVersionClick={handleVersionClick} hasLocalData={logs.length > 0} />}
        </Layout>
      )}
      <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
      <AppDialogs 
        isCloudEnabled={!!user}
        syncError={syncError} 
        showSyncErrorDialog={showSyncErrorDialog} 
        onSyncErrorClose={() => setShowSyncErrorDialog(false)} 
        onSyncRetry={() => syncWithCloud()} 
        showCloudWipeDialog={showCloudWipeDialog} 
        onCloudKeepLocal={() => { setShowCloudWipeDialog(false); syncWithCloud(true); triggerToast("Uploading local data..."); }} 
        onCloudOverwriteLocal={() => { setLogs([]); setShowCloudWipeDialog(false); }} 
        showClearDataConfirm={showClearDataConfirm} 
        onClearDataCancel={() => setShowClearDataConfirm(false)} 
        onClearDataConfirm={async () => { 
          if (user && supabase && navigator.onLine) {
            try {
              const { error } = await supabase.from('workouts').delete().eq('owner_id', user.id);
              if (error) throw error;
            } catch (err) {
              triggerToast("Error clearing cloud data");
              setShowClearDataConfirm(false);
              return;
            }
          }
          setLogs([]); 
          setShowClearDataConfirm(false);
          triggerToast("All data deleted.");
        }} 
        logToDelete={logToDelete} 
        onDeleteLogCancel={() => setLogToDelete(null)} 
        onDeleteLogConfirm={() => { setLogs(prev => prev.filter(l => l.id !== logToDelete)); setLogToDelete(null); }} 
        showDeleteAccountConfirm={showDeleteAccountConfirm} 
        onDeleteAccountCancel={() => setShowDeleteAccountConfirm(false)} 
        onDeleteAccountConfirm={handleDeleteAccount} 
        showPrivacyDialog={showPrivacyDialog} 
        onPrivacyClose={() => setShowPrivacyDialog(false)} 
      />
      {showTestDashboard && <TestDashboard onClose={() => setShowTestDashboard(false)} logs={logs} />}
      {toastMessage && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl font-bold toast-animate text-white bg-slate-900 border border-slate-700/50 backdrop-blur-md">{toastMessage}</div>}
    </>
  );
};

export default App;