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
  onVersionClick?: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  user, isInstalled, handleInstallClick, syncStatus, onSyncManual, onImportClick,
  onExportCSV, onClearDataTrigger, onDeleteAccountTrigger, hasBiometrics,
  onSecurityToggle, onChangePin, onPrivacyClick, onAuthAction, isLoggingOut,
  logoutConfirm, appVersion, onVersionClick
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6">
      <header className="text-center font-black text-3xl text-slate-800">App Preferences</header>

      {/* PWA Section */}
      <section 
         onClick={!isInstalled ? handleInstallClick : undefined}
         className={`w-full bg-white rounded-[2.5rem] p-8 border border-slate-100 flex items-center gap-6 shadow-sm transition-all ${!isInstalled ? 'active:scale-[0.98] cursor-pointer hover:border-indigo-200' : 'cursor-default'}`}
      >
         <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${isInstalled ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
           {isInstalled ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
           ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
           )}
         </div>
         <div className="text-left flex-1">
           <p className="font-black text-xl text-slate-800 leading-tight">{isInstalled ? "Successfully Installed" : "Enable Native App"}</p>
           <p className="text-[11px] font-bold uppercase text-slate-400 tracking-widest mt-1">{isInstalled ? "Ready for offline training" : "Add to home screen for best experience"}</p>
         </div>
      </section>

      {/* Data Management Section */}
      <section>
         <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-6 mb-4">Cloud & Storage</h3>
         <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40">
            <div className="w-full p-8 flex items-center gap-5 border-b border-slate-100 bg-slate-50/30">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl ${user ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white text-slate-300 border border-slate-100'}`}>
                  {user ? user.email?.charAt(0).toUpperCase() : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  )}
              </div>
              <div className="text-left flex-1">
                  <p className="font-black text-lg text-slate-800 truncate">{user ? user.email : "Guest Session"}</p>
                  {user && <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">Connected</span>}
              </div>
              <button
                  onClick={onAuthAction}
                  disabled={isLoggingOut}
                  className={`text-[10px] font-black uppercase px-5 py-2.5 rounded-xl border-2 transition-all active:scale-90 ${user ? (logoutConfirm ? 'bg-red-50 text-red-600 border-red-100 animate-shake' : 'bg-white text-slate-400 border-slate-100') : 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'}`}
              >
                  {isLoggingOut ? "..." : (user ? (logoutConfirm ? "Confirm Log Out" : "Log Out") : "Sign In")}
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              <button onClick={onSyncManual} disabled={!user || syncStatus === 'syncing'} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors disabled:opacity-30">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl shadow-sm shadow-indigo-100/50">🔄</div>
                  <div className="text-left flex-1 font-bold text-slate-700">Manual Sync Now</div>
              </button>
              <button onClick={onImportClick} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">📥</div>
                  <div className="text-left flex-1 font-bold text-slate-700">Restore from CSV</div>
              </button>
              <button onClick={onExportCSV} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">📤</div>
                  <div className="text-left flex-1 font-bold text-slate-700">Export All Activity</div>
              </button>
              <button onClick={onClearDataTrigger} className="w-full p-6 flex items-center gap-4 hover:bg-red-50 transition-colors text-red-600">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">🗑️</div>
                  <div className="text-left flex-1 font-bold">Wipe Local Database</div>
              </button>
              <button onClick={onDeleteAccountTrigger} disabled={!user} className="w-full p-6 flex items-center gap-4 hover:bg-red-50 transition-colors text-red-600 disabled:opacity-30">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-xl">💀</div>
                  <div className="text-left flex-1 font-bold">Delete Cloud Account</div>
              </button>
            </div>
         </div>
      </section>

      {/* Privacy Section */}
      <section>
         <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest ml-6 mb-4">Privacy & Security</h3>
         <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40 divide-y divide-slate-50">
            <button onClick={onSecurityToggle} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${hasBiometrics ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              </div>
              <div className="text-left flex-1 font-bold text-slate-700">{hasBiometrics ? "Disable Security Lock" : "Enable PIN & Biometrics"}</div>
            </button>
            {hasBiometrics && (
              <button onClick={onChangePin} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors text-slate-700">
                 <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">🔐</div>
                 <div className="text-left flex-1 font-bold">Modify Access PIN</div>
              </button>
            )}
            <button onClick={onPrivacyClick} className="w-full p-6 flex items-center gap-4 hover:bg-slate-50 transition-colors text-slate-700">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl">🛡️</div>
                <div className="text-left flex-1 font-bold">View Privacy Policy</div>
            </button>
         </div>
      </section>
      
      <div className="text-center pb-12 pt-4">
         <button onClick={onVersionClick} className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] hover:text-indigo-400 transition-colors">FitTrack Build v{appVersion}</button>
      </div>
    </div>
  );
};

export default SettingsView;