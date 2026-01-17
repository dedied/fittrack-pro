
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

// Helper to format a Date object into 'YYYY-MM-DDTHH:mm' for the datetime-local input
const toDateTimeLocal = (date: Date) => {
    const ten = (i: number) => (i < 10 ? '0' : '') + i;
    const YYYY = date.getFullYear();
    const MM = ten(date.getMonth() + 1);
    const DD = ten(date.getDate());
    const HH = ten(date.getHours());
    const mm = ten(date.getMinutes());
    return `${YYYY}-${MM}-${DD}T${HH}:${mm}`;
};

// Helper to format the display date for the button
const formatEntryDate = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeString = date.toLocaleTimeString([], timeFormat);

    if (isToday) return `Today, ${timeString}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeString}`;
    
    const dateFormat: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    return `${date.toLocaleDateString([], dateFormat)}, ${timeString}`;
};


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('loading');
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  
  // Initialize from local storage or default to 'weekly'
  const [totalsTimeFrame, setTotalsTimeFrame] = useState<TimeFrame>(() => {
    return (localStorage.getItem('fit_totals_timeframe') as TimeFrame) || 'weekly';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showClearDataConfirm, setShowClearDataConfirm] = useState(false);
  const [showDeleteAccountConfirm, setShowDeleteAccountConfirm] = useState(false);
  
  // Sync Error Handling
  const [syncError, setSyncError] = useState<string | null>(null);
  const [showSyncErrorDialog, setShowSyncErrorDialog] = useState(false);

  // History Drill Down State
  const [viewingHistory, setViewingHistory] = useState<ExerciseType | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pinError, setPinError] = useState<string | null>(null);
  const [pinAttempts, setPinAttempts] = useState(MAX_PIN_ATTEMPTS);
  const [hasBiometrics, setHasBiometrics] = useState(false);
  
  // Auth State
  const [emailInput, setEmailInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<'welcome' | 'email' | 'otp'>('welcome');
  const [user, setUser] = useState<any>(null);
  const [resendTimer, setResendTimer] = useState(0);
  
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('unconfigured');
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const [logs, setLogs] = useState<WorkoutLog[]>(() => {
    try {
      const saved = localStorage.getItem('fit_logs');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Migration: Convert old user_id to undefined (to be claimed by new owner_id on sync) if strictly local
      return parsed.map((l: any) => ({
        ...l,
        owner_id: l.owner_id || undefined, 
        user_id: undefined // Remove legacy field
      }));
    } catch { return []; }
  });
  
  // Ref to keep track of logs for async operations without dependencies
  const logsRef = useRef(logs);
  useEffect(() => { logsRef.current = logs; }, [logs]);

  const [newEntry, setNewEntry] = useState({ type: 'pushups' as ExerciseType, reps: '', weight: '' });
  const [entryDate, setEntryDate] = useState(new Date());


  // Save totalsTimeFrame preference whenever it changes
  useEffect(() => {
    localStorage.setItem('fit_totals_timeframe', totalsTimeFrame);
  }, [totalsTimeFrame]);

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
          // No PIN set, check for session
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            setUser(session.user);
            setAppState('unlocked');
          } else {
            // Check if user previously skipped auth (Offline Mode)
            if (localStorage.getItem('fit_skip_auth') === 'true') {
              setAppState('unlocked');
            } else {
              setAppState('onboarding');
              setOnboardingStep('welcome');
            }
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

  // Network Status Listeners
  useEffect(() => {
    const handleOnline = () => {
       if (appState === 'unlocked' && user) syncWithCloud();
    };
    const handleOffline = () => {
       setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [appState, user]);

  // Sync Logic
  useEffect(() => {
    if (appState === 'unlocked' && user && supabase) {
      syncWithCloud();
    }
  }, [appState, user, supabase]);

  const syncWithCloud = async () => {
    if (!supabase || !user) return;
    
    if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
    }

    setSyncStatus('syncing');
    setSyncError(null);
    try {
      // 1. Fetch Cloud Data (Source of Truth for existing IDs)
      const { data: cloudLogs, error: fetchError } = await supabase.from('workouts').select('*');
      if (fetchError) throw fetchError;
      
      const cloudMap = new Map((cloudLogs || []).map(l => [l.id, l]));
      const currentLogs = logsRef.current;

      // 2. Identify Local Data to Upload
      //    - Items that are NOT in the cloud map (newly created offline)
      //    - Items that don't have an owner_id yet (created as guest)
      const toUpload = currentLogs
        .filter(ll => !cloudMap.has(ll.id) || !ll.owner_id)
        .map(ll => ({ ...ll, owner_id: user.id }));

      // 3. Perform Upload
      if (toUpload.length > 0) {
        const { error: upsertError } = await supabase.from('workouts').upsert(toUpload);
        if (upsertError) throw upsertError;
      }

      // 4. Merge & Update Local State
      setLogs(prevLogs => {
        const mergedMap = new Map<string, WorkoutLog>();
        
        // Start with Cloud Data (Source of Truth)
        cloudLogs?.forEach(cl => mergedMap.set(cl.id, cl));

        // Add Local logs that aren't in cloud map yet
        // (This covers items we just uploaded but aren't in the stale cloudLogs array, 
        //  and any new items added by the user during this sync process)
        prevLogs.forEach(ll => {
          if (!mergedMap.has(ll.id)) {
            mergedMap.set(ll.id, { ...ll, owner_id: user.id });
          }
        });

        const finalLogs = Array.from(mergedMap.values())
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          
        return finalLogs;
      });

      setSyncStatus('synced');
    } catch (err: any) {
      console.error("Sync error:", err);
      setSyncStatus('error');
      setSyncError(err.message || "An unknown error occurred during sync.");
      setToastMessage("⚠️ Sync failed");
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleSyncClick = () => {
    if (syncStatus === 'error') {
      setShowSyncErrorDialog(true);
    } else if (syncStatus === 'synced') {
      setToastMessage("All data is synced");
      setTimeout(() => setToastMessage(null), 2000);
    } else if (syncStatus === 'offline') {
      alert("You are currently offline. Sync will resume automatically when connection is restored.");
      // Attempt to sync anyway in case browser status is stale
      syncWithCloud();
    }
  };

  const handleRetrySync = () => {
    setShowSyncErrorDialog(false);
    syncWithCloud();
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
         return;
      }

      // Standard Login
      const { error } = await supabase.auth.setSession(sessionData as any);
      if (error) {
        setPinError("Invalid session. Please log in again.");
        await handleResetPin();
      } else {
        setUser((sessionData as any).user);
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
    setOnboardingStep('email');
    if (supabase) await supabase.auth.signOut();
  };
  
  // --- Existing Auth Handlers (Modified) ---
  
  const handleSkipAuth = () => {
    localStorage.setItem('fit_skip_auth', 'true');
    setAppState('unlocked');
  };

  const handleConnectCloud = () => {
    setOnboardingStep('email');
    setAppState('onboarding');
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); if (!supabase || isVerifying || resendTimer > 0) return;
    const cleanEmail = emailInput.trim().toLowerCase();
    setIsVerifying(true);
    try {
      setOtpInput('');
      const { error } = await supabase.auth.signInWithOtp({ email: cleanEmail, options: { shouldCreateUser: true }});
      if (error) throw error;
      setResendTimer(60); 
      setOnboardingStep('otp');
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
      if (session) {
        setUser(session.user);
        localStorage.removeItem('fit_skip_auth'); // Clear skip flag if user logs in
        setAppState('unlocked');
      } else {
        throw lastError || new Error("Invalid or expired code.");
      }
    } catch (err: any) { alert("Verification Failed:\n" + err.message); } finally { setIsVerifying(false); }
  };

  const handleLogout = async () => {
    if (window.confirm("Log out?")) {
      await secureStore.clear();
      if (supabase) await supabase.auth.signOut();
      setUser(null); setSyncStatus('unconfigured');
      setOnboardingStep('email'); setEmailInput(''); setOtpInput('');
      setHasBiometrics(false);
      setAppState('onboarding');
      // Note: we don't clear logs here to preserve local data, but sync will stop
    }
  };

  const handleConfirmClearData = async () => {
    setShowClearDataConfirm(false);
    
    let cloudSuccess = true;
    if (user && supabase) {
      const { error } = await supabase.from('workouts').delete().neq('id', '_');
      if (error) {
        console.error("Cloud delete failed:", error);
        alert(`Failed to delete cloud data: ${error.message}`);
        cloudSuccess = false;
      }
    }

    setLogs([]);
    if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
    
    setToastMessage(cloudSuccess ? "All data cleared" : "Local cleared (Cloud failed)");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmDeleteAccount = async () => {
    setShowDeleteAccountConfirm(false);
    
    if (user && supabase) {
        // 1. Delete all user data (RLS will allow this for own data)
        await supabase.from('workouts').delete().neq('id', '_');
        
        // 2. Attempt to delete the user record via RPC
        // Note: This requires the delete_user function to be defined in Supabase
        const { error } = await supabase.rpc('delete_user');
        if (error) {
            console.warn("Account deletion RPC failed (likely not configured):", error);
        }
        
        await supabase.auth.signOut();
    }

    // 3. Clear local storage and secure store
    await secureStore.clear();
    setLogs([]);
    
    // 4. Reset App State
    setUser(null);
    setSyncStatus('unconfigured');
    setAppState('onboarding');
    setOnboardingStep('email');
    setEmailInput('');
    setOtpInput('');
    setHasBiometrics(false);

    setToastMessage("Account deleted");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      alert("No data to export!");
      return;
    }
    const headers = ["Date", "Type", "Reps", "Weight (kg)"];
    const rows = logs.map(log => [
      new Date(log.date).toISOString(),
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
    const file = e.target.files?.[0];
    if (!file) return;

    // Helper to parse a CSV line, handling a quoted first field (for dates from Excel).
    const parseCsvLine = (line: string): string[] => {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('"')) {
            // Find the closing quote for the first field
            const endIndex = trimmedLine.indexOf('",');
            if (endIndex !== -1) {
                const firstField = trimmedLine.substring(1, endIndex);
                const rest = trimmedLine.substring(endIndex + 2);
                return [firstField, ...rest.split(',')].map(s => s.trim());
            }
        }
        // Fallback for unquoted lines
        return trimmedLine.split(',').map(s => s.trim());
    };

    // Helper to parse various common date formats.
    const parseDateString = (dateStr: string): Date | null => {
        if (!dateStr) return null;

        // 1. Try standard ISO 8601 format (what the app exports) first.
        let date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
            return date;
        }

        // 2. Try "DD/MM/YYYY, HH:MM:SS" format (common in European locales after Excel).
        const matchDateTime = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (matchDateTime) {
            const [, day, month, year, hour, minute, second] = matchDateTime.map(Number);
            date = new Date(year, month - 1, day, hour, minute, second); // JS month is 0-indexed
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        
        // 3. Try "DD/MM/YYYY" format as a fallback.
        const matchDate = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (matchDate) {
            const [, day, month, year] = matchDate.map(Number);
            date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
                return date;
            }
        }
        
        console.warn("Could not parse date format:", dateStr);
        return null;
    };


    const reader = new FileReader();

    reader.onerror = () => {
      setToastMessage('Error reading file.');
      setTimeout(() => setToastMessage(null), 3000);
    };

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (!text) {
          throw new Error("File is empty.");
        }

        const newLogs: WorkoutLog[] = [];
        const validTypes = new Set(EXERCISES.map(ex => ex.id));
        const lines = text.split('\n');
        
        lines.forEach((line, index) => {
          if (!line.trim() || (index === 0 && line.toLowerCase().includes('date'))) {
            return;
          }
          
          const fields = parseCsvLine(line);
          
          if (fields.length < 3) {
             if (line.trim()) { // Don't warn for empty lines
                console.warn(`Skipping invalid line during import (not enough fields on line ${index + 1}):`, line);
             }
             return;
          }

          const [dateStr, typeStr, repsStr, weightStr] = fields;
          
          const date = parseDateString(dateStr);
          const type = typeStr as ExerciseType;
          const reps = parseInt(repsStr, 10);

          if (date && !isNaN(date.getTime()) && type && validTypes.has(type) && repsStr && !isNaN(reps) && reps > 0) {
            newLogs.push({
              id: generateId(),
              date: date.toISOString(),
              type: type,
              reps: reps,
              weight: (weightStr && !isNaN(parseFloat(weightStr))) ? parseFloat(weightStr) : undefined,
              owner_id: user?.id || undefined,
            });
          } else {
            console.warn(`Skipping invalid line during import (line ${index + 1}):`, line);
          }
        });

        if (newLogs.length > 0) {
          setLogs(prev => [...newLogs, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
          setToastMessage(`✓ Imported ${newLogs.length} logs!`);
        } else {
          setToastMessage('No valid logs found in file.');
        }

      } catch (err) {
        console.error("Import failed:", err);
        setToastMessage('Import failed. Check file format.');
      } finally {
        setTimeout(() => setToastMessage(null), 3000);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
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
    const log: WorkoutLog = { 
        id: generateId(), 
        date: entryDate.toISOString(), 
        type: newEntry.type, 
        reps: repsNum, 
        weight: parseFloat(newEntry.weight) || undefined, 
        owner_id: user?.id || undefined 
    };
    if ('vibrate' in navigator) navigator.vibrate(25); 
    setLogs(prev => [log, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); 
    setNewEntry({ type: newEntry.type, reps: '', weight: '' });
    setEntryDate(new Date()); // Reset date to now for the next entry
    setToastMessage("✓ Logged!");
    if (supabase && user) {
      setSyncStatus('syncing'); 
      const { error } = await supabase.from('workouts').insert([log]); 
      if (error) {
         setSyncStatus('error');
         setSyncError(error.message);
         setToastMessage("⚠️ Sync failed");
         setTimeout(() => setToastMessage(null), 3000);
      } else {
         setSyncStatus('synced');
         setSyncError(null);
      }
    }
    setTimeout(() => { if (toastMessage === "✓ Logged!") setToastMessage(null); setActiveTab('dashboard'); }, 1500);
  };
  
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setEntryDate(new Date(e.target.value));
    }
  };


  const maxStats = useMemo(() => EXERCISES.map(ex => {
    const exerciseLogs = logs.filter(log => log.type === ex.id);
    if (exerciseLogs.length === 0) return { ...ex, maxRep: 0, maxRepDate: null, maxWeight: 0, maxWeightDate: null };

    // Find Log with Max Reps (prefer most recent on tie)
    const maxRepLog = exerciseLogs.reduce((prev, current) => (prev.reps >= current.reps ? prev : current), exerciseLogs[0]);
    
    // Find Log with Max Weight (prefer most recent on tie)
    let maxWeightLog = null;
    if (ex.isWeighted) {
        maxWeightLog = exerciseLogs.reduce((prev, current) => ((prev.weight || 0) >= (current.weight || 0) ? prev : current), exerciseLogs[0]);
    }

    return { 
      ...ex, 
      maxRep: maxRepLog.reps, 
      maxRepDate: maxRepLog.date, 
      maxWeight: maxWeightLog ? (maxWeightLog.weight || 0) : 0,
      maxWeightDate: maxWeightLog ? maxWeightLog.date : null 
    };
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
      <div className="fixed inset-0 overflow-y-auto bg-indigo-600 z-50">
        <div className="min-h-[100dvh] w-full flex flex-col pt-24 px-6 pb-12 text-white">
          <div className="flex-1 flex flex-col items-center w-full max-w-md mx-auto">
            <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-8 backdrop-blur-md animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            
            <div className="text-center space-y-4 max-w-sm mb-8">
              <h1 className="text-3xl font-black">FitTrack Pro</h1>
              <p className="text-indigo-100/80 text-sm font-medium leading-relaxed">
                {onboardingStep === 'welcome' ? "Track your workouts anywhere." : "Enter your email to sync across devices."}
              </p>
            </div>
            
            <div className="w-full max-w-sm space-y-4">
              {onboardingStep === 'welcome' && (
                <div className="flex flex-col gap-4">
                  <button onClick={() => setOnboardingStep('email')} className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black shadow-xl">
                    Sign In / Sync
                  </button>
                  <button onClick={handleSkipAuth} className="w-full bg-indigo-500/50 text-indigo-100 py-5 rounded-2xl font-bold border-2 border-indigo-400/30 hover:bg-indigo-500/70">
                    Use Offline
                  </button>
                </div>
              )}
              
              {onboardingStep === 'email' && (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <input type="email" required value={emailInput} onChange={e => setEmailInput(e.target.value)} placeholder="Email Address" className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-5 text-white placeholder-white/40 font-bold outline-none focus:border-white/60 text-center" />
                  <button type="submit" disabled={resendTimer > 0} className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black shadow-xl disabled:opacity-50">{resendTimer > 0 ? `Wait ${resendTimer}s` : "Send Code"}</button>
                  <button type="button" onClick={() => setOnboardingStep('welcome')} className="w-full py-2 text-indigo-200 font-medium">Back</button>
                </form>
              )}
              
              {onboardingStep === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <input type="text" inputMode="numeric" required value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="000000" className="w-full bg-white/10 border-2 border-white/20 rounded-2xl p-5 text-white placeholder-white/40 font-bold outline-none focus:border-white/60 text-center tracking-widest text-4xl" />
                  <button type="submit" className="w-full bg-white text-indigo-600 py-5 rounded-2xl font-black shadow-xl">Verify</button>
                  <button type="button" onClick={() => setOnboardingStep('email')} className="w-full py-2 text-indigo-200 font-medium">Back</button>
                </form>
              )}
            </div>
          </div>
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
    <>
      {/* CSS hack to make the date input clickable everywhere on WebKit browsers */}
      <style>{`
        .date-picker-hack::-webkit-calendar-picker-indicator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          color: transparent;
          background: transparent;
          cursor: pointer;
        }
      `}</style>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} syncStatus={syncStatus} onSyncClick={handleSyncClick}>
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
              <div className="grid grid-cols-1 gap-3">
                {maxStats.map(ex => (
                  <div key={ex.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ex.color} bg-opacity-10`}>{ex.icon}</div>
                      <div>
                        <p className="font-bold text-slate-800">{ex.label}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-bold">{ex.targetMuscle}</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="text-right flex flex-col items-end">
                         <p className="text-xl font-black text-indigo-600 leading-none">{ex.maxRep}</p>
                         <p className="text-[8px] text-slate-400 uppercase font-bold mt-1">Reps</p>
                         {ex.maxRepDate && <p className="text-[9px] text-slate-400 font-medium mt-0.5">{new Date(ex.maxRepDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}, {new Date(ex.maxRepDate).toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit', hour12: false})}</p>}
                      </div>
                      {ex.isWeighted && (
                         <div className="text-right border-l pl-4 flex flex-col items-end">
                           <p className="text-xl font-black text-emerald-600 leading-none">{ex.maxWeight}kg</p>
                           <p className="text-[8px] text-slate-400 uppercase font-bold mt-1">Weight</p>
                           {ex.maxWeightDate && <p className="text-[9px] text-slate-400 font-medium mt-0.5">{new Date(ex.maxWeightDate).toLocaleDateString(undefined, {month:'short', day:'numeric'})}, {new Date(ex.maxWeightDate).toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit', hour12: false})}</p>}
                         </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        {activeTab === 'add' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="w-16"></div> {/* Spacer */}
              <h2 className="text-xl font-bold text-slate-800">Record Set</h2>
              <div className="relative">
                <button 
                  className="flex items-center gap-1.5 text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-1.5 rounded-lg active:bg-slate-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  <span>{formatEntryDate(entryDate)}</span>
                </button>
                <input
                  type="datetime-local"
                  onChange={handleDateChange}
                  value={toDateTimeLocal(entryDate)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 date-picker-hack"
                />
              </div>
            </div>

            <div className="space-y-2">{EXERCISES.map(ex => (<button key={ex.id} onClick={() => setNewEntry({ ...newEntry, type: ex.id })} className={`flex items-center gap-4 p-4 rounded-2xl border-2 w-full transition-all ${newEntry.type === ex.id ? 'border-indigo-600 bg-indigo-50' : 'border-slate-100 bg-white'}`}><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${ex.color} bg-opacity-10`}>{ex.icon}</div><div className="font-bold text-slate-800">{ex.label}</div></button>))}</div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Reps</label><input type="number" inputMode="numeric" value={newEntry.reps} onChange={e => setNewEntry({...newEntry, reps: e.target.value})} placeholder="0" className="w-full text-2xl font-bold text-center p-5 bg-white border border-slate-100 rounded-2xl focus:border-indigo-600 outline-none" /></div>
              <div><label className="text-[10px] font-black text-slate-500 uppercase ml-2">Weight (kg)</label><input type="number" inputMode="decimal" value={newEntry.weight} onChange={e => setNewEntry({...newEntry, weight: e.target.value})} placeholder="0" disabled={!EXERCISES.find(e => e.id === newEntry.type)?.isWeighted} className="w-full text-2xl font-bold text-center p-5 bg-white border border-slate-100 rounded-2xl focus:border-indigo-600 outline-none" /></div>
            </div>
            <button onClick={handleAddLog} disabled={!newEntry.reps || parseInt(newEntry.reps) <= 0 || !!toastMessage} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg shadow-lg">{toastMessage === '✓ Logged!' ? 'SAVED! ✨' : 'SAVE SET'}</button>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <header className="text-center font-bold text-2xl text-slate-800">Settings</header>
            
            {/* Profile Card */}
            {user ? (
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3"><div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-black text-lg">{user.email?.charAt(0).toUpperCase()}</div><div><p className="font-bold text-slate-800 truncate max-w-[150px]">{user.email}</p><p className="text-[10px] text-emerald-500 font-bold uppercase">Cloud Connected</p></div></div>
                <button onClick={handleLogout} className="text-[10px] font-black text-slate-400 uppercase border-2 border-slate-50 px-4 py-2 rounded-xl hover:text-red-500">Sign Out</button>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-6 border border-slate-100 flex items-center justify-between shadow-sm">
                 <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-black text-lg">G</div>
                   <div>
                     <p className="font-bold text-slate-800">Guest User</p>
                     <p className="text-[10px] text-slate-400 font-bold uppercase">Local Storage Only</p>
                   </div>
                 </div>
                 <button onClick={handleConnectCloud} className="text-[10px] font-black text-indigo-600 uppercase border-2 border-indigo-50 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100">Connect</button>
              </div>
            )}

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
              <button onClick={() => setShowClearDataConfirm(true)} className="w-full p-6 flex items-center gap-4 hover:bg-red-50 text-red-600 border-b border-slate-100"><div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">🗑️</div><div className="text-left flex-1 font-bold">Clear All Data</div></button>
              <button onClick={() => setShowDeleteAccountConfirm(true)} className="w-full p-6 flex items-center gap-4 hover:bg-red-50 text-red-600"><div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">💀</div><div className="text-left flex-1 font-bold">Delete Account</div></button>
            </div>
          </div>
        )}
      </Layout>
      
      {/* Sync Error Dialog */}
      {showSyncErrorDialog && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate" role="dialog" aria-modal="true">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center dialog-animate">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 className="text-xl font-black text-slate-800">Sync Error</h2>
            <p className="text-slate-500 mt-2 text-sm break-words">{syncError || "An unknown network error occurred."}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowSyncErrorDialog(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                Dismiss
              </button>
              <button onClick={handleRetrySync} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog - Clear Data */}
      {showClearDataConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate" role="dialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-description">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center dialog-animate">
            <h2 id="dialog-title" className="text-xl font-black text-slate-800">Are you sure?</h2>
            <p id="dialog-description" className="text-slate-500 mt-2 text-sm">This will permanently delete all your workout logs. This action cannot be undone.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowClearDataConfirm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmClearData} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog - Delete Account */}
      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate" role="dialog" aria-modal="true" aria-labelledby="del-dialog-title" aria-describedby="del-dialog-description">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center dialog-animate">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-red-600 text-2xl">💀</div>
            <h2 id="del-dialog-title" className="text-xl font-black text-slate-800">Delete Account?</h2>
            <p id="del-dialog-description" className="text-slate-500 mt-2 text-sm">This will permanently delete your account and all associated data. This action is irreversible.</p>
            <div className="mt-6 flex gap-3">
              <button onClick={() => setShowDeleteAccountConfirm(false)} className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleConfirmDeleteAccount} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-3 shadow-2xl toast-animate">{toastMessage}</div>}
    </>
  );
};

export default App;
