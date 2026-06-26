import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { addTransactionToDB } from '../utils/syncEngine';
import { sanitizeTransactionPayload } from '../utils/sanitize';
import { hapticLight } from '../utils/haptics';
import { glassPanel, premiumInput, springTransition, fastTapTransition, primaryButton, todayKey, toLedgerDate, normalizeAmountInput } from '../utils/styles';

const transactionTypes = ['expense', 'income'];
const paymentModes = ['UPI', 'Cash'];

export default function TransactionModal({ categories = [], isOpen, onClose, userId, onSaved }) {
  const [amount, setAmount] = useState('');
  const [entryDate, setEntryDate] = useState(todayKey());
  const [category, setCategory] = useState(categories[0] || '');
  const [type, setType] = useState('expense');
  const [isEssential, setIsEssential] = useState(true);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, []);

  useEffect(() => {
    if (!categories.includes(category) && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  useEffect(() => {
    if (isOpen) {
      setEntryDate(todayKey());
    }
  }, [isOpen]);

  function resetForm() {
    setAmount('');
    setDescription('');
    setEntryDate(todayKey());
    setCategory(categories[0] || '');
    setType('expense');
    setIsEssential(true);
    setPaymentMode('UPI');
    setIsSubmitting(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    const trimmedCategory = category.trim();

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    if (!trimmedCategory) return;

    const transactionPayload = sanitizeTransactionPayload({
      user_id: userId,
      amount: parsedAmount,
      category: trimmedCategory,
      type,
      is_essential: isEssential,
      payment_mode: paymentMode,
      created_at: toLedgerDate(entryDate),
      description: description.trim(),
    });

    const record = {
      ...transactionPayload,
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    };

    // Optimistic: close modal immediately for 60fps animation
    resetForm();
    onClose();

    // Deferred: do DB work after modal animation completes
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      addTransactionToDB(record)
        .then(() => {
          hapticLight();
          onSaved();
        })
        .catch(() => {});
    }, 50);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8 backdrop-blur-md"
        >
          <motion.section
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={springTransition}
            className={`${glassPanel} w-full max-w-xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.1)]`}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-white">Log Transaction</h2>
                <p className="mt-1 text-sm text-zinc-400">Fast entry for daily or backlogged records.</p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                aria-label="Close transaction form"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200"
                onClick={onClose}
                type="button"
              >
                Close
              </motion.button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-zinc-300">Date</span>
                <input
                  className={`${premiumInput} mt-2 w-full px-4 py-3`}
                  onChange={(event) => setEntryDate(event.target.value)}
                  required
                  type="date"
                  value={entryDate}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-zinc-300">Amount</span>
                <input
                  className={`${premiumInput} mt-2 w-full px-4 py-3 font-mono placeholder:text-zinc-600`}
                  inputMode="decimal"
                  min="0.01"
                  onChange={(event) =>
                    setAmount(normalizeAmountInput(event.target.value))
                  }
                  placeholder="0"
                  required
                  step="0.01"
                  type="number"
                  value={amount}
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Category</span>
              <select
                className={`${premiumInput} mt-2 w-full px-4 py-3`}
                onChange={(event) => setCategory(event.target.value)}
                required
                value={category}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#111] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md p-1">
              {transactionTypes.map((transactionType) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`rounded-full px-3 py-3 text-sm font-semibold capitalize transition-colors ${
                    type === transactionType
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  key={transactionType}
                  onClick={() => setType(transactionType)}
                  type="button"
                >
                  {transactionType}
                </motion.button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 rounded-full border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md p-1">
              {paymentModes.map((mode) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`rounded-full px-3 py-3 text-sm font-semibold transition-colors ${
                    paymentMode === mode
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                  key={mode}
                  onClick={() => setPaymentMode(mode)}
                  type="button"
                >
                  {mode}
                </motion.button>
              ))}
            </div>

            <label className="block">
              <span className="text-sm font-medium text-zinc-300">Description</span>
              <input
                className={`${premiumInput} mt-2 w-full px-4 py-3 placeholder:text-zinc-600`}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional note"
                type="text"
                value={description}
              />
            </label>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md p-4">
              <label className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-zinc-300">Essential</span>
                <input
                  checked={isEssential}
                  className="h-5 w-5 accent-cyan-300"
                  onChange={(event) => setIsEssential(event.target.checked)}
                  type="checkbox"
                />
              </label>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={fastTapTransition}
              className={`${primaryButton} w-full px-4 py-3`}
              disabled={isSubmitting}
              type="submit"
            >
              {isSubmitting ? 'Saving' : 'Save transaction'}
            </motion.button>
            </form>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
