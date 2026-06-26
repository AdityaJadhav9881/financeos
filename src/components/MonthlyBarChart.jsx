import { memo } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, staggerContainer, staggerItem } from '../utils/styles';

const MonthlyBarChart = memo(function MonthlyBarChart({ data, emptyText = 'No monthly spending yet.', showIncome = false }) {
  const maxValue = Math.max(...data.map((item) => {
    const expense = item.expense ?? item.value ?? 0;
    const income = item.income ?? 0;
    return showIncome ? Math.max(expense, income) : expense;
  }), 0);

  if (!maxValue) {
    return (
      <div className="flex h-60 items-center justify-center text-sm font-medium text-zinc-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      {showIncome && (
        <div className="flex items-center justify-center gap-6 mb-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-gradient-to-t from-cyan-500 to-cyan-300" />
            <span className="text-xs font-medium text-zinc-400">Expenses</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-gradient-to-t from-emerald-500 to-emerald-300" />
            <span className="text-xs font-medium text-zinc-400">Income</span>
          </div>
        </div>
      )}
      <div className="min-w-[600px] h-60">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="flex h-full items-end gap-3 px-2 py-5 pt-6"
        >
          {data.map((item) => {
            const expenseVal = item.expense ?? item.value ?? 0;
            const incomeVal = showIncome ? (item.income ?? 0) : 0;
            const expenseHeight = `${Math.max((expenseVal / maxValue) * 100, expenseVal > 0 ? 4 : 0)}%`;
            const incomeHeight = `${Math.max((incomeVal / maxValue) * 100, incomeVal > 0 ? 4 : 0)}%`;

            return (
              <motion.div
                variants={staggerItem}
                className="flex h-full flex-1 flex-col justify-end gap-3"
                key={item.label}
              >
                <div className="flex flex-1 items-end gap-[2px]">
                  {showIncome && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: incomeHeight }}
                      transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                      className="w-1/2 rounded-t-xl bg-gradient-to-t from-emerald-500 to-emerald-300"
                      title={`${item.label} Income: ${formatCurrency(incomeVal)}`}
                    />
                  )}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: expenseHeight }}
                    transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
                    className={`${showIncome ? 'w-1/2' : 'w-full'} rounded-t-xl bg-gradient-to-t from-cyan-500 to-cyan-300`}
                    title={`${item.label} ${showIncome ? 'Expense' : ''}: ${formatCurrency(expenseVal)}`}
                  />
                </div>
                <div className="truncate text-center text-xs font-medium text-zinc-500">
                  {item.label}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
});

export default MonthlyBarChart;
