import React, { useState, useMemo, useRef, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  initDB,
  getCachedTransactions,
  moveToTrash,
  getTrashedTransactions,
  restoreFromTrash,
  permanentlyDeleteFromTrash,
  purgeExpiredTrash,
  clearAllTrashedTransactions,
} from '../utils/syncEngine';
import { springTransition, monthOptions, processChartData, getTransactionDate, getTransactionDateKey } from '../utils/styles';
import { useAuthStore } from '../stores/authStore';
import { useToast } from '../components/Toast';
import { isLocalDBEmpty, exportToVaultDebounced, exportToVaultImmediate, cancelPendingExport, hasVaultFile, readVaultPayload, archiveVault, restorePayload, unlockVaultExport } from '../utils/vaultManager';
import ConfirmationDialog from '../components/ConfirmationDialog';
import GradientOrbs from '../components/GradientOrbs';
import Sidebar from '../components/Sidebar';
import PeriodFilterBar from '../components/PeriodFilterBar';
import TransactionModal from '../components/TransactionModal';

const OverviewTab = React.lazy(() => import('../components/OverviewTab'));
const LedgerTab = React.lazy(() => import('../components/LedgerTab'));
const AnalyticsTab = React.lazy(() => import('../components/AnalyticsTab'));
const TrashTab = React.lazy(() => import('../components/TrashTab'));
const SettingsTab = React.lazy(() => import('../components/SettingsTab'));

const initialCategories = [
  'Morning Food',
  'Night Food',
  'Snacks',
  'Petrol',
  'Water Drinking',
  'Internet/Light/Maintenance',
  'Miscellaneous',
];

