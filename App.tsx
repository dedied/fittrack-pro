
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import Layout, { TabType, SyncStatus } from './components/Layout';
import ProgressChart from './components/ProgressChart';
import PinLockScreen from './components/PinLockScreen';
import { WorkoutLog, EXERCISES, ExerciseType } from './types';
import { secureStore } from './utils/secureStore';

// ==========================================
// CONFIGURATION: Supabase credentials
// ==========================================
const SUPABASE_URL = 'https://infdrucgfquyujuqtajr.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_1dq2GSISKJheR-H149eEvg_uU_EuISF';
// ==========================================

export type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';
type AppState = 'loading' | 'locked' | 'unlocked' | 'onboarding' | 'creatingPin' | 'confirmingPinForBio';
const MAX_PIN_ATTEMPTS = 5;

const generateId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).substring(2)}`;

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [totalsTimeFrame, setTotalsTimeFrame] = useState<TimeFrame>('weekly');
  const [showToast, setShowToast] = useState(false);
  
  // History Drill Down State
  const [viewingHistory, setViewingHistory] = useState<ExerciseType | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempts, setPinAttempts] = useState(MAX_PIN_ATTEMPTS);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  
  // Profile & Auth State
  const [profileId, setProfileId] = useState<string | null>(null);
  const [idInput, setIdInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'id' | 'email' | 'otp'>('id');
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('unconfigured');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [logs, setLogs] = useState<WorkoutLog[]>(() => {
    try {
      const saved = localStorage.getItem('fit_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [newEntry, setNewEntry] = useState({ type: 'pushups' as ExerciseType, reps: '', weight: '' });

  // Initialize Supabase & App State
  useEffect(() => {
    const isPlaceholder = SUPABASE_URL.includes('your-project');
    if (!isPlaceholder) {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      setSupabase(client);
      
      const initializeAuth = async () => {
        const bioAvailable = await secureStore.hasBiometrics();
        setHasBiometrics(bioAvailable);

        if (await secureStore.isPinSet()) {
          setAppState('locked');
        } else {
          // No PIN set, allow default access if session exists
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            await resolveProfileForUser(client, session.user.id, session);
            setAppState('unlocked');
          } else {
            setAppState('onboarding');
          }
        }
      };
      initializeAuth();
      
      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      return () => subscription.unsubscribe();
    } else {
      setAppState('onboarding'); // Fallback if Supabase isn't configured
    }
  }, []);

  // Timer logic for OTP cooldown
  useEffect(() => {
    if (resendTimer > 0) {
      const timerId = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timerId);
    }
  }, [resendTimer]);

  const resolveProfileForUser = async (client: SupabaseClient, userId: string, session?: any) => {
    try {
      const { data, error } = await client.from('profiles').select('id').eq('owner_id', userId).maybeSingle();
      if (error) throw error;
      if (data?.id) {
        setProfileId(data.id);
        setUser(session?.user);
      }
    } catch (e) { console.warn("Silent profile resolve fail:", e); }
  };

  // Sync Logic
  useEffect(() => {
    if (appState === 'unlocked' && profileId && user && supabase) {
      syncWithCloud();
    }
  }, [appState, profileId, user, supabase]);

  const syncWithCloud = async () => {
    if (!supabase || !profileId || !user) return;
    setSyncStatus('syncing');
    try {
      const { data: cloudLogs, error } = await supabase.from('workouts').select('*').eq('user_id', profileId);
      if (error) throw error;
      const cloudMap = new Map((cloudLogs || []).map(l => [l.id, l]));
      const mergedLogs = [...logs];
      cloudLogs?.forEach(cl => {
        if (!mergedLogs.find(l => l.id === cl.id)) mergedLogs.push(cl);
      });
      const toUpload = logs.filter(ll => !cloudMap.has(ll.id)).map(ll => ({ ...ll, user_id: profileId }));
      if (toUpload.length > 0) await supabase.from('workouts').insert(toUpload);
      setLogs(mergedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      setSyncStatus('synced');
    } catch (err) {
      console.error("Sync error:", err); setSyncStatus('offline');
    }
  };

  useEffect(() => localStorage.setItem('fit_logs', JSON.stringify(logs)), [logs]);

  // --- PIN and Auth Handlers ---

  const handlePinEnter = async (pin: string) => {
    if (pinAttempts <= 0) return;
    setPinError(null);
    
    // Check if the pin is correct by trying to decrypt session
    const sessionData = await secureStore.get(pin);
    
    if (sessionData && supabase) {
      // If we are just enabling security (creating pin), enable bio now
      if (appState === 'creatingPin') {
         // This state is reached via handlePinCreate's callback loop if we used the same component logic, 
         // but we handle handlePinCreate separately below. 
         // This block handles specific re-auth scenarios if needed.
         return;
      }

      // Standard Login
      const { error } = await supabase.auth.setSession(sessionData as any);
      if (error) {
        setPinError("Invalid session. Please log in again.");
        await handleResetPin();
      } else {
        await resolveProfileForUser(supabase, (sessionData as any).user.id, sessionData);
        setPinAttempts(MAX_PIN_ATTEMPTS);
        setAppState('unlocked');
      }
    } else {
      setPinError("Incorrect PIN");
      setPinAttempts(prev => prev - 1);
      if ('vibrate' in navigator) navigator.vibrate(100);
    }
  };

  const handleBiometricUnlock = async () => {
    const pin = await secureStore.getBiometricPin();
    if (pin) {
      await handlePinEnter(pin);
    }
  };

  const handleEnableSecurity = () => {
    setAppState('creatingPin');
  };

  const handleDisableSecurity = async () => {
    if (window.confirm("Disable App Lock & Biometrics? Your app will be accessible without a PIN.")) {
      await secureStore.clear();
      setHasBiometrics(false);
    }
  };

  // Called when user finishes creating a PIN in settings
  const handlePinCreate = async (pin: string) => {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // 1. Save session encrypted with PIN
      await secureStore.set(pin, session);
      
      // 2. Immediately attempt to enable biometrics
      try {
        const bioSuccess = await secureStore.enableBiometrics(pin);
        if (bioSuccess) {
          setHasBiometrics(true);
          alert("App Lock & Biometrics Enabled!");
        } else {
          alert("PIN set, but Biometrics could not be enabled. You can use the PIN to unlock.");
          setHasBiometrics(false);
        }
      } catch (e) {
        console.error(e);
        alert("PIN set. Biometrics failed.");
      }
      setAppState('unlocked');
    } else {
      alert("Session not found. Please log in again.");
      setAppState('onboarding');
    }
  };

  const handleResetPin = async () => {
    await secureStore.clear();
    setPinAttempts(MAX_PIN_ATTEMPTS);
    setPinError(null);
    setHasBiometrics(false);
    setAppState('onboarding');
    if (supabase) await supabase.auth.signOut();
  };
  
  // --- Existing Auth Handlers (Modified) ---

  const handleCheckId = async (e: React.FormEvent) => {
    e.preventDefault(); if (!supabase) return; const cleanId = idInput.trim().toLowerCase(); if (!cleanId) return;
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.from('profiles').select('id, email').eq('id', cleanId).maybeSingle();
      if (error) throw error;
      setExistingProfile(data); setOnboardingStep('email'); if (data?.email) setEmailInput(data.email);
    } catch (err: any) { alert("Profile Check Error: " + err.message); } finally { setIsVerifying(false); }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); if (!supabase || isVerifying || resendTimer > 0) return;
    const cleanEmail = emailInput.trim().toLowerCase();
    if (existingProfile && cleanEmail !== existingProfile.email) { alert("This Profile ID is linked to a different email address."); return; }
    setIsVerifying(true);
    try {
      setOtpInput('');
      const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: true }});
      if (error) throw error;
      setResendTimer(60); setOnboardingStep('otp');
    } catch (err: any) { alert("Code Request Error: " + err.message); } finally { setIsVerifying(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault(); if (!supabase || isVerifying) return; const cleanCode = otpInput.trim(); if (cleanCode.length < 6) return alert("Please enter the code.");
    setIsVerifying(true); const email = emailInput.trim().toLowerCase();
    try {
      let session = null; let lastError = null;
      for (const type of ['magiclink', 'signup', 'email', 'recovery'] as any[]) {
        const { data, error } = await supabase.auth.verifyOtp({ email, token: cleanCode, type });
        if (!error && data.session) { session = data.session; break; } if (error) lastError = error;
      }
      if (session) await finishVerification(session); else throw lastError || new Error("Invalid or expired code.");
    } catch (err: any) { alert("Verification Failed:\n" + err.message); } finally { setIsVerifying(false); }
  };

  const finishVerification = async (session: any) => {
    if (!supabase) return; const cleanId = idInput.trim().toLowerCase();
    try {
      const { data: existingOwnProfile } = await supabase.from('profiles').select('id').eq('owner_id', session.user.id).maybeSingle();
      if (!existingOwnProfile) {
        const { error: profileError } = await supabase.from('profiles').insert([{ id: cleanId, owner_id: session.user.id, email: session.user.email }]);
        if (profileError) throw profileError;
      }
      setProfileId(cleanId);
      setUser(session.user);
      // Skip PIN creation by default, go straight to unlocked
      setAppState('unlocked');
    } catch (err: any) { alert("Setup failed: " + err.message); }
  };

  const handleLogout = async () => {
    if (window.confirm("Log out?")) {
      await secureStore.clear();
      if (supabase) await supabase.auth.signOut();
      setProfileId(null); setUser(null); setSyncStatus('unconfigured');
      setOnboardingStep('id'); setIdInput(''); setEmailInput(''); setOtpInput('');
      setHasBiometrics(false);
      setAppState('onboarding');
    }
  };

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to clear all workout logs? This cannot be undone.")) {
      setLogs([]); localStorage.removeItem('fit_logs'); if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert("No data to export!");
      return;
    }
    const headers = ["Date", "Type", "Reps", "Weight (kg)"];
    const rows = logs.map(log => [
      `"${new Date(log.date).toLocaleString()}"`,
      log.type,
      log.reps,
      log.weight || ''
    ]);
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
    const file = e.target.files?.[0]; if (!file) return; const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string; if (!text) return; const newLogs: WorkoutLog[] = [];
      text.split('\n').forEach((line, index) => {
        if (!line.trim() || (index === 0 && (line.toLowerCase().includes('date')))) return;
        const [dateStr, typeStr, repsStr, weightStr] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        if (dateStr && typeStr && repsStr) {
          newLogs.push({ id: generateId(), date: new Date(dateStr).toISOString(), type: typeStr as ExerciseType, reps: parseInt(repsStr) || 0, weight: weightStr ? parseFloat(weightStr) : undefined, user_id: profileId || undefined });
        }
      });
      if (newLogs.length > 0) { setLogs(prev => [...newLogs, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); alert(`Imported ${newLogs.length} logs!`); }
    };
    reader.readAsText(file); if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => { const h = (e: any) => { e.preventDefault(); setDeferredPrompt(e); }; window.addEventListener('beforeinstallprompt', h); return () => window.removeEventListener('beforeinstallprompt', h); }, []);
  const handleInstallClick = async () => { if (deferredPrompt) { await deferredPrompt.prompt(); } else { alert("To install, use your browser's 'Add to Home Screen' feature."); }};

  const filteredStats = useMemo(() => {
    const now = new Date(); return EXERCISES.map(ex => ({ ...ex, totalReps: logs.filter(log => {
      if (log.type !== ex.id) return false; const logDate = new Date(log.date);
      switch (totalsTimeFrame) {
        case 'daily': return logDate.toDateString() === now.toDateString();
        case 'weekly': const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); return logDate >= weekAgo;
        case 'monthly': return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        default: return logDate.getFullYear() === now.getFullYear();
      }}).reduce((acc, curr) => acc + curr.reps, 0)}));
  }, [logs, totalsTimeFrame]);

  // Derived state for the history view
  const historyLogs = useMemo(() => {
    if (!viewingHistory) return [];
    const now = new Date();
    return logs.filter(log => {
      if (log.type !== viewingHistory) return false;
      const logDate = new Date(log.date);
      switch (totalsTimeFrame) {
        case 'daily': return logDate.toDateString() === now.toDateString();
        case 'weekly': const weekAgo = new Date(); weekAgo.setDate(now.getDate() - 7); return logDate >= weekAgo;
        case 'monthly': return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
        default: return logDate.getFullYear() === now.getFullYear();
      }
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [logs, viewingHistory, totalsTimeFrame]);

  const handleAddLog = async (e: React.MouseEvent) => {
    e.stopPropagation(); const repsNum = parseInt(newEntry.reps); if (isNaN(repsNum) || repsNum <= 0) return;
    const log: WorkoutLog = { id: generateId(), date: new Date().toISOString(), type: newEntry.type, reps: repsNum, weight: parseFloat(newEntry.weight) || undefined, user_id: profileId || undefined };
    if ('vibrate' in navigator) navigator.vibrate(25); setLogs(prev => [log, ...prev]); setNewEntry({ type: newEntry.type, reps: '', weight: '' });
    setShowToast(true);
    if (supabase && profileId && user) {
      setSyncStatus('syncing'); const { error } = await supabase.from('workouts').insert([log]); setSyncStatus(error ? 'offline' : 'synced');
    }
    setTimeout(() => { setShowToast(false); setActiveTab('dashboard'); }, 1500);
  };

  const maxStats = useMemo(() => EXERCISES.map(ex => {
    const exerciseLogs = logs.filter(log => log.type === ex.id);
    return { ...ex, maxRep: Math.max(0, ...exerciseLogs.map(l => l.reps)), maxWeight: Math.max(0, ...exerciseLogs.map(l => l.weight || 0)) };
  }), [logs]);

  // --- Render Logic based on AppState ---
  
  if (appState === 'loading') {
    return <div className="h-[100dvh] bg-slate-50 flex items-center justify-center"><div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;
  }

  // Reuse PinLockScreen for both Locked state and Confirming state
  if (appState === 'locked' || appState === 'confirmingPinForBio') {
    return (
      <PinLockScreen 
        isCreating={false} 
        onPinEnter={handlePinEnter} 
        onReset={appState === 'confirmingPinForBio' ? () => setAppState('unlocked') : handleResetPin} 
        error={pinError} 
        attemptsLeft={pinAttempts}
        showBiometrics={appState === 'locked' && hasBiometrics}
        onBiometricAuth={handleBiometricUnlock}
      />
    );
  }

  if (appState === 'creatingPin') {
    return <PinLockScreen isCreating={true} onPinCreate={handlePinCreate} onReset={() => setAppState('unlocked')} error={null} />;
  }

  if (appState === 'onboarding') {
    return (
      <div className="h-[100dvh] bg-indigo-600 flex flex-col items-center justify-center p-8 text-white overflow-hidden">
        <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-md animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <div className="text-center space-y-4 max-w-sm"><h1 className="text-3xl font-black">FitTrack Pro</h1><p className="text-indigo-100/80 text-sm font-medium leading-relaxed">{onboardingStep === 'id' ? "Enter a unique Profile ID to sync your data." : onboardingStep === 'email' ? "Link your account to an email." : "Enter your verification code."}</p></div>
        <div className="mt-12 w-full max-w-sm space-y-4">
          {onboardingStep === 'id' && (<form onSubmit={handleCheckId} className="space-y-4"><input type="text" required value={idInput} onChange={e => setIdInput(e.target.value)} placeholder="Profile ID" className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-5 text-white placeholder-white/40 font-bold outline-none focus:border-white/60 text-center" /><button type="submit" className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black shadow-xl">Continue</button></form>)}
          {onboardingStep === 'email' && (<form onSubmit={handleRequestOtp} className="space-y-4"><input type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="Email Address" className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-5 text-white placeholder-white/40 font-bold outline-none focus:border-white/60 text-center" /><button type="submit" disabled={resendTimer > 0} className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black shadow-xl disabled:opacity-50">{resendTimer > 0 ? `Wait ${resendTimer}s` : "Send Code"}</button></form>)}
          {onboardingStep === 'otp' && (<form onSubmit={handleVerifyOtp} className="space-y-4"><input type="text" inputMode="numeric" required value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="000000" className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-5 text-white placeholder-white/40 font-bold outline-none focus:border-white/60 text-center tracking-widest text-4xl" /><button type="submit" className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black shadow-xl">Verify</button></form>)}
        </div>
      </div>
    );
  }

  // --- Main Render ---

  // History Detail View
  if (activeTab === 'dashboard' && viewingHistory) {
    const exerciseDef = EXERCISES.find(e => e.id === viewingHistory);
    return (
      <div className="h-[100dvh] w-full flex flex-col bg-slate-50 relative">
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 flex items-center gap-4 z-30 shadow-sm sticky top-0">
          <button onClick={() => setViewingHistory(null)} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-800 tracking-tight">{exerciseDef?.label} History</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase">{totalsTimeFrame} Logs</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
          {historyLogs.length === 0 ? (
            <div className="text-center text-slate-400 py-10">No logs found for this period.</div>
          ) : (
            historyLogs.map(log => (
              <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                <div>
                   <p className="text-sm font-bold text-slate-800">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                   <p className="text-[10px] text-slate-400 font-bold">{new Date(log.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <div className="text-right">
                   <p className="text-lg font-black text-indigo-600">{log.reps} <span className="text-[10px] text-slate-400 font-bold uppercase">Reps</span></p>
                   {log.weight && <p className="text-xs font-bold text-emerald-600">{log.weight}kg</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} syncStatus={syncStatus}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <ProgressChart logs={logs} />
          <section className="space-y-3">
            <div className="flex items-center justify-between ml-1">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Period Totals</h2>
              <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/50">{(['daily', 'weekly', 'monthly', 'yearly'] as TimeFrame[]).map(tf => (<button key={tf} onClick={() => setTotalsTimeFrame(tf)} className={`px-2 py-1 text-[9px] font-bold uppercase rounded-lg ${totalsTimeFrame === tf ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{tf.charAt(0)}</button>))}</div>
            </div>
            <div className="grid grid-cols-3 gap-3">{filteredStats.map(ex => (
              <div 
                key={ex.id} 
                onClick={() => setViewingHistory(ex.id)}
                className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center cursor-pointer active:scale-95 transition-transform hover:border-indigo-100"
              >
                <div className="mb-2">{ex.icon}</div>
                <span className="text-[10px] text-slate-400 font-bold uppercase text-center">{ex.label}</span>
                <span className="text-xl font-bold text-slate-800">{ex.totalReps}</span>
              </div>
            ))}</div>
          </section>
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-1">🏆 Personal Bests</h2>
            <div className="grid grid-cols-1 gap-3">{maxStats.map(ex => (<div key={ex.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"><div className="flex items-center gap-3"><div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ex.color} bg-opacity-10`}>{ex.icon}</div><div><p className="font-bold text-slate-800">{ex.label}</p><p className="text-[10px] text-slate-400 uppercase font-bold">{ex.targetMuscle}</p></div></div><div className="flex gap-4"><div className="text-right"><p className="text-xl font-black text-indigo-600">{ex.maxRep}</p><p className="text-[8px] text-slate-400 uppercase font-bold">Reps</p></div>{ex.isWeighted && <div className="text-right border-l pl-4"><p className="text-xl font-black text-emerald-600">{ex.maxWeight}kg</p><p className="text-[8px] text-slate-400 uppercase font-bold">Weight</p></div>}</div></div>))}</div>
          </section>
        </div>
      )}
      {activeTab === 'add' && (
        <div className="space-y-6">
          <div className="text-center font-bold text-slate-800 text-2xl">Record Set</div>
          <div className="space-y-2">{EXERCISES.map(ex => (<button key={ex.id} onClick={() => setNewEntry({ ...newEntry, type: ex.id })} className={`flex items-center gap-4 p-4 rounded-2xl border-2 w-full transition-all ${newEntry.type === ex.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ex.color} bg-opacity-10`}>{ex.icon}</div><div className="font-bold text-slate-800">{ex.label}</div></button>))}</div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Reps</label><input type="number" inputMode="numeric" value={newEntry.reps} onChange={e => setNewEntry({...newEntry, reps: e.target.value})} placeholder="0" className="w-full text-2xl font-bold text-center p-5 bg-white border border-slate-100 rounded-2xl focus:border-indigo-600 outline-none" /></div>
            <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Weight (kg)</label><input type="number" inputMode="decimal" value={newEntry.weight} onChange={e => setNewEntry({...newEntry, weight: e.target.value})} placeholder="0" disabled={!EXERCISES.find(e => e.id === newEntry.type)?.isWeighted} className="w-full text-2xl font-bold text-center p-5 bg-white border border-slate-100 rounded-2xl focus:border-indigo-600 outline-none" /></div>
          </div>
          <button onClick={handleAddLog} disabled={!newEntry.reps || parseInt(newEntry.reps) <= 0 || showToast} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg">{showToast ? 'SAVED! ✨' : 'SAVE SET'}</button>
        </div>
      )}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <header className="text-center font-bold text-2xl text-slate-800">Settings</header>
          
          {/* Profile Card */}
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3"><div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black text-lg">{profileId?.charAt(0).toUpperCase()}</div><div><p className="font-bold text-slate-800 truncate max-w-[150px]">{profileId}</p><p className="text-[10px] text-emerald-500 font-bold uppercase">Cloud Connected</p></div></div>
            <button onClick={handleLogout} className="text-[10px] font-black text-slate-400 uppercase border-2 border-slate-50 px-4 py-2 rounded-xl hover:text-red-500">Sign Out</button>
          </div>

          {/* Install App Button - Standalone Section */}
          <button onClick={handleInstallClick} className="w-full bg-white rounded-[2rem] p-6 border border-slate-100 flex items-center gap-4 shadow-sm text-indigo-600 active:scale-95 transition-transform">
             <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
             </div>
             <div className="text-left flex-1">
               <p className="font-bold text-lg text-slate-800">Install App</p>
               <p className="text-[10px] font-bold uppercase text-slate-400">Add to Home Screen</p>
             </div>
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>

          {/* Main Settings List */}
          <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <button onClick={hasBiometrics ? handleDisableSecurity : handleEnableSecurity} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b text-slate-800">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasBiometrics ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100'}`}>
                {hasBiometrics ? (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                )}
              </div>
              <div className="text-left flex-1 font-bold">
                {hasBiometrics ? "Disable App Lock" : "Enable App Lock & Biometrics"}
              </div>
              {!hasBiometrics && <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>}
            </button>
            
            {hasBiometrics && (
              <button onClick={() => setAppState('creatingPin')} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b text-slate-800">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">🔐</div>
                 <div className="text-left flex-1 font-bold">Change PIN</div>
              </button>
            )}

            <button onClick={() => fileInputRef.current?.click()} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b text-slate-800"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">📥</div><div className="text-left flex-1 font-bold">Import Data</div></button>
            <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
            <button onClick={handleExportCSV} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b text-slate-800"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">📤</div><div className="text-left flex-1 font-bold">Export Data</div></button>
            <button onClick={clearAllData} className="w-full p-6 flex items-center gap-4 hover:bg-red-50 text-red-600"><div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">🗑️</div><div className="text-left flex-1 font-bold">Clear All Data</div></button>
          </div>
        </div>
      )}
      {showToast && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-2xl toast-animate">✓ Logged!</div>}
    </Layout>
  );
};

export default App;
