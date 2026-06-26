import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { glassPanel, fastTapTransition, springTransition } from '../utils/styles';
import { openDB } from 'idb';
import ConfirmationDialog from './ConfirmationDialog';
import PinGate from './PinGate';

async function deleteVaultFile() {
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) return;
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    // Delete from internal storage
    try {
      await Filesystem.deleteFile({ path: 'vault.enc', directory: Directory.Data });
    } catch {}
    // Delete from Documents (if it exists)
    try {
      await Filesystem.deleteFile({ path: 'vault.enc', directory: Directory.Documents });
    } catch {}
  } catch {}
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
}

export default function StorageManager() {
  const [usage, setUsage] = useState({ used: 0, quota: 0 });
  const [indexedDBSize, setIndexedDBSize] = useState(0);
  const [localStorageSize, setLocalStorageSize] = useState(0);
  const [showEraseDialog, setShowEraseDialog] = useState(false);
  const [showErasePinGate, setShowErasePinGate] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [eraseSuccess, setEraseSuccess] = useState(false);

  const calculateStorage = useCallback(async () => {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        setUsage({ used: estimate.usage || 0, quota: estimate.quota || 0 });
      }
    } catch {}

    try {
      let total = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          total += key.length + value.length;
        }
      }
      setLocalStorageSize(total * 2);
    } catch {}

    try {
      let Preferences = null;
      try {
        const mod = await import('@capacitor/preferences');
        Preferences = mod.Preferences;
      } catch {}
      if (Preferences) {
        const result = await Preferences.keys();
        let prefTotal = 0;
        for (const key of result.keys) {
          const { value } = await Preferences.get({ key });
          prefTotal += key.length + (value || '').length;
        }
        setLocalStorageSize((prev) => prev + prefTotal * 2);
      }
    } catch {}

    try {
      const dbs = await indexedDB.databases();
      let totalIndexedDB = 0;
      for (const dbInfo of dbs) {
        try {
          const db = await openDB(dbInfo.name, dbInfo.version);
          const txNames = Array.from(db.objectStoreNames);
          for (const storeName of txNames) {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const allKeys = await store.getAllKeys();
            totalIndexedDB += allKeys.length * 200;
          }
          db.close();
        } catch {}
      }
      setIndexedDBSize(totalIndexedDB);
    } catch {}
  }, []);

  useEffect(() => {
    calculateStorage();
  }, [calculateStorage]);

  async function handleEraseAll() {
    setIsErasing(true);
    try {
      const dbs = await indexedDB.databases();
      for (const dbInfo of dbs) {
        indexedDB.deleteDatabase(dbInfo.name);
      }
    } catch {}

    try {
      let Preferences = null;
      try {
        const mod = await import('@capacitor/preferences');
        Preferences = mod.Preferences;
      } catch {}

      if (Preferences) {
        await Preferences.clear();
      } else {
        localStorage.clear();
      }
    } catch {}

    await deleteVaultFile();

    setIsErasing(false);
    setEraseSuccess(true);
    setUsage({ used: 0, quota: 0 });
    setIndexedDBSize(0);
    setLocalStorageSize(0);

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  }

  const usedPercent = usage.quota > 0 ? Math.min((usage.used / usage.quota) * 100, 100) : 0;
  const usedPercentText = usedPercent.toFixed(4);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.35 }}
        className={`${glassPanel} p-6 xl:col-span-2`}
      >
        <h2 className="text-xl font-semibold tracking-tight text-white">Local Storage Manager</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
          See how much space your data uses on this device.
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-zinc-300">Total Usage</span>
              <span className="font-mono text-zinc-500">
                {formatBytes(usage.used)} / {formatBytes(usage.quota)}
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${usedPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400"
              />
            </div>
            <div className="mt-1 text-right text-xs text-zinc-600">{usedPercentText}% of quota</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md px-4 py-3">
              <div className="text-xs font-medium text-zinc-500">IndexedDB</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-white">{formatBytes(indexedDBSize)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md px-4 py-3">
              <div className="text-xs font-medium text-zinc-500">localStorage</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-white">{formatBytes(localStorageSize)}</div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={fastTapTransition}
            onClick={calculateStorage}
            className="w-full rounded-xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-white/20 hover:text-zinc-200"
            type="button"
          >
            Refresh
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.4 }}
        className={`${glassPanel} p-6 xl:col-span-2`}
      >
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
          <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Permanently erase all local data including transactions, settings, and preferences. This action cannot be undone.
          </p>

          {eraseSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-center text-sm font-medium text-emerald-400"
            >
              All data erased. Reloading...
            </motion.div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              transition={fastTapTransition}
              onClick={() => setShowEraseDialog(true)}
              className="mt-4 w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/20"
              type="button"
            >
              Erase All Local Data
            </motion.button>
          )}
        </div>
      </motion.div>

      <ConfirmationDialog
        isOpen={showEraseDialog}
        title="Erase ALL Local Data?"
        message="This will permanently delete all transactions, budgets, categories, and app settings. The app will reload to factory state. This cannot be undone."
        onConfirm={() => {
          setShowEraseDialog(false);
          setShowErasePinGate(true);
        }}
        onCancel={() => setShowEraseDialog(false)}
      />

      <PinGate
        isOpen={showErasePinGate}
        title="Authenticate to Erase"
        message="Enter your PIN to confirm factory reset."
        onVerified={() => {
          setShowErasePinGate(false);
          handleEraseAll();
        }}
        onCancel={() => setShowErasePinGate(false)}
      />
    </>
  );
}
