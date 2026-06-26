import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppLockStore } from '../stores/appLockStore';
import GradientOrbs from './GradientOrbs';
import { fastTapTransition } from '../utils/styles';

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
            className={`flex h-14 w-full items-center justify-center rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md text-xl font-semibold text-white transition-colors hover:border-white/20 disabled:opacity-40 ${key === 'del' ? 'text-sm text-zinc-400' : ''}`}
          >
            {key === 'del' ? '⌫' : key}
          </motion.button>
        );
      })}
    </div>
  );
}

export default function PinGate({ isOpen, title = 'Authenticate', message = 'Enter your PIN to continue.', onVerified, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const checkPin = useAppLockStore((s) => s.checkPin);
  const onVerifiedRef = useRef(onVerified);
  onVerifiedRef.current = onVerified;
  const resetTimer = useRef(null);

  useEffect(() => {
    return () => { if (resetTimer.current) clearTimeout(resetTimer.current); };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      if (resetTimer.current) clearTimeout(resetTimer.current);
      setPin('');
      setError('');
    }
  }, [isOpen]);

  function handleDigit(digit) {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setError('');
      if (next.length === 4) {
        checkPin(next).then((success) => {
          if (success) {
            onVerifiedRef.current?.();
          } else {
            setError('Incorrect PIN.');
            if (resetTimer.current) clearTimeout(resetTimer.current);
            resetTimer.current = setTimeout(() => { setPin(''); setError(''); }, 600);
          }
        });
      }
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    setError('');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-md px-4"
        >
          <GradientOrbs />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative z-10 w-full max-w-sm"
          >
            <div className="mb-6 text-center">
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-zinc-400">{message}</p>
            </div>

            <div className="mb-5">
              <PinDots filled={pin.length} hasError={!!error} />
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

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onCancel}
              className="mt-3 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Cancel
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
