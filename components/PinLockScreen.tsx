
import React, { useState, useEffect, useCallback } from 'react';

interface PinLockScreenProps {
  isCreating: boolean;
  onPinCreate?: (pin: string) => void;
  onPinEnter?: (pin: string) => void;
  onReset: () => void;
  error: string | null;
  attemptsLeft?: number;
  showBiometrics?: boolean;
  onBiometricAuth?: () => void;
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({ 
  isCreating, 
  onPinCreate, 
  onPinEnter, 
  onReset, 
  error, 
  attemptsLeft,
  showBiometrics,
  onBiometricAuth
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  // CONFIGURATION: PIN LENGTH
  const PIN_LENGTH = 4;

  useEffect(() => {
    if (isCreating) {
      setTitle(isConfirming ? "Confirm PIN" : "Create a PIN");
      setSubtitle(isConfirming ? "Enter the same PIN again to confirm." : `Secure your session with a ${PIN_LENGTH}-digit PIN.`);
    } else {
      setTitle("Enter PIN");
      setSubtitle("Unlock your session.");
    }
  }, [isCreating, isConfirming]);
  
  const handleKeyPress = useCallback((key: string) => {
    if (isConfirming) {
      if (confirmPin.length < PIN_LENGTH) setConfirmPin(p => p + key);
    } else {
      if (pin.length < PIN_LENGTH) setPin(p => p + key);
    }
  }, [pin, confirmPin, isConfirming]);
  
  const handleDelete = useCallback(() => {
    if (isConfirming) setConfirmPin(p => p.slice(0, -1));
    else setPin(p => p.slice(0, -1));
  }, [isConfirming]);

  useEffect(() => {
    const processPin = async () => {
      if (!isCreating && pin.length === PIN_LENGTH) {
        if (onPinEnter) onPinEnter(pin);
        // Clear pin after attempt for security
        setTimeout(() => setPin(''), 200);
      }
      if (isCreating && !isConfirming && pin.length === PIN_LENGTH) {
        setIsConfirming(true);
      }
      if (isCreating && isConfirming && confirmPin.length === PIN_LENGTH) {
        if (pin === confirmPin) {
          if (onPinCreate) onPinCreate(pin);
        } else {
          alert("PINs don't match. Please try again.");
          setPin('');
          setConfirmPin('');
          setIsConfirming(false);
        }
      }
    };
    processPin();
  }, [pin, confirmPin, isCreating, isConfirming, onPinEnter, onPinCreate]);

  // Attempt to trigger biometrics automatically on mount if enabled
  useEffect(() => {
    if (showBiometrics && onBiometricAuth && !isCreating) {
       // Small delay to allow UI to render smoothly before system prompt
       const timer = setTimeout(() => {
         onBiometricAuth();
       }, 500);
       return () => clearTimeout(timer);
    }
  }, []); // Run once on mount

  const PinDots = ({ length }: { length: number }) => (
    <div className="flex gap-4">
      {Array.from({ length: PIN_LENGTH }).map((_, i) => (
        <div key={i} className={`w-4 h-4 rounded-full transition-all ${i < length ? 'bg-white' : 'bg-white/20'}`} />
      ))}
    </div>
  );

  const KeypadButton = ({ value }: { value: string }) => (
    <button onClick={() => handleKeyPress(value)} className="text-3xl font-bold h-20 w-20 rounded-full flex items-center justify-center bg-white/10 active:bg-white/30 transition-colors">
      {value}
    </button>
  );

  return (
    <div className="h-[100dvh] bg-indigo-600 flex flex-col items-center justify-between p-8 text-white text-center">
      <div className="mt-8 space-y-4">
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="text-indigo-100/80 text-sm font-medium">{subtitle}</p>
      </div>

      <div className="space-y-6">
        <PinDots length={isConfirming ? confirmPin.length : pin.length} />
        {error && <p className="text-red-300 font-bold animate-shake">{error}</p>}
        {attemptsLeft !== undefined && attemptsLeft < 5 &&
          <p className="text-amber-300 font-bold text-sm">
            {attemptsLeft > 0 ? `${attemptsLeft} attempts remaining.` : 'PIN entry locked.'}
          </p>
        }
      </div>

      <div className="flex flex-col gap-6 items-center w-full max-w-xs">
        <div className="grid grid-cols-3 gap-6">
          <KeypadButton value="1" />
          <KeypadButton value="2" />
          <KeypadButton value="3" />
          <KeypadButton value="4" />
          <KeypadButton value="5" />
          <KeypadButton value="6" />
          <KeypadButton value="7" />
          <KeypadButton value="8" />
          <KeypadButton value="9" />
          <div className="h-20 w-20 flex items-center justify-center">
            {attemptsLeft === 0 ? (
              <button onClick={onReset} className="text-xs font-bold uppercase tracking-wider bg-white/20 px-4 py-2 rounded-lg">Reset</button>
            ) : (
              <button onClick={onReset} className="text-xs font-bold uppercase tracking-wider text-white/50">Forgot?</button>
            )}
          </div>
          <KeypadButton value="0" />
          <button onClick={handleDelete} className="h-20 w-20 flex items-center justify-center text-white/80">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path><line x1="18" y1="9" x2="12" y2="15"></line><line x1="12" y1="9" x2="18" y2="15"></line></svg>
          </button>
        </div>
        
        {showBiometrics && onBiometricAuth && (
           <button onClick={onBiometricAuth} className="flex items-center gap-2 text-white/80 hover:text-white px-4 py-2 rounded-xl active:bg-white/10 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 6" /><path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" /><path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" /><path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" /><path d="M8.65 22c.21-.66.45-1.32.57-2" /><path d="M14 13.12c0 2.38 0 6.38-1 8.88" /><path d="M2 16h.01" /><path d="M21.8 16c.2-2 .131-5.354 0-6" /><path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" /></svg>
              <span className="text-sm font-bold uppercase tracking-wide">Use Face ID</span>
           </button>
        )}
      </div>
    </div>
  );
};

export default PinLockScreen;
