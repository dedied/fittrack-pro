
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import Layout, { TabType, SyncStatus } from './components/Layout';
import DashboardView from './components/DashboardView';
import AddLogView from './components/AddLogView';
import SettingsView from './components/SettingsView';
import HistoryView from './components/HistoryView';
import ExerciseManager from './components/ExerciseManager';
import AppDialogs from './components/AppDialogs';
import PinLockScreen from './components/PinLockScreen';
import { WorkoutLog, EXERCISES, ExerciseType, DEFAULT_EXERCISES, UnitSystem, FREE_TIER_LIMIT } from './types';
import { secureStore } from './utils/secureStore';
import { generateId } from './utils/dateUtils';
import { showToast } from './utils/toast';
import { toStorageWeight, toStorageDistance, toDisplayWeight, toDisplayDistance, getWeightUnit, getDistanceUnit, isDistanceExercise } from './utils/units';
import { generateDemoData } from './utils/demoData';

const SUPABASE_URL = 'https://infdrucgfquyujuqtajr.supabase.co/';
const SUPABASE_ANON_KEY = 'sb_publishable_1dq2GSISKJheR-H149eEvg_uU_EuISF';
const APP_VERSION = '2.7.0';

export type TimeFrame = 'daily' | 'weekly' | 'monthly' | 'yearly';
type AppState = 'loading' | 'locked' | 'unlocked' | 'onboarding' | 'creatingPin' | 'confirmingPinForBio';
type SyncResult = 'success' | 'error' | 'offline' | 'conflict_cloud_empty';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  const [showPrivacyDialog, setShowPrivacyDialog] = useState(false);
  const [logToDelete, setLogToDelete] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showSyncErrorDialog, setShowSyncErrorDialog] = useState(false);
  const [showCloudWipeDialog, setShowCloudWipeDialog] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<ExerciseType | null>(null);
  const [showExerciseManager, setShowExerciseManager] = useState(false);
  
  // Unit System State
  const [unitSystem, setUnitSystem] = useState<UnitSystem>(() => 
    (localStorage.getItem('fit_unit_system') as UnitSystem) || 'metric'
  );

  useEffect(() => {
    localStorage.setItem('fit_unit_system', unitSystem);
  }, [unitSystem]);

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
  const [isPremium, setIsPremium] = useState(false); // New Premium Flag
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('unconfigured');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  // Active Exercises State
  const [activeExerciseIds, setActiveExerciseIds] = useState<ExerciseType[]>(() => {
    try {
      const saved = localStorage.getItem('fit_active_exercises');
      return saved ? JSON.parse(saved) : DEFAULT_EXERCISES;
    } catch { return DEFAULT_EXERCISES; }
  });

  useEffect(() => {
    localStorage.setItem('fit_active_exercises', JSON.stringify(activeExerciseIds));
  }, [activeExerciseIds]);

  // Fetch Premium Status
  const fetchProfile = useCallback(async (userId: string, client: SupabaseClient) => {
    try {
      const { data, error } = await client
        .from('profiles')
        .select('is_premium')
        .eq('id', userId)
        .single();
      
      if (data && !error) {
        setIsPremium(data.is_premium);
      }
    } catch (e) {
      console.warn("Could not fetch profile", e);
    }
  }, []);

  const toggleExercise = (id: ExerciseType) => {
    setActiveExerciseIds(prev => {
      const isRemoving = prev.includes(id);
      
      if (isRemoving) {
        if (prev.length <= 1) {
          showToast("Keep at least one exercise active");
          return prev;
        }
        return prev.filter(e => e !== id);
      }
      
      // Adding: Check Limit
      if (!isPremium && prev.length >= FREE_TIER_LIMIT) {
        showToast(`Free limit reached (${FREE_TIER_LIMIT} max)`);
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleUpdateActiveExercises = (ids: ExerciseType[]) => {
    if (!isPremium && ids.length > FREE_TIER_LIMIT) {
      showToast(`Free plan limited to ${FREE_TIER_LIMIT} exercises`);
      // Optional: Clamp to limit instead of rejecting? Rejecting is safer for bulk select.
      return; 
    }
    setActiveExerciseIds(ids);
  };

  const activateExercisesFromLogs = useCallback((incomingLogs: WorkoutLog[]) => {
    const incomingTypes = new Set(incomingLogs.map(l => l.type));
    setActiveExerciseIds(prev => {
      const next = new Set(prev);
      let changed = false;
      incomingTypes.forEach(t => {
        if (!next.has(t) && EXERCISES.some(e => e.id === t)) {
          // IMPORTANT: Even if importing logs, if user is not premium, we shouldn't visually 
          // activate more than the limit in the UI toggle list, technically.
          // However, for data integrity, if they have logs, they should probably see them.
          // For now, we allow activation via logs, but prevent manual selection.
          next.add(t);
          changed = true;
        }
      });
      return changed ? Array.from(next) : prev;
    });
  }, []);

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
  
  const toastTimeoutRef = useRef<any>(null);

  useEffect(() => { localStorage.setItem('fit_logs', JSON.stringify(logs)); }, [logs]);

  const updateHasBio = async () => {
    const bio = await secureStore.hasBiometrics();
    setHasBiometrics(bio);
  };
  
  const triggerToast = useCallback((msg: string) => { 
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg); 
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 3000); 
  }, []);

  useEffect(() => {
    const handleShowToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.message) {
        triggerToast(customEvent.detail.message);
      }
    };
    window.addEventListener('show-toast', handleShowToast);
    
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    setSupabase(client);
    
    const init = async () => {
      await updateHasBio();
      if (await secureStore.isPinSet()) setAppState('locked');
      else {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) { 
          setUser(session.user); 
          fetchProfile(session.user.id, client);
          setAppState('unlocked'); 
        }
        else if (localStorage.getItem('fit_skip_auth') === 'true') setAppState('unlocked');
        else { setAppState('onboarding'); setOnboardingStep('welcome'); }
      }
    };
    init();
    
    const { data: { subscription } } = client.auth.onAuthStateChange((_, s) => {
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id, client);
        setAppState(prev => (prev === 'onboarding' ? 'unlocked' : prev));
      } else {
        setIsPremium(false); // Reset on logout
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('show-toast', handleShowToast);
    };
  }, [triggerToast, fetchProfile]);

  const syncWithCloud = async (skip = false): Promise<SyncResult> => {
    if (!supabase || !user) return 'error';
    if (!navigator.onLine) { setSyncStatus('offline'); return 'offline'; }
    setSyncStatus('syncing');
    try {
      // Re-fetch profile on sync to ensure premium status is up to date
      await fetchProfile(user.id, supabase);

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

      if (cloudLogs && cloudLogs.length > 0) {
        activateExercisesFromLogs(cloudLogs);
      }

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
      showToast("Code sent to your email!");
      setOnboardingStep('otp');
    } catch (err: any) {
      showToast(err.message || "Failed to send code");
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
      let data, error;
      const res1 = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: 'email' });
      data = res1.data;
      error = res1.error;

      if (error) {
        const res2 = await supabase.auth.verifyOtp({ email: cleanEmail, token: cleanCode, type: 'signup' });
        if (!res2.error && res2.data.session) {
          data = res2.data;
          error = null;
        }
      }

      if (error) throw error;

      if (data && data.session) {
        localStorage.setItem('fit_skip_auth', 'true');
        setAppState('unlocked');
        showToast("Welcome!");
      } else {
        throw new Error("Verification failed. Please try again.");
      }
    } catch (err: any) {
      let message = err.message || "Invalid verification code";
      if (message.toLowerCase().includes('token has expired')) {
        message = "Code has expired. Please request a new one.";
      }
      showToast(message);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleAddLog = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    let reps = parseFloat(newEntry.reps);
    let weight = newEntry.weight ? parseFloat(newEntry.weight) : undefined;
    
    if (!reps || reps <= 0) return;

    // CONVERT INPUT TO STORAGE (METRIC)
    if (unitSystem === 'imperial') {
      if (newEntry.weight && weight) {
        weight = toStorageWeight(weight);
      }
      if (isDistanceExercise(newEntry.type)) {
        reps = toStorageDistance(reps);
      }
    }

    const log: WorkoutLog = { 
      id: generateId(), 
      date: entryDate.toISOString(), 
      type: newEntry.type, 
      reps, 
      weight: weight, 
      owner_id: user?.id 
    };

    setLogs(prev => [log, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    showToast("✓ Saved!");
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
      setIsPremium(false);
    } finally { setIsLoggingOut(false); setLogoutConfirm(false); }
  };

  const handleDeleteAccount = async () => {
    if (!supabase || !user) return;
    setIsLoggingOut(true);
    try {
      const { error } = await supabase.rpc('delete_user');
      if (error) throw error;
      showToast("Account deleted permanently");
      await handleLogout();
    } catch (err: any) {
      showToast("Deletion failed: " + err.message);
      setIsLoggingOut(false);
    } finally {
      setShowDeleteAccountConfirm(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) { showToast("No data to export"); return; }
    
    // Dynamic headers based on unit system
    const wUnit = getWeightUnit(unitSystem);
    // Note: Reps header is generic, but values will be converted if distance
    const headers = ["Date", "Type", "Reps/Dist", `Weight (${wUnit})`];
    
    const rows = logs.map(log => {
      // CONVERT STORAGE (METRIC) TO EXPORT (DISPLAY)
      let displayReps = log.reps;
      let displayWeight = log.weight;

      if (unitSystem === 'imperial') {
         if (isDistanceExercise(log.type)) {
           displayReps = toDisplayDistance(log.reps, 'imperial');
         }
         if (log.weight) {
           displayWeight = toDisplayWeight(log.weight, 'imperial');
         }
      }

      return [
        new Date(log.date).toISOString(), 
        log.type, 
        displayReps, 
        displayWeight || ''
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fittrack_${unitSystem}_${new Date().toISOString().split('T')[0]}.csv`);
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
        
        // Detect units from header
        const header = lines[0].toLowerCase();
        const isImperialWeight = header.includes('(lbs)');
        const isImperialContext = isImperialWeight; 

        lines.forEach((line, i) => {
          if (i === 0 || !line.trim()) return;
          const [d, t, r, w] = line.split(',').map(s => s.trim().replace(/"/g, ''));
          
          if (d && t && r) {
            let reps = parseFloat(r);
            let weight = w ? parseFloat(w) : undefined;

            // CONVERT IMPORT -> STORAGE (METRIC)
            if (isImperialContext) {
               if (weight) weight = toStorageWeight(weight);
               if (isDistanceExercise(t)) reps = toStorageDistance(reps);
            }

            newLogs.push({ 
              id: generateId(), 
              date: new Date(d).toISOString(), 
              type: t as ExerciseType, 
              reps, 
              weight, 
              owner_id: user?.id 
            });
          }
        });
        setLogs(prev => [...newLogs, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        activateExercisesFromLogs(newLogs);
        showToast(`✓ Imported ${newLogs.length} logs!`);
        if (user && supabase && navigator.onLine) setTimeout(() => syncWithCloud(true), 500);
      } catch { showToast("Import failed"); }
    };
    reader.readAsText(file);
  };

  const handleGenerateDemoData = () => {
    if (logs.length > 0) return;
    
    // Pass limit to generator if not premium
    const limit = isPremium ? undefined : FREE_TIER_LIMIT;
    const demoLogs = generateDemoData(limit);
    
    // Assign owner_id if user is logged in
    if (user) {
      demoLogs.forEach(l => l.owner_id = user.id);
    }
    
    setLogs(demoLogs);
    
    // UPDATE: If not premium, forcefully reset active exercises to match the generated data exactly
    // ensuring we don't exceed the limit by adding to existing selections.
    if (!isPremium) {
       const newTypes = Array.from(new Set(demoLogs.map(l => l.type)));
       setActiveExerciseIds(newTypes);
    } else {
       activateExercisesFromLogs(demoLogs);
    }
    
    showToast(`Generated ${demoLogs.length} demo entries!`);
    
    if (user && supabase && navigator.onLine) {
        setTimeout(() => syncWithCloud(true), 500);
    }
  };

  const handleSecurityToggle = async () => {
    const isSet = await secureStore.isPinSet();
    if (isSet || hasBiometrics) {
      await secureStore.clear();
      await updateHasBio();
      showToast("App lock disabled");
    } else {
      setAppState('creatingPin');
    }
  };

  const activeExercises = useMemo(() => {
    return EXERCISES.filter(ex => activeExerciseIds.includes(ex.id));
  }, [activeExerciseIds]);

  const maxStats = useMemo(() => activeExercises.map(ex => {
    const exLogs = logs.filter(l => l.type === ex.id);
    let mr = 0, mrd, mw = 0, mwd;
    exLogs.forEach(l => { if (l.reps > mr) { mr = l.reps; mrd = l.date; } if (l.weight && l.weight > mw) { mw = l.weight; mwd = l.date; } });
    return { ...ex, maxRep: mr, maxRepDate: mrd, maxWeight: mw, maxWeightDate: mwd };
  }), [logs, activeExercises]);

  const historyLogs = useMemo(() => {
    if (!viewingHistory) return [];
    return logs.filter(l => l.type === viewingHistory);
  }, [logs, viewingHistory]);

  if (appState === 'loading') return <div className="h-[100dvh] bg-slate-50 flex items-center justify-center"><div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" /></div>;
  if (appState === 'locked' || appState === 'confirmingPinForBio') return <PinLockScreen isCreating={false} onPinEnter={async pin => { if (await secureStore.verify(pin)) setAppState('unlocked'); else setPinError("Invalid PIN"); }} onReset={() => setAppState('onboarding')} error={pinError} showBiometrics={hasBiometrics} onBiometricAuth={async () => { const p = await secureStore.getBiometricPin(); if (p) setAppState('unlocked'); }} />;
  if (appState === 'creatingPin') return <PinLockScreen isCreating={true} onPinCreate={async p => { await secureStore.set(p, null); if (window.PublicKeyCredential) { try { const success = await secureStore.enableBiometrics(p); if (success) showToast("Biometrics enabled!"); } catch (e) { console.warn("Biometric enroll skipped", e); } } await updateHasBio(); setAppState('unlocked'); }} onReset={() => setAppState('unlocked')} error={null} />;
  
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
          <input type="email" required placeholder="Enter your email" value={email} onChange={e => setEmail(e.target.value)} disabled={isAuthLoading} className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 outline-none focus:bg-white/20 text-center" />
          <button type="submit" disabled={isAuthLoading || !email} className="w-full bg-white text-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50">{isAuthLoading ? "Sending..." : "Send Code"}</button>
          <button type="button" onClick={() => setOnboardingStep('welcome')} className="text-indigo-200 text-xs font-bold uppercase tracking-widest py-2">Back</button>
        </form>
      )}
      {onboardingStep === 'otp' && (
        <form onSubmit={handleVerifyCode} className="w-full max-w-xs space-y-4">
          <p className="text-xs text-indigo-100 mb-2">Verification code sent to<br/><span className="font-bold">{email}</span></p>
          <input type="text" required inputMode="numeric" placeholder="6-digit code" value={otpCode} onChange={e => setOtpCode(e.target.value)} disabled={isAuthLoading} maxLength={6} className="w-full p-4 rounded-xl bg-white/10 text-white border border-white/20 outline-none focus:bg-white/20 text-center text-2xl tracking-[0.5em] font-black" />
          <button type="submit" disabled={isAuthLoading || otpCode.length < 6} className="w-full bg-white text-indigo-600 py-4 rounded-xl font-black uppercase tracking-widest text-sm shadow-xl active:scale-95 transition-all disabled:opacity-50">{isAuthLoading ? "Verifying..." : "Verify & Continue"}</button>
          <button type="button" onClick={handleSendCode} disabled={isAuthLoading} className="text-indigo-200 text-[10px] font-black uppercase tracking-widest">Resend Code</button>
        </form>
      )}
    </div>
  );

  return (
    <>
      {showExerciseManager ? (
        <ExerciseManager activeIds={activeExerciseIds} onToggle={toggleExercise} onUpdate={handleUpdateActiveExercises} onClose={() => setShowExerciseManager(false)} isPremium={isPremium} />
      ) : viewingHistory ? (
        <HistoryView unitSystem={unitSystem} viewingHistory={viewingHistory} onClose={() => setViewingHistory(null)} totalsTimeFrame="weekly" historyLogs={historyLogs} onDeleteLog={setLogToDelete} />
      ) : (
        <Layout activeTab={activeTab} setActiveTab={setActiveTab} syncStatus={syncStatus} onSyncClick={() => syncWithCloud()}>
          {activeTab === 'dashboard' && <DashboardView unitSystem={unitSystem} logs={logs} activeExercises={activeExercises} maxStats={maxStats} setViewingHistory={setViewingHistory} />}
          {activeTab === 'add' && <AddLogView unitSystem={unitSystem} activeExercises={activeExercises} newEntry={newEntry} setNewEntry={setNewEntry} entryDate={entryDate} handleDateChange={e => setEntryDate(new Date(e.target.value))} handleAddLog={handleAddLog} />}
          {activeTab === 'settings' && <SettingsView unitSystem={unitSystem} onUnitSystemChange={setUnitSystem} user={user} isPremium={isPremium} syncStatus={syncStatus} onSyncManual={() => syncWithCloud()} onImportClick={() => fileInputRef.current?.click()} onExportCSV={handleExportCSV} onClearDataTrigger={() => setShowClearDataConfirm(true)} onDeleteAccountTrigger={() => setShowDeleteAccountConfirm(true)} hasBiometrics={hasBiometrics} onSecurityToggle={handleSecurityToggle} onChangePin={() => setAppState('creatingPin')} onPrivacyClick={() => setShowPrivacyDialog(true)} onManageExercises={() => setShowExerciseManager(true)} onAuthAction={() => { if (user) { if (logoutConfirm) handleLogout(); else setLogoutConfirm(true); } else { setAppState('onboarding'); setOnboardingStep('email'); } }} isLoggingOut={isLoggingOut} logoutConfirm={logoutConfirm} appVersion={APP_VERSION} hasLocalData={logs.length > 0} onGenerateDemoData={handleGenerateDemoData} />}
        </Layout>
      )}
      <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" />
      <AppDialogs isCloudEnabled={!!user} syncError={syncError} showSyncErrorDialog={showSyncErrorDialog} onSyncErrorClose={() => setShowSyncErrorDialog(false)} onSyncRetry={() => syncWithCloud()} showCloudWipeDialog={showCloudWipeDialog} onCloudKeepLocal={() => { setShowCloudWipeDialog(false); syncWithCloud(true); showToast("Uploading local data..."); }} onCloudOverwriteLocal={() => { setLogs([]); setShowCloudWipeDialog(false); }} showClearDataConfirm={showClearDataConfirm} onClearDataCancel={() => setShowClearDataConfirm(false)} 
      onClearDataConfirm={async () => { 
        if (user && supabase && navigator.onLine) { 
          try { 
            // CONSTRAINT: Only delete workouts. Do not touch profile or auth user.
            await supabase.from('workouts').delete().eq('owner_id', user.id); 
          } catch { 
            showToast("Error clearing cloud"); 
            setShowClearDataConfirm(false); 
            return; 
          } 
        } 
        setLogs([]); 
        setShowClearDataConfirm(false); 
        showToast("All data deleted."); 
      }} 
      logToDelete={logToDelete} 
      onDeleteLogCancel={() => setLogToDelete(null)} 
      onDeleteLogConfirm={async () => { 
        // Added cloud delete sync for single log removal
        if (user && supabase && navigator.onLine && logToDelete) {
           await supabase.from('workouts').delete().eq('id', logToDelete);
        }
        setLogs(prev => prev.filter(l => l.id !== logToDelete)); 
        setLogToDelete(null); 
      }} 
      showDeleteAccountConfirm={showDeleteAccountConfirm} onDeleteAccountCancel={() => setShowDeleteAccountConfirm(false)} onDeleteAccountConfirm={handleDeleteAccount} showPrivacyDialog={showPrivacyDialog} onPrivacyClose={() => setShowPrivacyDialog(false)} />
      {toastMessage && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl font-bold toast-animate text-white bg-slate-900 border border-slate-700/50 backdrop-blur-md">{toastMessage}</div>}
    </>
  );
};

export default App;
