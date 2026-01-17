import React, { useState, useEffect, useCallback } from 'react';

interface PinLockScreenProps {
  isCreating: boolean;
  onPinCreate: (pin: string) => void;
  onPinEnter: (pin: string) => void;
  onReset: () => void;
  error: string | null;
  attemptsLeft?: number;
}

const PinLockScreen: React.FC<PinLockScreenProps> = ({ isCreating, onPinCreate, onPinEnter, onReset, error, attemptsLeft }) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');

  useEffect(() => {
    if (isCreating) {
      setTitle(isConfirming ? "Confirm PIN" : "Create a PIN");
      setSubtitle(isConfirming ? "Enter the same PIN again to confirm." : "Secure your session with a 6-digit PIN.");
    } else {
      setTitle("Enter PIN");
      setSubtitle("Unlock your session.");
    }
  }, [isCreating, isConfirming]);
  
  const handleKeyPress = useCallback((key: string) => {
    if (isConfirming) {
      if (confirmPin.length < 6) setConfirmPin(p => p + key);
    } else {
      if (pin.length < 6) setPin(p => p + key);
    }
  }, [pin, confirmPin, isConfirming]);
  
  const handleDelete = useCallback(() => {
    if (isConfirming) setConfirmPin(p => p.slice(0, -1));
    else setPin(p => p.slice(0, -1));
  }, [isConfirming]);

  useEffect(() => {
    const processPin = async () => {
      if (!isCreating && pin.length === 6) {
        onPinEnter(pin);
        // Clear pin after attempt for security
        setTimeout(() => setPin(''), 200);
      }
      if (isCreating && !isConfirming && pin.length === 6) {
        setIsConfirming(true);
      }
      if (isCreating && isConfirming && confirmPin.length === 6) {
        if (pin === confirmPin) {
          onPinCreate(pin);
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

  const PinDots = ({ length }: { length: number }) => (
    <div className="flex gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
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
      <div className="mt-16 space-y-4">
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
    </div>
  );
};

export default PinLockScreen;