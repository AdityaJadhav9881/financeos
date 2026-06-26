import { create } from 'zustand';
import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

const PIN_HASH_KEY = 'appLock_pinHash';
const ATTEMPTS_KEY = 'appLock_attempts';
const LOCKOUT_KEY = 'appLock_lockoutUntil';
const PIN_SALT = 'financeos_pin_salt_2024';

function hashPin(pin) {
  return CryptoJS.SHA256(pin + PIN_SALT).toString();
}

function withTimeout(promise, ms = 3000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function getStoredPinHash() {
  try {
    const { value } = await withTimeout(Preferences.get({ key: PIN_HASH_KEY }));
    if (value) return value;
  } catch {}
  try {
    const localValue = localStorage.getItem(PIN_HASH_KEY);
    if (localValue) {
      try { await withTimeout(Preferences.set({ key: PIN_HASH_KEY, value: localValue })); } catch {}
      return localValue;
    }
  } catch {}
  return null;
}

async function getAttempts() {
  try {
    const { value } = await withTimeout(Preferences.get({ key: ATTEMPTS_KEY }));
    return value ? parseInt(value, 10) : 0;
  } catch {}
  try { return parseInt(localStorage.getItem(ATTEMPTS_KEY) || '0', 10); } catch {}
  return 0;
}

async function setAttempts(count) {
  try { await withTimeout(Preferences.set({ key: ATTEMPTS_KEY, value: String(count) })); } catch {}
  try { localStorage.setItem(ATTEMPTS_KEY, String(count)); } catch {}
}

async function getLockoutUntil() {
  try {
    const { value } = await withTimeout(Preferences.get({ key: LOCKOUT_KEY }));
    return value ? parseInt(value, 10) : 0;
  } catch {}
  try { return parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10); } catch {}
  return 0;
}

async function setLockoutUntil(ts) {
  try { await withTimeout(Preferences.set({ key: LOCKOUT_KEY, value: String(ts) })); } catch {}
  try { localStorage.setItem(LOCKOUT_KEY, String(ts)); } catch {}
}

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30000;

export const useAppLockStore = create((set, get) => ({
  isReady: false,
  isSetupComplete: false,
  isUnlocked: false,
  statusMessage: '',
  hasError: false,
  attempts: 0,
  lockoutUntil: 0,
  _inactivityTimer: null,

  initialize: async () => {
    try {
      const pinHash = await getStoredPinHash();
      const attempts = await getAttempts();
      const lockoutUntil = await getLockoutUntil();
      set({
        isReady: true,
        isSetupComplete: !!pinHash,
        attempts,
        lockoutUntil,
      });
    } catch {
      set({ isReady: true, isSetupComplete: false });
    }
  },

  setupPin: async (pin) => {
    const hash = hashPin(pin);
    let saved = false;
    try {
      await withTimeout(Preferences.set({ key: PIN_HASH_KEY, value: hash }));
      saved = true;
    } catch {
      try {
        localStorage.setItem(PIN_HASH_KEY, hash);
        saved = true;
      } catch {}
    }
    if (!saved) throw new Error('Failed to save PIN');
    set({ isSetupComplete: true, statusMessage: '', hasError: false });
  },

  verifyPin: async (pin) => {
    const state = get();
    if (state.lockoutUntil > Date.now()) {
      const remaining = Math.ceil((state.lockoutUntil - Date.now()) / 1000);
      set({ statusMessage: `Locked. Try again in ${remaining}s.`, hasError: true });
      return false;
    }

    const stored = await getStoredPinHash();
    if (!stored) return false;

    if (hashPin(pin) === stored) {
      await setAttempts(0);
      await setLockoutUntil(0);
      set({ isUnlocked: true, attempts: 0, lockoutUntil: 0, statusMessage: '', hasError: false });
      get().startInactivityTimer();
      return true;
    }

    const newAttempts = state.attempts + 1;
    const lockoutUntil = newAttempts >= MAX_ATTEMPTS ? Date.now() + LOCKOUT_MS : 0;
    await setAttempts(newAttempts);
    if (lockoutUntil) await setLockoutUntil(lockoutUntil);

    const remainingAttempts = Math.max(MAX_ATTEMPTS - newAttempts, 0);
    const msg = newAttempts >= MAX_ATTEMPTS
      ? 'Too many attempts. Locked for 30 seconds.'
      : `Incorrect PIN. ${remainingAttempts} attempts remaining.`;
    set({ statusMessage: msg, hasError: true, attempts: newAttempts, lockoutUntil });
    return false;
  },

  checkPin: async (pin) => {
    const stored = await getStoredPinHash();
    if (!stored) return false;
    return hashPin(pin) === stored;
  },

  unlock: () => {
    set({ isUnlocked: true, statusMessage: '', hasError: false });
    get().startInactivityTimer();
  },

  lock: () => {
    const timer = get()._inactivityTimer;
    if (timer) clearTimeout(timer);
    set({ isUnlocked: false, statusMessage: '', hasError: false, _inactivityTimer: null });
  },

  startInactivityTimer: () => {
    const state = get();
    if (state._inactivityTimer) clearTimeout(state._inactivityTimer);
    const timer = setTimeout(() => {
      if (get().isUnlocked) get().lock();
    }, 5 * 60 * 1000);
    set({ _inactivityTimer: timer });
  },

  setStatusMessage: (msg, isError = false) => {
    set({ statusMessage: msg, hasError: isError });
  },

  resetLock: async () => {
    try {
      await withTimeout(Preferences.remove({ key: PIN_HASH_KEY }));
      await withTimeout(Preferences.remove({ key: ATTEMPTS_KEY }));
      await withTimeout(Preferences.remove({ key: LOCKOUT_KEY }));
    } catch {}
    try {
      localStorage.removeItem(PIN_HASH_KEY);
      localStorage.removeItem(ATTEMPTS_KEY);
      localStorage.removeItem(LOCKOUT_KEY);
    } catch {}
    set({
      isReady: false,
      isSetupComplete: false,
      isUnlocked: false,
      attempts: 0,
      lockoutUntil: 0,
      statusMessage: '',
      hasError: false,
    });
  },
}));
