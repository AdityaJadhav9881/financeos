import regression from 'regression';

const DAY_MS = 86400000;

function toDayKey(date) {
  return date.toISOString().slice(0, 10);
}

function formatDateShort(date) {
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function computeCurrentBalance(transactions, currentBaseBalances) {
  const cashBase = Number(currentBaseBalances?.cash) || 0;
  const upiBase = Number(currentBaseBalances?.upi) || 0;

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const cashIncome = transactions
    .filter((t) => t.type === 'income' && (t.payment_mode || '').toLowerCase() === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const cashExpense = transactions
    .filter((t) => t.type === 'expense' && (t.payment_mode || '').toLowerCase() === 'cash')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const upiIncome = transactions
    .filter((t) => t.type === 'income' && (t.payment_mode || '').toLowerCase() === 'upi')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const upiExpense = transactions
    .filter((t) => t.type === 'expense' && (t.payment_mode || '').toLowerCase() === 'upi')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  return {
    cash: cashBase + cashIncome - cashExpense,
    upi: upiBase + upiIncome - upiExpense,
    total: (cashBase + cashIncome - cashExpense) + (upiBase + upiIncome - upiExpense),
  };
}

export function generateForecast(transactions, currentBaseBalances) {
  if (!transactions || !transactions.length) {
    return { forecast: [], hasEnoughData: false };
  }

  const expenses = transactions.filter((t) => t.type === 'expense');
  const currentBalance = computeCurrentBalance(transactions, currentBaseBalances);

  if (!expenses.length) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const forecast = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today.getTime() + i * DAY_MS);
      forecast.push({
        date: formatDateShort(d),
        predictedBurn: 0,
        projectedBalance: Math.round(currentBalance.total * 100) / 100,
      });
    }
    return { forecast, hasEnoughData: false };
  }

  const dailyTotals = new Map();
  expenses.forEach((t) => {
    const key = toDayKey(new Date(t.created_at));
    dailyTotals.set(key, (dailyTotals.get(key) || 0) + Number(t.amount));
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const historicalPoints = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * DAY_MS);
    const key = toDayKey(d);
    const total = dailyTotals.get(key) || 0;
    historicalPoints.push([-i, total]);
  }

  const daysWithData = historicalPoints.filter(([, total]) => total > 0).length;

  if (daysWithData < 3) {
    const totalSpent = expenses.reduce((sum, t) => sum + Number(t.amount), 0);
    const uniqueDays = new Set(expenses.map((t) => toDayKey(new Date(t.created_at)))).size;
    const avgDailyBurn = uniqueDays > 0 ? totalSpent / uniqueDays : 0;

    const forecast = [];
    let runningBalance = currentBalance.total;
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today.getTime() + i * DAY_MS);
      runningBalance -= avgDailyBurn;
      forecast.push({
        date: formatDateShort(d),
        predictedBurn: Math.round(avgDailyBurn * 100) / 100,
        projectedBalance: Math.round(runningBalance * 100) / 100,
      });
    }

    return { forecast, hasEnoughData: false };
  }

  let result;
  try {
    result = regression.polynomial(historicalPoints, { order: 2 });
  } catch {
    return { forecast: [], hasEnoughData: false };
  }

  let runningBalance = currentBalance.total;

  const forecast = [];
  for (let i = 1; i <= 14; i++) {
    const predicted = result.predict(i);
    const predictedBurn = Math.max(0, Math.min(predicted[1], currentBalance.total * 0.5));
    runningBalance -= predictedBurn;

    const d = new Date(today.getTime() + i * DAY_MS);
    forecast.push({
      date: formatDateShort(d),
      predictedBurn: Math.round(predictedBurn * 100) / 100,
      projectedBalance: Math.round(runningBalance * 100) / 100,
    });
  }

  return { forecast, hasEnoughData: true };
}
