import { motion } from 'framer-motion';
import { glassPanel } from '../utils/styles';

export default function BudgetAlert({ currentSpend, budget }) {
  const numBudget = Number(budget) || 0;
  if (numBudget <= 0) return null;

  const percentage = (currentSpend / numBudget) * 100;

  if (percentage >= 100) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${glassPanel} mb-4 border-red-500/30 bg-red-500/5 p-4`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-red-300">Budget Exceeded</p>
            <p className="text-xs text-zinc-400">You've spent {percentage.toFixed(0)}% of your monthly budget.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (percentage >= 80) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${glassPanel} mb-4 border-amber-500/30 bg-amber-500/5 p-4`}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-300">Budget Warning</p>
            <p className="text-xs text-zinc-400">You've used {percentage.toFixed(0)}% of your budget. {(numBudget - currentSpend).toFixed(0)} remaining.</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
