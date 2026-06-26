import { useState, useMemo, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';
import { generatePDFReport } from '../utils/pdfGenerator';
import { hapticMedium } from '../utils/haptics';
import { glassPanel, springTransition, pageTransition, destructiveButton, formatCurrency, getTransactionDateKey } from '../utils/styles';
import EmptyState from './EmptyState';
import TrashIcon from './TrashIcon';
import PullToRefresh from './PullToRefresh';
import TransactionSearch from './TransactionSearch';
import PinGate from './PinGate';

const LedgerTab = memo(function LedgerTab({ onDeleteTransaction, onDeleteMultipleTransactions, transactions, reportMonth, reportYear, baseBalances, categories, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deletingId, setDeletingId] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const toast = useToast();

  const filteredTransactions = useMemo(() => {
    let result = transactions;

    const query = searchTerm.trim().toLowerCase();
    if (query) {
      result = result.filter((transaction) =>
        String(transaction.description || '').toLowerCase().includes(query) ||
        String(transaction.category || '').toLowerCase().includes(query),
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((t) => t.type === typeFilter);
    }

    if (categoryFilter !== 'all') {
      result = result.filter((t) => t.category === categoryFilter);
    }

    return result;
  }, [searchTerm, typeFilter, categoryFilter, transactions]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [searchTerm, typeFilter, categoryFilter]);

  const allVisibleSelected = filteredTransactions.length > 0 && filteredTransactions.every((t) => selectedIds.has(t.id));

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map((t) => t.id)));
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleDelete(transactionId) {
    setPendingDeleteId(transactionId);
  }

  async function confirmDelete() {
    const transactionId = pendingDeleteId;
    setPendingDeleteId('');
    setDeletingId(transactionId);
    try {
      await onDeleteTransaction(transactionId);
      hapticMedium();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId('');
    }
  }

  function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    setPendingBulkDelete(true);
  }

  async function confirmBulkDelete() {
    const ids = [...selectedIds];
    setPendingBulkDelete(false);
    setIsBulkDeleting(true);
    try {
      await onDeleteMultipleTransactions(ids);
      hapticMedium();
      setSelectedIds(new Set());
      toast.success(`${ids.length} transaction${ids.length > 1 ? 's' : ''} moved to trash.`);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      toast.error('Bulk delete failed.');
    } finally {
      setIsBulkDeleting(false);
    }
  }

  return (
    <motion.section
      key="ledger"
      {...pageTransition}
      className="space-y-5"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className={`${glassPanel} p-6`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-white">Ledger</h2>
            <p className="mt-1 text-sm text-zinc-400">Spreadsheet-style history for every transaction.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  type="button"
                >
                  {isBulkDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Selected`}
                </motion.button>
              )}
            </AnimatePresence>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md px-4 py-3 text-sm font-semibold text-zinc-200 transition-colors hover:border-cyan-500 hover:text-white"
              onClick={async () => {
                try {
                  await generatePDFReport(filteredTransactions, reportMonth, reportYear, baseBalances);
                  toast.success('PDF downloaded successfully.');
                } catch (err) {
                  console.error('PDF generation failed:', err);
                  toast.error('PDF download failed. Check the console for details.');
                }
              }}
              type="button"
            >
              Download PDF Report
            </motion.button>
          </div>
        </div>
      </motion.div>

      {!transactions.length ? (
        <EmptyState />
      ) : (
        <PullToRefresh onRefresh={onRefresh}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className={`${glassPanel} p-6`}
        >
          <TransactionSearch
            categories={categories}
            onSearch={setSearchTerm}
            onTypeFilter={setTypeFilter}
            onCategoryFilter={setCategoryFilter}
          />

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0a0a0a]/60 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3 font-semibold w-[50px]">
                      <input
                        type="checkbox"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-white/20 bg-[#0a0a0a]/60 accent-cyan-400"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold w-[120px]">Date</th>
                    <th className="px-4 py-3 font-semibold w-[160px]">Category</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 text-right font-semibold w-[140px]">Amount</th>
                    <th className="px-4 py-3 font-semibold w-[80px]">Type</th>
                    <th className="px-4 py-3 font-semibold w-[80px]">Payment</th>
                    <th className="px-4 py-3 text-right font-semibold w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {filteredTransactions.map((transaction) => {
                    const isIncome = transaction.type === 'income';
                    const isSelected = selectedIds.has(transaction.id);

                    return (
                      <motion.tr
                        key={transaction.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`text-sm text-zinc-300 bg-[#0a0a0a]/60 backdrop-blur-xl transition-colors ${isSelected ? 'bg-cyan-500/5' : ''}`}
                      >
                        <td className="px-4 py-3 w-[50px]">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(transaction.id)}
                            className="h-4 w-4 rounded border-white/20 bg-[#0a0a0a]/60 accent-cyan-400"
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-400 w-[120px]">
                          {getTransactionDateKey(transaction)}
                        </td>
                        <td className="px-4 py-3 font-medium text-white w-[160px] truncate">{transaction.category}</td>
                        <td className="max-w-xs truncate px-4 py-3 text-zinc-400">
                          {transaction.description || '-'}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold w-[140px] ${
                            isIncome ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-4 py-3 capitalize w-[80px]">{transaction.type}</td>
                        <td className="px-4 py-3 w-[80px]">{transaction.payment_mode}</td>
                        <td className="px-4 py-3 text-right w-[80px]">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            aria-label={`Delete ${transaction.category} transaction`}
                            className={`inline-flex h-9 w-9 items-center justify-center ${destructiveButton}`}
                            disabled={deletingId === transaction.id}
                            onClick={() => handleDelete(transaction.id)}
                            type="button"
                          >
                            <TrashIcon />
                          </motion.button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
              {!filteredTransactions.length && (
                <div className="px-4 py-10 text-center text-zinc-500">
                  No matching descriptions.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </PullToRefresh>
      )}

      <PinGate
        isOpen={!!pendingDeleteId}
        title="Authenticate to Delete"
        message="Enter your PIN to confirm deletion."
        onVerified={confirmDelete}
        onCancel={() => setPendingDeleteId('')}
      />

      <PinGate
        isOpen={pendingBulkDelete}
        title="Authenticate to Delete"
        message={`Enter your PIN to delete ${selectedIds.size} transaction${selectedIds.size > 1 ? 's' : ''}.`}
        onVerified={confirmBulkDelete}
        onCancel={() => setPendingBulkDelete(false)}
      />
    </motion.section>
  );
});

export default LedgerTab;
