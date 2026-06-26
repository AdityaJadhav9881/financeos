import { useState, useEffect, useMemo, useRef, memo } from 'react';
import { motion } from 'framer-motion';
import { glassPanel, premiumInput, primaryButton, destructiveButton, fastTapTransition, springTransition, pageTransition, staggerContainer, staggerItem } from '../utils/styles';
import AnimatedOdometer from './AnimatedOdometer';
import TrashIcon from './TrashIcon';
import StorageManager from './StorageManager';
import { useAppLockStore } from '../stores/appLockStore';
import { useToast } from './Toast';
import { readVaultPayload, archiveVault, mergeVaultPayloads, restorePayload, decryptData } from '../utils/vaultManager';
import ConfirmationDialog from './ConfirmationDialog';
import PinGate from './PinGate';



const SettingsTab = memo(function SettingsTab({
  analytics,
  filteredTransactions,
  filterMonth,
  filterYear,
  baseBalances = { cash: 0, upi: 0 },
  budget,
  categories,
  user,
  onAddCategory,
  onRemoveCategory,
  setBudget,
  setBaseBalances,
  fetchBalances,
  currentCalendarMonthSpend,
  onDataRestored,
}) {
  const [newCategory, setNewCategory] = useState('');
  const [syncCash, setSyncCash] = useState(String(baseBalances.cash));
  const [syncUPI, setSyncUPI] = useState(String(baseBalances.upi));
  const [syncSaved, setSyncSaved] = useState(false);
  const [showResetLockDialog, setShowResetLockDialog] = useState(false);
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef(null);
  const toast = useToast();
  const resetLock = useAppLockStore((s) => s.resetLock);

  useEffect(() => {
    setSyncCash(String(baseBalances.cash));
    setSyncUPI(String(baseBalances.upi));
  }, [baseBalances.cash, baseBalances.upi]);

  const currentMonthSpend = currentCalendarMonthSpend;

  const safeDailySpend = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysLeft = Math.max(daysInMonth - now.getDate() + 1, 1);
    const remaining = Math.max(Number(budget || 0) - currentMonthSpend, 0);
    return remaining / daysLeft;
  }, [budget, currentMonthSpend]);

  function handleAddCategory(event) {
    event.preventDefault();

    if (onAddCategory(newCategory)) {
      setNewCategory('');
    }
  }

  function handleSaveBudget() {
    const numericBudget = budget === '' ? 0 : Number(budget);
    setBudget(String(numericBudget));
  }

  const syncSavedTimer = useRef(null);

  useEffect(() => {
    return () => { if (syncSavedTimer.current) clearTimeout(syncSavedTimer.current); };
  }, []);

  function handleSaveBalanceSync() {
    const cashAmount = Number(syncCash) || 0;
    const upiAmount = Number(syncUPI) || 0;
    setBaseBalances({ cash: cashAmount, upi: upiAmount });
    setSyncSaved(true);
    if (syncSavedTimer.current) clearTimeout(syncSavedTimer.current);
    syncSavedTimer.current = setTimeout(() => setSyncSaved(false), 2500);
  }

  async function handleRestoreFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsRestoring(true);
    try {
      const text = await file.text();
      const importedPayload = decryptData(text);

      const existingPayload = await readVaultPayload();

      if (existingPayload && existingPayload.transactions && existingPayload.transactions.length > 0) {
        await archiveVault();
        const merged = mergeVaultPayloads(existingPayload, importedPayload);
        const result = await restorePayload(merged);
        if (result.restored) {
          toast.success(`Restored ${result.transactionCount} transactions (old backup archived).`);
          if (onDataRestored) await onDataRestored();
        } else {
          toast.error(result.error || 'Failed to restore merged data.');
        }
      } else {
        const result = await restorePayload(importedPayload);
        if (result.restored) {
          toast.success(`Restored ${result.transactionCount} transactions from backup!`);
          if (onDataRestored) await onDataRestored();
        } else {
          toast.error(result.error || 'Failed to restore. File may be corrupted or invalid.');
        }
      }
    } catch (err) {
      toast.error('Failed to read file: ' + err.message);
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <motion.section
      key="settings"
      {...pageTransition}
      className="grid gap-6 xl:grid-cols-[1fr_0.9fr]"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className={`${glassPanel} p-6`}
      >
        <h2 className="text-xl font-semibold tracking-tight text-white">Budget Telemetry</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
          Set your monthly target once, then use Overview for daily decision-making.
        </p>

        <label className="mt-8 block max-w-sm">
          <span className="text-sm font-medium text-zinc-300">Monthly Target Budget</span>
          <input
            className={`${premiumInput} mt-2 w-full px-4 py-3 font-mono`}
            min="0"
            onBlur={handleSaveBudget}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '') {
                setBudget('');
                return;
              }
              setBudget(raw.replace(/^0+(?=\d)/, ''));
            }}
            type="number"
            value={budget}
          />
        </label>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.1 }}
        className={`${glassPanel} p-6`}
      >
        <div className="text-sm font-medium text-zinc-400">Current Month Spend</div>
        <div className="mt-3 text-4xl font-semibold tabular-nums text-white">
          <AnimatedOdometer value={currentMonthSpend} />
        </div>
        <div className="mt-8 text-sm font-medium text-zinc-400">Safe Daily Spend</div>
        <div
          className={`mt-3 text-4xl font-semibold tabular-nums ${
            currentMonthSpend > budget ? 'text-red-400' : 'text-cyan-300'
          }`}
        >
          <AnimatedOdometer value={safeDailySpend} />
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.15 }}
        className={`${glassPanel} p-6`}
      >
        <h2 className="text-xl font-semibold tracking-tight text-white">Manual Balance Sync</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
          Override your base balances to sync with your actual bank and wallet amounts.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-zinc-300">Cash Base</span>
            <input
              className={`${premiumInput} mt-2 w-full px-4 py-3 font-mono`}
              min="0"
              onChange={(event) => setSyncCash(event.target.value)}
              type="number"
              value={syncCash}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-300">UPI Base</span>
            <input
              className={`${premiumInput} mt-2 w-full px-4 py-3 font-mono`}
              min="0"
              onChange={(event) => setSyncUPI(event.target.value)}
              type="number"
              value={syncUPI}
            />
          </label>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          transition={fastTapTransition}
          className={`${primaryButton} mt-5 w-full px-4 py-3`}
          onClick={handleSaveBalanceSync}
          type="button"
        >
          Save Sync
        </motion.button>

        {syncSaved && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-center text-sm font-medium text-emerald-400"
          >
            Balances synced and dashboard updated.
          </motion.p>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.2 }}
        className={`${glassPanel} p-6 xl:col-span-2`}
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">
              Category Manager
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Add categories for the intake dropdown, or remove ones you no longer use.
            </p>
          </div>

          <form className="flex w-full gap-3 lg:max-w-md" onSubmit={handleAddCategory}>
            <label className="min-w-0 flex-1">
              <span className="sr-only">New category</span>
              <input
                className={`${premiumInput} w-full px-4 py-3 text-sm placeholder:text-zinc-600`}
                onChange={(event) => setNewCategory(event.target.value)}
                placeholder="Add category"
                type="text"
                value={newCategory}
              />
            </label>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={fastTapTransition}
              className={`${primaryButton} px-5 py-3`}
              type="submit"
            >
              Add
            </motion.button>
          </form>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
        >
          {categories.map((category) => (
            <motion.div
              variants={staggerItem}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md px-4 py-3"
              key={category}
            >
              <span className="min-w-0 truncate text-sm font-medium text-zinc-200">
                {category}
              </span>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                aria-label={`Delete ${category} category`}
                className={`inline-flex h-9 w-9 shrink-0 items-center justify-center ${destructiveButton}`}
                disabled={categories.length === 1}
                onClick={() => onRemoveCategory(category)}
                type="button"
              >
                <TrashIcon />
              </motion.button>
            </motion.div>
          ))}
          {!categories.length && (
            <div className="rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md px-4 py-6 text-sm text-zinc-500">
              No saved categories. You can still type custom categories in the intake form.
            </div>
          )}
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.3 }}
        className={`${glassPanel} p-6 xl:col-span-2`}
      >
        <h2 className="text-xl font-semibold tracking-tight text-white">App Lock</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
          Manage your PIN authentication settings.
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md px-4 py-4">
            <div>
              <div className="text-sm font-medium text-zinc-200">Reset PIN</div>
              <div className="mt-1 text-xs text-zinc-500">
                Remove your current PIN and set a new one on next launch
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={fastTapTransition}
              className="rounded-xl border border-white/10 bg-[#0a0a0a]/60 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-red-500 hover:text-red-400"
              onClick={() => setShowPinVerification(true)}
              type="button"
            >
              Reset
            </motion.button>
          </div>
        </div>
      </motion.div>

      <PinGate
        isOpen={showPinVerification}
        title="Verify Current PIN"
        message="Enter your current PIN to reset."
        onVerified={() => {
          setShowPinVerification(false);
          setShowResetLockDialog(true);
        }}
        onCancel={() => setShowPinVerification(false)}
      />

      <ConfirmationDialog
        isOpen={showResetLockDialog}
        title="Reset App Lock?"
        message="This will remove your current PIN. You'll need to set a new PIN on your next launch."
        onConfirm={() => {
          resetLock();
          setShowResetLockDialog(false);
        }}
        onCancel={() => setShowResetLockDialog(false)}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.35 }}
        className={`${glassPanel} p-6 xl:col-span-2`}
      >
        <h2 className="text-xl font-semibold tracking-tight text-white">Restore Backup</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
          Restore your data from a vault.enc backup file. Select the file from your device storage.
        </p>

        <div className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".enc,*/*"
            onChange={handleRestoreFile}
            className="hidden"
          />
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={fastTapTransition}
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring}
            className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-400 transition-colors hover:bg-cyan-500/20 disabled:opacity-50"
            type="button"
          >
            {isRestoring ? 'Restoring...' : 'Select vault.enc File to Restore'}
          </motion.button>
        </div>
      </motion.div>

      <StorageManager />
    </motion.section>
  );
});

export default SettingsTab;
