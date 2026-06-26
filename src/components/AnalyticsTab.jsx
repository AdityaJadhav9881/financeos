import { useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { generateForecast } from '../utils/forecastEngine';
import { glassPanel, springTransition, pageTransition } from '../utils/styles';
import AnimatedOdometer from './AnimatedOdometer';
import EmptyState from './EmptyState';
import MonthlyBarChart from './MonthlyBarChart';
import GlassTooltip from './GlassTooltip';

const AnalyticsTab = memo(function AnalyticsTab({ annualPulse = [], filterYear, allTransactions, baseBalances }) {
  const annualExpense = useMemo(() => annualPulse.reduce((sum, item) => sum + (item.expense || 0), 0), [annualPulse]);
  const annualIncome = useMemo(() => annualPulse.reduce((sum, item) => sum + (item.income || 0), 0), [annualPulse]);

  const { forecast, hasEnoughData } = useMemo(
    () => generateForecast(allTransactions, baseBalances),
    [allTransactions, baseBalances],
  );

  const hasNegativeBalance = forecast.some((p) => p.projectedBalance < 0);

  return (
    <motion.section
      key="analytics"
      {...pageTransition}
      className="space-y-6"
    >
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.05 }}
        className={`${glassPanel} p-6`}
      >
        <p className="text-sm font-medium text-zinc-500">Analytics</p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Month-over-Month
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Income & expenses across {filterYear}, grouped by month.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-zinc-500">Year Summary</div>
            <div className="mt-1 flex flex-col items-end gap-1">
              {annualExpense > 0 && (
                <div className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-4xl font-bold tabular-nums text-transparent">
                  <AnimatedOdometer value={annualExpense} />
                </div>
              )}
              {annualIncome > 0 && (
                <div className="bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-4xl font-bold tabular-nums text-transparent">
                  <AnimatedOdometer value={annualIncome} />
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {(annualExpense > 0 || annualIncome > 0) ? (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springTransition, delay: 0.1 }}
          className={`${glassPanel} p-6`}
        >
          <MonthlyBarChart data={annualPulse} emptyText="No financial data for this year." showIncome={annualIncome > 0} />
        </motion.section>
      ) : (
        <EmptyState message="No financial data for this year." />
      )}

      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springTransition, delay: 0.15 }}
        className={`${glassPanel} p-6`}
      >
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-400">Predictive Analytics</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Neural 14-Day Forecast
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Polynomial regression on your last 30 days of spending to project your balance trajectory.
          </p>
        </div>

        {hasNegativeBalance && (
          <div className="mb-4 p-3 border border-red-500/50 bg-red-500/10 text-red-400 rounded flex items-center animate-pulse">
            <svg className="h-5 w-5 shrink-0 mr-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span className="text-sm font-semibold">
              SYSTEM WARNING: Current spending velocity will exhaust available balance within the forecast window.
            </span>
          </div>
        )}

        {!forecast.length ? (
          <div className="flex h-[300px] items-center justify-center text-sm font-medium text-zinc-500">
            Not enough historical data to generate a forecast.
          </div>
        ) : (
          <div style={{ height: '300px', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={forecast}
                margin={{ top: 30, right: 10, left: 10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#000000" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  stroke="#333"
                />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 12 }}
                  stroke="#333"
                  tickFormatter={(v) => `\u20B9${v.toLocaleString('en-IN')}`}
                />
                <Tooltip
                  content={
                    <GlassTooltip
                      formatter={(v) => [`\u20B9${Number(v).toLocaleString('en-IN')}`, 'Projected Balance']}
                    />
                  }
                />
                <ReferenceLine
                  y={0}
                  stroke="#ef4444"
                  strokeDasharray="6 4"
                  strokeWidth={1.5}
                  label={{
                    value: '\u20B90',
                    fill: '#ef4444',
                    fontSize: 11,
                    position: 'right',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="projectedBalance"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  fill="url(#forecastGradient)"
                  dot={false}
                  activeDot={{ r: 5, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {!hasEnoughData && forecast.length > 0 && (
          <p className="mt-4 text-xs font-medium text-zinc-500">
            Based on linear average (fewer than 3 days of history). More data improves accuracy.
          </p>
        )}
      </motion.section>
    </motion.section>
  );
});

export default AnalyticsTab;
