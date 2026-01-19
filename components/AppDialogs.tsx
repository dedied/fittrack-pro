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
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full dialog-animate" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-black text-slate-800 mb-2">Privacy & Security</h2>
            <div className="space-y-4 text-sm text-slate-600 mt-4">
               <p>Data is stored locally-first. Optional sync uses Supabase. Only logs and email are stored.</p>
            </div>
            <button onClick={onPrivacyClose} className="mt-6 w-full bg-slate-100 py-3 rounded-xl font-bold">Close</button>
          </div>
        </div>
      )}
    </>
  );
};

export default AppDialogs;