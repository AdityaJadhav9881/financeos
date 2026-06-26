import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppLockStore } from '../stores/appLockStore';
import GradientOrbs from './GradientOrbs';
import { hapticLight, hapticError } from '../utils/haptics';
import { glassPanel, springTransition, fastTapTransition } from '../utils/styles';

function PinDots({ length = 4, filled = 0, hasError = false }) {
  return (
    <div className="flex items-center justify-center gap-3">
      {Array.from({ length }, (_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: i < filled ? 1.15 : 1,
            backgroundColor: hasError ? '#ef4444' : i < filled ? '#22d3ee' : 'rgba(255,255,255,0.08)',
            borderColor: hasError ? '#ef4444' : i < filled ? '#22d3ee' : 'rgba(255,255,255,0.1)',
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="h-4 w-4 rounded-full border-2"
        />
      ))}
    </div>
  );
}

function NumericKeypad({ onDigit, onDelete, disabled = false }) {
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'del'],
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {keys.flat().map((key, i) => {
        if (key === '') return <div key={i} />;
        return (
          <motion.button
            key={key}
            whileHover={disabled ? {} : { scale: 1.08, backgroundColor: 'rgba(255,255,255,0.08)' }}
            whileTap={disabled ? {} : { scale: 0.92 }}
            transition={fastTapTransition}
            disabled={disabled}
            onClick={() => key === 'del' ? onDelete() : onDigit(key)}
            className={`flex h-16 w-full items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md text-2xl font-semibold text-white transition-colors hover:border-white/20 disabled:opacity-40 ${key === 'del' ? 'text-sm text-zinc-400' : ''}`}
          >
            {key === 'del' ? '⌫' : key}
          </motion.button>
        );
      })}
    </div>
  );
}

function SetupView({ onComplete }) {
  const [step, setStep] = useState('create');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const setupPin = useAppLockStore((s) => s.setupPin);
  const stepTimer = useRef(null);

  useEffect(() => {
    return () => { if (stepTimer.current) clearTimeout(stepTimer.current); };
  }, []);

  async function handleDigit(digit) {
    if (step === 'create') {
      if (pin.length < 4) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 4) {
          if (stepTimer.current) clearTimeout(stepTimer.current);
          stepTimer.current = setTimeout(() => setStep('confirm'), 200);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === pin) {
            try {
              await setupPin(pin);
              onComplete();
            } catch {
              setError('Failed to save PIN. Please try again.');
            }
          } else {
            setError('PINs do not match. Try again.');
            setPin('');
            setConfirmPin('');
            setStep('create');
          }
        }
      }
    }
  }

  function handleDelete() {
    if (step === 'create') {
      setPin((p) => p.slice(0, -1));
    } else {
      setConfirmPin((p) => p.slice(0, -1));
    }
  }

  const filled = step === 'create' ? pin.length : confirmPin.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={springTransition}
      className="w-full max-w-sm"
    >
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-cyan-300">Finance OS</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          {step === 'create' ? 'Create PIN' : 'Confirm PIN'}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {step === 'create'
            ? 'Choose a 4-digit PIN to secure your app.'
            : 'Re-enter your PIN to confirm.'}
        </p>
      </div>

      <div className="mb-6">
        <PinDots filled={filled} hasError={!!error} />
      </div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-sm font-medium text-red-300"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <NumericKeypad onDigit={handleDigit} onDelete={handleDelete} />
    </motion.div>
  );
}

function UnlockView({ onUnlocked }) {
  const [pin, setPin] = useState('');
  const verifyPin = useAppLockStore((s) => s.verifyPin);
  const statusMessage = useAppLockStore((s) => s.statusMessage);
  const hasError = useAppLockStore((s) => s.hasError);
  const setStatusMessage = useAppLockStore((s) => s.setStatusMessage);
  const resetTimer = useRef(null);

  useEffect(() => {
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, []);

  function handleDigit(digit) {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      if (hasError) setStatusMessage('');
      if (next.length === 4) {
        verifyPin(next).then((success) => {
          if (success) {
            hapticLight();
            onUnlocked();
          } else {
            hapticError();
            if (resetTimer.current) clearTimeout(resetTimer.current);
            resetTimer.current = setTimeout(() => setPin(''), 600);
          }
        });
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    if (hasError) setStatusMessage('');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={springTransition}
      className="w-full max-w-sm"
    >
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold text-cyan-300">Finance OS</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Welcome back</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Enter your PIN to continue.
        </p>
      </div>

      <div className="mb-6">
        <PinDots filled={pin.length} hasError={hasError} />
      </div>

      <AnimatePresence mode="wait">
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 rounded-2xl border px-4 py-3 text-center text-sm font-medium ${
              hasError
                ? 'border-red-500/20 bg-red-500/10 text-red-300'
                : 'border-white/10 bg-[#0a0a0a]/60 text-zinc-300'
            }`}
          >
            {statusMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <NumericKeypad onDigit={handleDigit} onDelete={handleDelete} />
    </motion.div>
  );
}

function LoadingView() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-5 py-10">
      <GradientOrbs />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-sm font-semibold text-cyan-300"
      >
        Loading...
      </motion.div>
    </main>
  );
}

export default function AppLock({ onUnlocked }) {
  const isReady = useAppLockStore((s) => s.isReady);
  const isSetupComplete = useAppLockStore((s) => s.isSetupComplete);
  const isUnlocked = useAppLockStore((s) => s.isUnlocked);
  const initialize = useAppLockStore((s) => s.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!isReady) return <LoadingView />;
  if (isUnlocked) return null;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0a0a0a] px-5 py-10">
      <GradientOrbs />
      <AnimatePresence mode="wait">
        {!isSetupComplete ? (
          <SetupView key="setup" onComplete={onUnlocked} />
        ) : (
          <UnlockView key="unlock" onUnlocked={onUnlocked} />
        )}
      </AnimatePresence>
    </main>
  );
}