export default function DashboardPage() {
  const session = useAuthStore((s) => s.session);
  const toast = useToast();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState(() => {
    try { return JSON.parse(localStorage.getItem('categories')) || initialCategories; }
    catch { return initialCategories; }
  });
  const [budget, setBudget] = useState(() => {
    const stored = localStorage.getItem('monthlyBudget');
    return stored !== null ? stored : '8000';
  });
  const [baseBalances, setBaseBalances] = useState(() => {
    try { return JSON.parse(localStorage.getItem('baseBalances')) || { cash: 0, upi: 0 }; }
    catch { return { cash: 0, upi: 0 }; }
  });
  const [activeTab, setActiveTab] = useState('Overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth());
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [trashedTransactions, setTrashedTransactions] = useState([]);
  const [mountedTabs, setMountedTabs] = useState(() => new Set(['Overview']));
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const mountedRef = useRef(true);
  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const vaultPayloadRef = useRef(null);
  const user = session?.user;

  const fetchTransactions = useCallback(async () => {
    setError('');
    try {
      const all = await getCachedTransactions();
      const userTx = all
        .filter((t) => t.user_id === user.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      if (mountedRef.current) setTransactions(userTx);
    } catch (err) {
      console.error('IndexedDB read failed:', err);
      if (mountedRef.current) setError(err.message);
    }
    if (mountedRef.current) setIsLoading(false);
  }, [user]);

  const fetchBalances = useCallback(() => {
    try {
      const cached = localStorage.getItem('baseBalances');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') setBaseBalances(parsed);
      }
    } catch {}
    try {
      const storedBudget = localStorage.getItem('monthlyBudget');
      if (storedBudget !== null) setBudget(storedBudget);
    } catch {}
  }, []);

  const fetchTrashed = useCallback(async () => {
    try {
      const all = await getTrashedTransactions();
      const userTrash = all
        .filter((t) => t.user_id === user.id)
        .sort((a, b) => b.deleted_at - a.deleted_at);
      setTrashedTransactions(userTrash);
    } catch (err) {
      console.error('Failed to load trash:', err);
    }
  }, [user]);

  const needsRestoreRef = useRef(false);

  const handleRestoreConfirm = useCallback(async () => {
    const payload = vaultPayloadRef.current;
    if (payload) {
      const result = await restorePayload(payload);
      if (result.restored) {
        toast.success('Previous Data Restored Securely');
      }
    }
    vaultPayloadRef.current = null;
    setShowRestorePrompt(false);
    needsRestoreRef.current = false;
    await fetchTransactions();
    await fetchTrashed();
    fetchBalances();
  }, [toast, fetchTransactions, fetchTrashed, fetchBalances]);

  const handleRestoreDecline = useCallback(async () => {
    await archiveVault();
    toast.success('Starting fresh — old backup archived');
    vaultPayloadRef.current = null;
    setShowRestorePrompt(false);
    needsRestoreRef.current = false;
  }, [toast]);

  useEffect(() => {
    mountedRef.current = true;

    async function boot() {
      if (!user?.id) return;

      try {
        await initDB();

        const dbEmpty = await isLocalDBEmpty(user.id);
        if (dbEmpty) {
          const vaultExists = await hasVaultFile();
          if (vaultExists) {
            const payload = await readVaultPayload();
            if (payload && payload.transactions && payload.transactions.length > 0) {
              vaultPayloadRef.current = payload;
              needsRestoreRef.current = true;
              unlockVaultExport();
              setShowRestorePrompt(true);
              await purgeExpiredTrash();
              try {
                await fetchTransactions();
                await fetchTrashed();
                fetchBalances();
              } catch {}
              return;
            }
          }
        }

        unlockVaultExport();
        await purgeExpiredTrash();
      } catch (err) {
        console.error('DB init/purge failed:', err);
        unlockVaultExport();
      }

      try {
        await fetchTransactions();
        await fetchTrashed();
        fetchBalances();
      } catch (err) {
        console.error('Boot data fetch failed:', err);
      }
    }
    boot();

    return () => {
      mountedRef.current = false;
      cancelPendingExport();
    };
  }, [fetchTransactions, fetchTrashed, fetchBalances, user, toast]);

  useEffect(() => {
    const numericBudget = budget === '' ? 0 : Number(budget);
    const stored = localStorage.getItem('monthlyBudget');
    if (stored !== String(numericBudget)) {
      localStorage.setItem('monthlyBudget', numericBudget);
      exportToVaultDebounced(user.id);
    }
  }, [budget, user.id]);

  useEffect(() => {
    const serialized = JSON.stringify(categories);
    const stored = localStorage.getItem('categories');
    if (stored !== serialized) {
      localStorage.setItem('categories', serialized);
      exportToVaultDebounced(user.id);
    }
  }, [categories, user.id]);

  useEffect(() => {
    const serialized = JSON.stringify(baseBalances);
    const stored = localStorage.getItem('baseBalances');
    if (stored !== serialized) {
      localStorage.setItem('baseBalances', serialized);
      exportToVaultDebounced(user.id);
    }
  }, [baseBalances, user.id]);

  function handleAddCategory(categoryName) {
    const trimmedCategory = categoryName.trim();

    if (
      !trimmedCategory ||
      categories.some(
        (category) => category.toLowerCase() === trimmedCategory.toLowerCase(),
      )
    ) {
      return false;
    }

    setCategories((currentCategories) => [...currentCategories, trimmedCategory]);
    return true;
  }

  function handleRemoveCategory(categoryName) {
    if (categories.length === 1) {
      return;
    }

    setCategories((currentCategories) =>
      currentCategories.filter((category) => category !== categoryName),
    );
  }

  const handleDeleteTransaction = useCallback(async (transactionId) => {
    try {
      const tx = transactions.find((t) => t.id === transactionId);
      if (tx) {
        await moveToTrash(tx);
      }
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
      await fetchTrashed();
      exportToVaultImmediate(user.id);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [transactions, user.id, fetchTrashed]);

  const handleDeleteMultipleTransactions = useCallback(async (transactionIds) => {
    try {
      const idSet = new Set(transactionIds);
      const toTrash = transactions.filter((t) => idSet.has(t.id));
      await Promise.all(toTrash.map((tx) => moveToTrash(tx)));
      setTransactions((prev) => prev.filter((t) => !idSet.has(t.id)));
      await fetchTrashed();
      exportToVaultImmediate(user.id);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [transactions, user.id, fetchTrashed]);

  const handleRestoreTransaction = useCallback(async (transactionId) => {
    try {
      await restoreFromTrash(transactionId);
      await fetchTrashed();
      await fetchTransactions();
      exportToVaultImmediate(user.id);
    } catch (err) {
      console.error('Restore failed:', err);
    }
  }, [fetchTrashed, fetchTransactions, user.id]);

  const handlePermanentDelete = useCallback(async (transactionId) => {
    try {
      await permanentlyDeleteFromTrash(transactionId);
      await fetchTrashed();
      exportToVaultImmediate(user.id);
    } catch (err) {
      console.error('Permanent delete failed:', err);
    }
  }, [fetchTrashed, user.id]);

  const handleEmptyTrash = useCallback(async () => {
    try {
      await clearAllTrashedTransactions();
      setTrashedTransactions([]);
      exportToVaultImmediate(user.id);
    } catch (err) {
      console.error('Empty trash failed:', err);
    }
  }, [user.id]);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((transaction) => {
        const date = getTransactionDate(transaction);
        return date.getMonth() === filterMonth && date.getFullYear() === filterYear;
      }),
    [filterMonth, filterYear, transactions],
  );

  const yearOptions = useMemo(() => {
    const years = new Set([filterYear, new Date().getFullYear()]);

    transactions.forEach((transaction) => {
      const date = getTransactionDate(transaction);
      if (!Number.isNaN(date.getTime())) {
        years.add(date.getFullYear());
      }
    });

    for (let year = new Date().getFullYear() - 3; year <= new Date().getFullYear() + 1; year += 1) {
      years.add(year);
    }

    return [...years].sort((a, b) => b - a);
  }, [filterYear, transactions]);

  const analytics = useMemo(() => {
    const now = new Date();
    const isCurrentPeriod =
      filterMonth === now.getMonth() && filterYear === now.getFullYear();
    const today = new Date().toLocaleDateString('en-CA');
    const daysInMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
    const daysElapsed = isCurrentPeriod ? now.getDate() : daysInMonth;
    const daysLeft = isCurrentPeriod
      ? Math.max(daysInMonth - now.getDate() + 1, 1)
      : daysInMonth;

    let totalIncome = 0;
    let totalOutflow = 0;
    let todayOutflow = 0;
    let totalCashIncome = 0;
    let totalCashExpense = 0;
    let totalUPIIncome = 0;
    let totalUPIExpense = 0;
    const categoryMap = new Map();
    const incomeCategoryMap = new Map();
    const dailyMap = new Map();

    for (const transaction of filteredTransactions) {
      const amount = Number(transaction.amount) || 0;
      const isExpense = transaction.type === 'expense';
      const isIncome = transaction.type === 'income';

      if (isExpense) {
        totalOutflow += amount;
        categoryMap.set(transaction.category, (categoryMap.get(transaction.category) || 0) + amount);
        const date = getTransactionDate(transaction);
        const dayKey = String(date.getDate()).padStart(2, '0');
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + amount);
        if (getTransactionDateKey(transaction) === today) todayOutflow += amount;
      } else if (isIncome) {
        totalIncome += amount;
        incomeCategoryMap.set(transaction.category, (incomeCategoryMap.get(transaction.category) || 0) + amount);
      }
    }

    for (const transaction of transactions) {
      const amount = Number(transaction.amount) || 0;
      const isExpense = transaction.type === 'expense';
      const isIncome = transaction.type === 'income';
      const isCash = transaction.payment_mode === 'Cash';
      const isUPI = transaction.payment_mode === 'UPI';

      if (isIncome) {
        if (isCash) totalCashIncome += amount;
        else if (isUPI) totalUPIIncome += amount;
      } else if (isExpense) {
        if (isCash) totalCashExpense += amount;
        else if (isUPI) totalUPIExpense += amount;
      }
    }

    const monthlyOutflow = totalOutflow;
    const dailyOutflow = isCurrentPeriod
      ? todayOutflow
      : monthlyOutflow / Math.max(daysElapsed, 1);

    const remainingBudget = Math.max(Number(budget || 0) - monthlyOutflow, 0);
    const safeDailyAllowance = remainingBudget / daysLeft;

    const categoryBreakdown = [...categoryMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const incomeCategoryBreakdown = [...incomeCategoryMap.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);

    const monthlyPulse = Array.from({ length: daysInMonth }, (_, dayIndex) => {
      const day = String(dayIndex + 1).padStart(2, '0');
      return {
        label: day,
        value: dailyMap.get(day) || 0,
      };
    });

    const totalCashBalance = (Number(baseBalances.cash) || 0) + totalCashIncome - totalCashExpense;
    const totalUPIBalance = (Number(baseBalances.upi) || 0) + totalUPIIncome - totalUPIExpense;
    const rawGrandTotal = totalCashBalance + totalUPIBalance;
    const cumulativeAvailable = Math.max(0, rawGrandTotal);

    return {
      categoryBreakdown,
      incomeCategoryBreakdown,
      dailyOutflow,
      monthlyOutflow,
      monthlyPulse,
      netPosition: rawGrandTotal,
      safeDailyAllowance,
      safeDailyExceeded: dailyOutflow > safeDailyAllowance,
      transactionCount: filteredTransactions.length,
      cumulativeCashBalance: totalCashBalance,
      cumulativeUPIBalance: totalUPIBalance,
      cumulativeGrandTotal: cumulativeAvailable,
    };
  }, [budget, filterMonth, filterYear, filteredTransactions, transactions, baseBalances]);

  const currentCalendarMonthSpend = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    return transactions
      .filter((t) => {
        if (t.type !== 'expense') return false;
        const d = getTransactionDate(t);
        return d.getMonth() === curMonth && d.getFullYear() === curYear;
      })
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [transactions]);

  const dynamicPieChartData = useMemo(() => {
    return processChartData(filteredTransactions, 'expense');
  }, [filteredTransactions]);

  const dynamicIncomePieChartData = useMemo(() => {
    return processChartData(filteredTransactions, 'income');
  }, [filteredTransactions]);

  const annualPulse = useMemo(() => {
    const months = monthOptions.map((month) => ({
      label: month.label.slice(0, 3),
      expense: 0,
      income: 0,
    }));

    transactions
      .filter((transaction) => {
        const date = getTransactionDate(transaction);
        return date.getFullYear() === filterYear;
      })
      .forEach((transaction) => {
        const date = getTransactionDate(transaction);
        const amount = Math.abs(Number(transaction.amount || 0));
        if (transaction.type?.toLowerCase() === 'expense') {
          months[date.getMonth()].expense += amount;
        } else if (transaction.type?.toLowerCase() === 'income') {
          months[date.getMonth()].income += amount;
        }
      });

    return months;
  }, [filterYear, transactions]);

  return (
    <main className="relative flex flex-col md:flex-row h-screen w-full bg-black text-zinc-300 font-sans tracking-tight overflow-hidden">
      <GradientOrbs />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={springTransition}
        className="relative z-10 flex items-center justify-between border-b border-white/5 bg-black/40 backdrop-blur-xl px-4 py-4 text-sm font-semibold text-white md:hidden"
      >
        <div>FINANCE OS</div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          className="rounded-xl border border-white/10 bg-[#0a0a0a]/60 backdrop-blur-md px-3 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:border-cyan-500 hover:text-white"
          onClick={() => setIsSidebarOpen((current) => !current)}
          type="button"
        >
          ☰
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            key="sidebar-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <Sidebar
        activeTab={activeTab}
        isSidebarOpen={isSidebarOpen}
        onOpenTransaction={() => {
          setIsTransactionModalOpen(true);
          setIsSidebarOpen(false);
        }}
        setActiveTab={(tab) => {
          setMountedTabs((prev) => new Set(prev).add(tab));
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }}
      />

      <section ref={scrollRef} onScroll={() => {
        const y = scrollRef.current?.scrollTop || 0;
        if (scrollYRef.current !== y) {
          scrollYRef.current = y;
          const orbs = scrollRef.current?.parentElement?.querySelector('[aria-hidden="true"]');
          if (orbs) {
            const offset = y * 0.05;
            const orbsDivs = orbs.children;
            if (orbsDivs[0]) orbsDivs[0].style.transform = `translate(${offset * 0.3}px, ${offset}px)`;
            if (orbsDivs[1]) orbsDivs[1].style.transform = `translate(${-offset * 0.3}px, ${-offset}px)`;
          }
        }
      }} className="relative z-10 finance-scrollbar flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-6 px-5 py-6 lg:px-8">
          <PeriodFilterBar
            filterMonth={filterMonth}
            filterYear={filterYear}
            setFilterMonth={setFilterMonth}
            setFilterYear={setFilterYear}
            yearOptions={yearOptions}
          />

          <div className="relative">
            <Suspense fallback={<div className="p-6 text-zinc-500">Loading...</div>}>
              <div style={{ display: activeTab === 'Overview' ? 'block' : 'none' }}>
                {mountedTabs.has('Overview') && (
                  <OverviewTab analytics={analytics} dynamicPieChartData={dynamicPieChartData} dynamicIncomePieChartData={dynamicIncomePieChartData} error={error} isLoading={isLoading} budget={budget} />
                )}
              </div>
              <div style={{ display: activeTab === 'Ledger' ? 'block' : 'none' }}>
                {mountedTabs.has('Ledger') && (
                  <LedgerTab
                    onDeleteTransaction={handleDeleteTransaction}
                    onDeleteMultipleTransactions={handleDeleteMultipleTransactions}
                    transactions={filteredTransactions}
                    reportMonth={monthOptions[filterMonth].label}
                    reportYear={filterYear}
                    baseBalances={baseBalances}
                    categories={categories}
                    onRefresh={fetchTransactions}
                  />
                )}
              </div>
              <div style={{ display: activeTab === 'Analytics' ? 'block' : 'none' }}>
                {mountedTabs.has('Analytics') && (
                  <AnalyticsTab annualPulse={annualPulse} filterYear={filterYear} allTransactions={transactions} baseBalances={baseBalances} />
                )}
              </div>
              <div style={{ display: activeTab === 'Settings' ? 'block' : 'none' }}>
                {mountedTabs.has('Settings') && (
                  <SettingsTab
                    analytics={analytics}
                    filteredTransactions={filteredTransactions}
                    filterMonth={filterMonth}
                    filterYear={filterYear}
                    baseBalances={baseBalances}
                    budget={budget}
                    categories={categories}
                    user={user}
                    onAddCategory={handleAddCategory}
                    onRemoveCategory={handleRemoveCategory}
                    setBudget={setBudget}
                    setBaseBalances={setBaseBalances}
                    fetchBalances={fetchBalances}
                    currentCalendarMonthSpend={currentCalendarMonthSpend}
                    onDataRestored={async () => {
                      await fetchTransactions();
                      await fetchTrashed();
                      fetchBalances();
                    }}
                  />
                )}
              </div>
              <div style={{ display: activeTab === 'Trash' ? 'block' : 'none' }}>
                {mountedTabs.has('Trash') && (
                  <TrashTab
                    trashedTransactions={trashedTransactions}
                    onRestore={handleRestoreTransaction}
                    onPermanentDelete={handlePermanentDelete}
                    onEmptyTrash={handleEmptyTrash}
                  />
                )}
              </div>
            </Suspense>
          </div>
        </div>
      </section>

      <TransactionModal
        categories={categories}
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        userId={user.id}
        onSaved={() => {
          fetchTransactions();
          exportToVaultImmediate(user.id);
        }}
      />

      <ConfirmationDialog
        isOpen={showRestorePrompt}
        title="Restore Previous Data?"
        message="We found a backup from your previous install. Do you want to restore it?"
        confirmLabel="Restore"
        confirmColor="bg-cyan-500 hover:bg-cyan-600"
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreDecline}
      />
    </main>
  );
}
