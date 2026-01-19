import React from 'react';

interface SettingsViewProps {
  user: any;
  isInstalled: boolean;
  handleInstallClick: () => void;
  syncStatus: string;
  onSyncManual: () => void;
  onImportClick: () => void;
  onExportCSV: () => void;
  onClearDataTrigger: () => void;
  onDeleteAccountTrigger: () => void;
  hasBiometrics: boolean;
  onSecurityToggle: () => void;
  onChangePin: () => void;
  onPrivacyClick: () => void;
  onAuthAction: () => void;
  isLoggingOut: boolean;
  logoutConfirm: boolean;
  appVersion: string;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  isInstalled,
  handleInstallClick,
  syncStatus,
  onSyncManual,
  onImportClick,
  onExportCSV,
  onClearDataTrigger,
  onDeleteAccountTrigger,
  hasBiometrics,
  onSecurityToggle,
  onChangePin,
  onPrivacyClick,
  onAuthAction,
  isLoggingOut,
  logoutConfirm,
  appVersion
}) => {
  return (
    <div className="space-y-6">
      <header className="text-center font-bold text-2xl text-slate-800">Settings</header>

      {/* Install App Button */}
      <div 
         onClick={!isInstalled ? handleInstallClick : undefined}
         className={`w-full bg-white rounded-[2rem] p-6 border border-slate-100 flex items-center gap-4 shadow-sm transition-transform ${!isInstalled ? 'active:scale-95 cursor-pointer text-indigo-600' : 'text-emerald-600 cursor-default'}`}
      >
         <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isInstalled ? 'bg-emerald-50' : 'bg-indigo-50'}`}>
           {isInstalled ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
           ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
           )}
         </div>
         <div className="text-left flex-1">
           <p className="font-bold text-lg text-slate-800">{isInstalled ? "App Installed" : "Install App"}</p>
           <p className="text-[10px] font-bold uppercase text-slate-400">{isInstalled ? "Ready to use" : "Add to Home Screen"}</p>
         </div>
      </div>

      {/* Data Management Section */}
      <div>
         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4 mb-3">Data Management</h3>
         <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <div className="w-full p-6 flex items-center gap-4 border-b border-slate-100 bg-white">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${user ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                  {user ? user.email?.charAt(0).toUpperCase() : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  )}
              </div>
              <div className="text-left flex-1">
                  <p className="font-bold text-slate-800 truncate">{user ? user.email : "Guest User"}</p>
                  {user && <span className="inline-block mt-1 bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide">Signed In</span>}
              </div>
              <button
                  onClick={onAuthAction}
                  disabled={isLoggingOut}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border-2 transition-all active:scale-95 ${user ? (logoutConfirm ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-50 text-slate-400 border-slate-100') : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}
              >
                  {isLoggingOut ? "..." : (user ? (logoutConfirm ? "Confirm?" : "Log Out") : "Sign In")}
              </button>
            </div>

            <button onClick={onSyncManual} disabled={!user || syncStatus === 'syncing'} className="w-full p-6 flex items-center gap-4 border-b border-slate-100 hover:bg-slate-50 disabled:opacity-50">
                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">🔄</div>
                <div className="text-left flex-1 font-bold">Manual Data Sync</div>
            </button>
            <button onClick={onImportClick} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b text-slate-800"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">📥</div><div className="text-left flex-1 font-bold">Import Data</div></button>
            <button onClick={onExportCSV} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b text-slate-800"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">📤</div><div className="text-left flex-1 font-bold">Export Data</div></button>
            <button onClick={onClearDataTrigger} className="w-full p-6 flex items-center gap-4 hover:bg-red-50 text-red-600 border-b border-slate-100"><div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">🗑️</div><div className="text-left flex-1 font-bold">Clear All Data</div></button>
            <button onClick={onDeleteAccountTrigger} disabled={!user} className="w-full p-6 flex items-center gap-4 hover:bg-red-50 text-red-600 disabled:opacity-30">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">💀</div>
                <div className="text-left flex-1 font-bold">Delete Account</div>
            </button>
         </div>
      </div>

      {/* Security Section */}
      <div>
         <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest ml-4 mb-3">Privacy & Security</h3>
         <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
            <button onClick={onSecurityToggle} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b text-slate-800">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${hasBiometrics ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <div className="text-left flex-1 font-bold">{hasBiometrics ? "Disable App Lock" : "Enable App Lock"}</div>
            </button>
            {hasBiometrics && (
              <button onClick={onChangePin} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 border-b text-slate-800">
                 <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">🔐</div>
                 <div className="text-left flex-1 font-bold">Change PIN</div>
              </button>
            )}
            <button onClick={onPrivacyClick} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 text-slate-800 transition-colors">
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">🛡️</div>
                <div className="text-left flex-1 font-bold">Privacy Policy</div>
            </button>
         </div>
      </div>
      
      <div className="text-center pb-8 pt-4">
         <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">v{appVersion}</div>
      </div>
    </div>
  );
};

export default SettingsView;