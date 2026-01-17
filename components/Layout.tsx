
import React, { useState, useRef, useEffect } from 'react';

export type TabType = 'dashboard' | 'add' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const REFRESH_THRESHOLD = 80;

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);
  const touchStartRef = useRef<number>(0);

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
      // Use a logarithmic-like resistance for the pull effect
      const resistance = 0.4;
      const dampedDistance = Math.min(distance * resistance, REFRESH_THRESHOLD + 20);
      setPullDistance(dampedDistance);
      
      // Prevent default scroll when pulling down at the top
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
    setIsRefreshing(true);
    setPullDistance(REFRESH_THRESHOLD);
    
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    // Give a small delay for the animation to feel good before reloading
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 overflow-hidden relative">
      {/* Pull-to-Refresh Indicator */}
      <div 
        className="absolute left-0 right-0 flex justify-center pointer-events-none z-20"
        style={{ 
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: Math.min(pullDistance / REFRESH_THRESHOLD, 1),
          transition: touchStartRef.current === 0 ? 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1), opacity 0.3s' : 'none'
        }}
      >
        <div className={`bg-white rounded-full p-2 shadow-lg border border-slate-100 flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className="text-indigo-600"
            style={{ transform: `rotate(${pullDistance * 4}deg)` }}
          >
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <polyline points="21 3 21 8 16 8" />
          </svg>
        </div>
      </div>

      {/* Fixed Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0 z-30 shadow-sm relative">
        <h1 className="text-xl font-bold text-slate-800 tracking-tight text-center">FitTrack Pro</h1>
      </header>
      
      {/* Scrollable Main Content Area */}
      <main 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-lg mx-auto relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ 
          transform: `translateY(${pullDistance * 0.5}px)`,
          transition: touchStartRef.current === 0 ? 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)' : 'none'
        }}
      >
        <div className="p-4 pb-12">
          {children}
        </div>
      </main>

      {/* Navigation Bar */}
      <nav className="flex-shrink-0 bg-white border-t border-slate-200 w-full z-40">
        <div className="max-w-lg mx-auto flex h-20 items-center px-4 relative">
          <div className="flex-1 flex justify-center">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-1 transition-colors w-full h-full justify-center ${activeTab === 'dashboard' ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
              <span className="text-[10px] font-bold uppercase tracking-tighter">Stats</span>
            </button>
          </div>

          <div className="flex-none px-6">
            <button 
              onClick={() => setActiveTab('add')}
              className={`bg-indigo-600 text-white p-5 rounded-full -mt-12 shadow-[0_8px_25px_rgba(79,70,229,0.4)] transform transition-all active:scale-90 border-4 border-slate-50 relative z-50 ${activeTab === 'add' ? 'ring-4 ring-indigo-200' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <div className="flex-1 flex justify-center">
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center gap-1 transition-colors w-full h-full justify-center ${activeTab === 'settings' ? 'text-indigo-600' : 'text-slate-400'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>
              <span className="text-[10px] font-bold uppercase tracking-tighter">Settings</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Layout;
