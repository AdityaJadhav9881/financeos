export const glassPanel = 'rounded-2xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-xl shadow-2xl';
export const premiumInput = 'rounded-xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md text-white outline-none transition-all duration-200 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:shadow-[0_0_15px_rgba(6,182,212,0.25)]';
export const primaryButton = 'rounded-xl bg-white text-sm font-semibold text-black transition-colors hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60';
export const destructiveButton = 'text-zinc-500 transition-colors hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40';
export const CHART_COLORS = ['#0ea5e9', '#f43f5e', '#10b981', '#8b5cf6', '#f59e0b', '#64748b', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

export const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatCurrency(value) {
  const num = Number(value);
  return currencyFormatter.format(Number.isFinite(num) ? num : 0);
}

export const springTransition = { type: 'spring', stiffness: 260, damping: 20 };
export const fastTapTransition = { type: 'spring', stiffness: 500, damping: 30, duration: 0.1 };
export const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
export const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: springTransition },
};
export const pageTransition = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, y: -20, transition: { duration: 0.15 } },
};

export const monthOptions = Array.from({ length: 12 }, (_, monthIndex) => ({
  label: new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(new Date(2024, monthIndex, 1)),
  value: monthIndex,
}));

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function toLedgerDate(dateKey) {
  return `${dateKey}T00:00:00+05:30`;
}

export function getTransactionDate(transaction) {
  return new Date(transaction.created_at);
}

export function getTransactionDateKey(transaction) {
  return getTransactionDate(transaction).toLocaleDateString('en-CA');
}

export function normalizeAmountInput(value) {
  return value.replace(/^0+(?=\d)/, '');
}

export function processChartData(transactions, type = 'expense') {
  const filtered = transactions.filter((t) => t.type?.toLowerCase() === type);
  const grouped = filtered.reduce((acc, curr) => {
    const rawCategory = curr.category || 'Uncategorized';
    const normalizedKey = rawCategory.trim().toLowerCase();
    if (!acc[normalizedKey]) {
      acc[normalizedKey] = { name: rawCategory.trim(), value: 0 };
    }
    acc[normalizedKey].value += Math.abs(Number(curr.amount || 0));
    return acc;
  }, {});
  return Object.values(grouped).sort((a, b) => b.value - a.value);
}
