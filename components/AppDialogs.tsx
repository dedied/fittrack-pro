import React from 'react';

interface AppDialogsProps {
  syncError: string | null;
  showSyncErrorDialog: boolean;
  onSyncErrorClose: () => void;
  onSyncRetry: () => void;
  showCloudWipeDialog: boolean;
  onCloudKeepLocal: () => void;
  onCloudOverwriteLocal: () => void;
  showClearDataConfirm: boolean;
  onClearDataCancel: () => void;
  onClearDataConfirm: () => void;
  logToDelete: string | null;
  onDeleteLogCancel: () => void;
  onDeleteLogConfirm: () => void;
  showDeleteAccountConfirm: boolean;
  onDeleteAccountCancel: () => void;
  onDeleteAccountConfirm: () => void;
  showPrivacyDialog: boolean;
  onPrivacyClose: () => void;
}

const AppDialogs: React.FC<AppDialogsProps> = ({
  syncError, showSyncErrorDialog, onSyncErrorClose, onSyncRetry,
  showCloudWipeDialog, onCloudKeepLocal, onCloudOverwriteLocal,
  showClearDataConfirm, onClearDataCancel, onClearDataConfirm,
  logToDelete, onDeleteLogCancel, onDeleteLogConfirm,
  showDeleteAccountConfirm, onDeleteAccountCancel, onDeleteAccountConfirm,
  showPrivacyDialog, onPrivacyClose
}) => {
  return (
    <>
      {showSyncErrorDialog && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center dialog-animate">
            <h2 className="text-xl font-black text-slate-800">Sync Error</h2>
            <p className="text-slate-500 mt-2 text-sm">{syncError}</p>
            <div className="mt-6 flex gap-3">
              <button onClick={onSyncErrorClose} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Dismiss</button>
              <button onClick={onSyncRetry} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold">Retry</button>
            </div>
          </div>
        </div>
      )}

      {showCloudWipeDialog && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center dialog-animate">
            <h2 className="text-xl font-black text-slate-800">Cloud is Empty</h2>
            <p className="text-slate-500 mt-4 text-sm leading-relaxed">Account cloud is empty but device has logs. Resolve conflict?</p>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={onCloudKeepLocal} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Upload Local</button>
              <button onClick={onCloudOverwriteLocal} className="w-full bg-slate-100 py-3 rounded-xl font-bold">Wipe Local</button>
            </div>
          </div>
        </div>
      )}

      {showClearDataConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center dialog-animate">
            <h2 className="text-xl font-black text-slate-800">Are you sure?</h2>
            <p className="text-slate-500 mt-2 text-sm">Delete all logs forever?</p>
            <div className="mt-6 flex gap-3">
              <button onClick={onClearDataCancel} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Cancel</button>
              <button onClick={onClearDataConfirm} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {logToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center dialog-animate">
            <h2 className="text-xl font-black text-slate-800">Remove Entry?</h2>
            <div className="mt-6 flex gap-3">
              <button onClick={onDeleteLogCancel} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">No</button>
              <button onClick={onDeleteLogConfirm} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Yes</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAccountConfirm && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center dialog-animate">
            <h2 className="text-xl font-black text-slate-800">Delete Account?</h2>
            <div className="mt-6 flex gap-3">
              <button onClick={onDeleteAccountCancel} className="flex-1 bg-slate-100 py-3 rounded-xl font-bold">Back</button>
              <button onClick={onDeleteAccountConfirm} className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold">Delete Forever</button>
            </div>
          </div>
        </div>
      )}

      {showPrivacyDialog && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm overlay-animate" onClick={onPrivacyClose}>
          <div className="bg-white rounded-[2rem] max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden dialog-animate shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex-shrink-0 bg-indigo-50/30">
              <h2 className="text-xl font-black text-slate-800">Privacy & Security Policy</h2>
              <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-1">Last Updated: October 2024</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-sm leading-relaxed text-slate-600">
              <section>
                <h3 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2">1. Data Ownership</h3>
                <p>Your fitness data belongs exclusively to you. We do not sell, rent, or trade your personal information. All workout logs are stored locally on your device by default.</p>
              </section>

              <section>
                <h3 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2">2. Cloud Synchronization</h3>
                <p>If you choose to Sign In, your logs are synchronized with our cloud provider. We store your <strong>email address</strong> solely for authentication purposes and your <strong>workout data</strong> for synchronization across your devices. Syncing is optional; you can remain a guest user indefinitely with data stored only on your current device.</p>
              </section>

              <section>
                <h3 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider mb-2">3. Your Control</h3>
                <p>You maintain full control over your data through the Settings menu:</p>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  <li><strong>Export:</strong> Download all your records at any time in CSV format.</li>
                  <li><strong>Clear Data:</strong> Permanently wipe all local records instantly.</li>
                  <li><strong>Account Deletion:</strong> If signed in, you can trigger a full account deletion which removes your email and all cloud records associated with it.</li>
                </ul>
              </section>

              <section className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-[11px] font-medium text-slate-500 italic">This app does not include third-party tracking pixels, analytics suites, or advertising networks. Your fitness journey is private.</p>
              </section>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
              <button onClick={onPrivacyClose} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-transform shadow-lg shadow-indigo-100">
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppDialogs;