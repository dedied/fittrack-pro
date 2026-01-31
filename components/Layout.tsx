
import React, { useState, useRef, useEffect } from 'react';
import { showToast } from '../utils/toast';

export type TabType = 'dashboard' | 'add' | 'settings' | 'auth';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'unconfigured' | 'error' | 'premium_required';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  syncStatus?: SyncStatus;
  onSyncClick?: () => void;
  onUpgradeClick?: () => void;
}

const REFRESH_THRESHOLD = 80;

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, syncStatus = 'unconfigured', onSyncClick, onUpgradeClick }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<number>(0);
  
  const [viewportHeight, setViewportHeight] = useState('100dvh');

  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => setViewportHeight(`${window.visualViewport!.height}px`);
    window.visualViewport.addEventListener('resize', handleResize);
    window.visualViewport.addEventListener('scroll', handleResize);
    handleResize();
    return () => {
        window.visualViewport!.removeEventListener('resize', handleResize);
        window.visualViewport!.removeEventListener('scroll', handleResize);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0 && !isRefreshing) {
      touchStartRef.current = e.touches[0].clientY;
    } else {
      touchStartRef.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartRef.current === 0 || isRefreshing) return;
    const touchY = e.touches[0].clientY;
    const distance = touchY - touchStartRef.current;
    if (distance > 0) {
      const resistance = 0.4;
      const dampedDistance = Math.min(distance * resistance, REFRESH_THRESHOLD + 20);
      setPullDistance(dampedDistance);
      if (e.cancelable) e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= REFRESH_THRESHOLD) {
      triggerRefresh();
    } else {
      setPullDistance(0);
    }
    touchStartRef.current = 0;
  };

  const triggerRefresh = () => {
    if (!navigator.onLine) {
      setPullDistance(0);
      showToast("⚠️ Cannot refresh while offline");
      return;
    }
    setIsRefreshing(true);
    setPullDistance(REFRESH_THRESHOLD);
    if ('vibrate' in navigator) navigator.vibrate(50);
    setTimeout(() => { window.location.reload(); }, 600);
  };
  
  const handleSyncIconClick = () => {
    if (syncStatus === 'premium_required' && onUpgradeClick) {
        onUpgradeClick();
    } else if (onSyncClick) {
        onSyncClick();
    }
  };

  const renderSyncIcon = () => {
    switch (syncStatus) {
      case 'syncing': return <div className="w-2.5 h-2.5 bg-amber-400 rounded-full animate-pulse" title="Syncing..." />;
      case 'synced': return <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="All data synced" />;
      case 'error': return <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" title="Sync Error" />;
      case 'offline': return <div className="w-2.5 h-2.5 bg-slate-300 rounded-full" title="Offline" />;
      case 'premium_required': return <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" title="Upgrade to enable sync" />;
      case 'unconfigured': return <div className="w-2.5 h-2.5 bg-slate-200 rounded-full border border-slate-300" title="Not signed in" />;
      default: return null;
    }
  };

  const getSyncLabel = () => {
    switch (syncStatus) {
      case 'synced': return 'Synced';
      case 'syncing': return 'Syncing...';
      case 'offline': return 'Offline';
      case 'error': return 'Error';
      case 'premium_required': return 'Upgrade to Sync';
      case 'unconfigured': return 'Not signed in';
      default: return syncStatus;
    }
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg> },
    { id: 'add', label: 'Log Workout', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg> },
    { id: 'settings', label: 'Settings', icon: (props: any) => <svg {...props} xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg> }
  ];

  const DashboardIcon = navItems[0].icon;
  const AddIcon = navItems[1].icon;
  const SettingsIcon = navItems[2].icon;

  return (
    <div className="flex w-full bg-slate-50 overflow-hidden relative" style={{ height: viewportHeight }}>
      
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200 p-6 z-40">
        <div className="mb-10 flex items-center justify-between">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">FitTrack Pro</h1>
          <button onClick={handleSyncIconClick} className="p-2 transition-opacity hover:opacity-70">
            {renderSyncIcon()}
          </button>
        </div>
        
        <nav className="flex flex-col gap-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as TabType)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all duration-200 ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              <item.icon className={activeTab === item.id ? 'text-white' : 'text-slate-400'} />
              <span className="text-sm tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Cloud Sync</p>
          <button onClick={handleSyncIconClick} className="flex items-center justify-center gap-2 w-full">
            {renderSyncIcon()}
            <span className="text-xs font-bold text-slate-600">{getSyncLabel()}</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        
        <header className="md:hidden bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 z-30 shadow-sm flex items-center justify-between">
          <div className="w-8" />
          <h1 className="text-xl font-black text-slate-800 tracking-tight">FitTrack Pro</h1>
          <div className="w-8 flex justify-end items-center">
            <button onClick={handleSyncIconClick} className="p-2 -mr-2 active:opacity-50 transition-opacity">
              {renderSyncIcon()}
            </button>
          </div>
        </header>
        
        <div 
          className="absolute left-0 right-0 md:hidden flex justify-center pointer-events-none z-20"
          style={{ 
            transform: `translateY(${pullDistance - 40}px)`,
            opacity: Math.min(pullDistance / REFRESH_THRESHOLD, 1),
            transition: touchStartRef.current === 0 ? 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.3s' : 'none'
          }}
        >
          <div className={`bg-white rounded-full p-2 shadow-lg border border-slate-100 flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-600">
              <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" /><polyline points="21 3 21 8 16 8" />
            </svg>
          </div>
        </div>

        <main 
          ref={scrollRef}
          className="flex-1 overflow-y-auto custom-scrollbar w-full relative"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ 
            transform: `translateY(${pullDistance * 0.5}px)`,
            transition: touchStartRef.current === 0 ? 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)' : 'none'
          }}
        >
          <div className="p-4 md:p-10 lg:p-12 pb-32 md:pb-12 max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        <nav className="md:hidden flex-shrink-0 bg-white border-t border-slate-200 w-full z-40 pb-safe shadow-2xl">
          <div className="max-w-lg mx-auto flex h-20 items-center px-4 relative">
            <div className="flex-1 flex justify-center">
              <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center gap-1 transition-all w-full h-full justify-center ${activeTab === 'dashboard' ? 'text-indigo-600 scale-110' : 'text-slate-400 opacity-60'}`}>
                <DashboardIcon />
                <span className="text-[9px] font-black uppercase tracking-widest">Stats</span>
              </button>
            </div>

            <div className="flex-none px-6">
              <button onClick={() => setActiveTab('add')} className={`bg-indigo-600 text-white p-5 rounded-full -mt-12 shadow-[0_8px_25px_rgba(79,70,229,0.4)] transform transition-all active:scale-90 border-4 border-slate-50 relative z-50 ${activeTab === 'add' ? 'ring-4 ring-indigo-200' : ''}`}>
                <AddIcon width="24" height="24" strokeWidth="3" />
              </button>
            </div>

            <div className="flex-1 flex justify-center">
              <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-all w-full h-full justify-center ${activeTab === 'settings' ? 'text-indigo-600 scale-110' : 'text-slate-400 opacity-60'}`}>
                <SettingsIcon />
                <span className="text-[9px] font-black uppercase tracking-widest">Settings</span>
              </button>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
};

export default Layout;
