import { memo } from 'react';
import { motion } from 'framer-motion';
import { glassPanel, springTransition, pageTransition, destructiveButton, formatCurrency, getTransactionDateKey } from '../utils/styles';

const TRASH_TTL_DAYS = 30;

function daysUntilPurge(deletedAt) {
  const elapsed = Date.now() - deletedAt;
  const remaining = TRASH_TTL_DAYS - Math.ceil(elapsed / (24 * 60 * 60 * 1000));
  return Math.max(remaining, 0);
}

const TrashTab = memo(function TrashTab({ trashedTransactions, onRestore, onPermanentDelete, onEmptyTrash }) {
  const hasItems = trashedTransactions.length > 0;

  return (
    <motion.section
      key="trash"
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
            <h2 className="text-xl font-semibold tracking-tight text-white">Trash Bin</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Deleted transactions are stored here for {TRASH_TTL_DAYS} days, then permanently removed.
            </p>
          </div>
          {hasItems && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:border-red-500 hover:text-red-300"
              onClick={onEmptyTrash}
              type="button"
            >
              Empty Trash
            </motion.button>
          )}
        </div>
      </motion.div>

      {!hasItems ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className={`${glassPanel} p-10 text-center`}
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-500/10">
            <svg className="h-8 w-8 text-zinc-500" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <p className="text-sm font-medium text-zinc-400">Trash is empty.</p>
          <p className="mt-1 text-xs text-zinc-600">Deleted transactions will appear here.</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className={`${glassPanel} p-6`}
        >
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-[#0a0a0a]/60 text-xs uppercase tracking-wide text-zinc-500">
                    <th className="px-4 py-3 font-semibold w-[120px]">Date</th>
                    <th className="px-4 py-3 font-semibold w-[140px]">Category</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 text-right font-semibold w-[120px]">Amount</th>
                    <th className="px-4 py-3 font-semibold w-[90px]">Type</th>
                    <th className="px-4 py-3 font-semibold w-[100px]">Deleted In</th>
                    <th className="px-4 py-3 text-right font-semibold w-[140px]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {trashedTransactions.map((tx) => (
                    <tr key={tx.id} className="text-sm text-zinc-300 bg-[#0a0a0a]/60 backdrop-blur-xl">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-400 w-[120px]">
                        {getTransactionDateKey(tx)}
                      </td>
                      <td className="px-4 py-3 font-medium text-white w-[140px] truncate">{tx.category}</td>
                      <td className="max-w-xs truncate px-4 py-3 text-zinc-400">
                        {tx.description || '-'}
                      </td>
                      <td
                        className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold w-[120px] ${
                          tx.type === 'income' ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {tx.type === 'income' ? '+' : '-'}
                        {formatCurrency(tx.amount)}
                      </td>
                      <td className="px-4 py-3 capitalize w-[90px]">{tx.type}</td>
                      <td className="px-4 py-3 w-[100px]">
                        <span className={`text-xs font-medium ${
                          daysUntilPurge(tx.deleted_at) <= 3 ? 'text-red-400' : 'text-zinc-500'
                        }`}>
                          {daysUntilPurge(tx.deleted_at)}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right w-[140px]">
                        <div className="flex items-center justify-end gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-lg border border-white/10 bg-[#0a0a0a]/60 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition-colors hover:border-emerald-500 hover:text-emerald-400"
                            onClick={() => onRestore(tx.id)}
                            type="button"
                          >
                            Restore
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${destructiveButton}`}
                            onClick={() => onPermanentDelete(tx.id)}
                            type="button"
                          >
                            Delete
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
});

export default TrashTab;
