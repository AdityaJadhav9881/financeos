import { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { glassPanel, springTransition, pageTransition } from '../utils/styles';
import AnimatedOdometer from './AnimatedOdometer';
import BudgetAlert from './BudgetAlert';
import TiltCard from './TiltCard';
import EmptyState from './EmptyState';
import StatPill from './StatPill';
import CategoryPieChart from './CategoryPieChart';
import MonthlyBarChart from './MonthlyBarChart';

const OverviewTab = memo(function OverviewTab({ analytics, dynamicPieChartData, dynamicIncomePieChartData, isLoading, error, budget }) {
  const hasPeriodData = analytics.transactionCount > 0;
  const [categoryMode, setCategoryMode] = useState('expense');

  return (
    <motion.section
      key="overview"
      {...pageTransition}
      className="space-y-6"
    >
      <BudgetAlert currentSpend={analytics.monthlyOutflow} budget={budget} />
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className={`${glassPanel} p-6 border-cyan-500/30 bg-gradient-to-br from-[#0a0a0a]/80 to-cyan-500/5 shadow-[0_0_30px_rgba(6,182,212,0.15)]`}
      >
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">Lifetime Balance</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Cumulative Available Balance
          </h2>
        </div>
        <div className="text-4xl font-bold tabular-nums tracking-tight text-cyan-400 mb-5">
          <AnimatedOdometer value={analytics.cumulativeGrandTotal} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-[#0a0a0a]/60 backdrop-blur-md border border-white/5 p-3">
            <div className="text-xs font-medium text-zinc-400">Cash</div>
            <div className={`mt-2 text-xl font-semibold tabular-nums ${analytics.cumulativeCashBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <AnimatedOdometer value={analytics.cumulativeCashBalance} />
            </div>
          </div>
          <div className="rounded-xl bg-[#0a0a0a]/60 backdrop-blur-md border border-white/5 p-3">
            <div className="text-xs font-medium text-zinc-400">UPI</div>
            <div className={`mt-2 text-xl font-semibold tabular-nums ${analytics.cumulativeUPIBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              <AnimatedOdometer value={analytics.cumulativeUPIBalance} />
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <TiltCard>
          <StatPill label="Net Position" value={analytics.netPosition} danger={analytics.netPosition < 0} />
        </TiltCard>

        <TiltCard>
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.1 }}
            className={`${glassPanel} p-6 text-center`}
          >
            <div className="text-sm font-medium text-zinc-400">Live Daily Burn Rate</div>
            <div
              className="mt-4 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-5xl font-bold tabular-nums tracking-tight text-transparent drop-shadow-[0_0_28px_rgba(34,211,238,0.35)] sm:text-7xl"
            >
              <AnimatedOdometer value={analytics.dailyOutflow} />
            </div>
            <div className="mt-4 text-sm text-zinc-400">
              {isLoading ? 'Loading transactions.' : `${analytics.transactionCount} ledger entries synced.`}
            </div>
            {error && <div className="mt-4 text-sm font-medium text-red-400">{error}</div>}
          </motion.section>
        </TiltCard>

        <TiltCard>
          <StatPill
            label="Safe Daily Spend Allowance"
            value={analytics.safeDailyAllowance}
            danger={analytics.safeDailyExceeded}
          />
        </TiltCard>
      </div>

      {!hasPeriodData && !isLoading ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.15 }}
            className={`${glassPanel} p-6`}
            id="pie-chart-container"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Category Breakdown</h2>
              <p className="mt-1 text-sm text-zinc-400">
                {categoryMode === 'expense' ? 'Relative share of selected-period expenses.' : 'Relative share of selected-period income.'}
              </p>
            </div>
            <div className="mb-5 flex gap-1 rounded-full border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md p-1 w-fit">
              {['expense', 'income'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCategoryMode(mode)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold capitalize transition-colors ${
                    categoryMode === mode
                      ? 'bg-white/10 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {mode === 'expense' ? 'Expenses' : 'Income'}
                </button>
              ))}
            </div>
            {categoryMode === 'expense' ? (
              <CategoryPieChart data={dynamicPieChartData} />
            ) : (
              <CategoryPieChart data={dynamicIncomePieChartData} emptyText="No income data yet." />
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springTransition, delay: 0.25 }}
            className={`${glassPanel} p-6`}
            id="bar-chart-container"
          >
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-white">Period Pulse</h2>
              <p className="mt-1 text-sm text-zinc-400">Daily outflow across the selected month.</p>
            </div>
            <MonthlyBarChart data={analytics.monthlyPulse} emptyText="No daily spending yet." />
          </motion.section>
        </div>
      )}
    </motion.section>
  );
});

export default OverviewTab;
