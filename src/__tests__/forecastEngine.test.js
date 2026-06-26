import { describe, it, expect } from 'vitest';
import { generateForecast } from '../utils/forecastEngine';

function makeTx(amount, daysAgo, type = 'expense') {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `tx-${daysAgo}`,
    amount,
    type,
    created_at: date.toISOString(),
    category: 'Test',
  };
}

describe('generateForecast', () => {
  it('returns empty forecast for no transactions', () => {
    const result = generateForecast([], { cash: 0, upi: 0 });
    expect(result.forecast).toEqual([]);
    expect(result.hasEnoughData).toBe(false);
  });

  it('returns flat forecast with 0 burn when only income exists', () => {
    const txs = [makeTx(500, 1, 'income'), makeTx(300, 2, 'income')];
    const result = generateForecast(txs, { cash: 1000, upi: 500 });
    expect(result.forecast.length).toBe(14);
    expect(result.hasEnoughData).toBe(false);
    result.forecast.forEach((entry) => {
      expect(entry.predictedBurn).toBe(0);
      expect(entry.projectedBalance).toBe(1500);
    });
  });

  it('returns hasEnoughData=false when fewer than 3 days have data', () => {
    const txs = [makeTx(100, 0), makeTx(200, 1)];
    const result = generateForecast(txs, { cash: 1000, upi: 0 });
    expect(result.hasEnoughData).toBe(false);
    expect(result.forecast.length).toBe(14);
  });

  it('returns hasEnoughData=true when 3+ days have data', () => {
    const txs = [
      makeTx(100, 0),
      makeTx(200, 1),
      makeTx(150, 2),
      makeTx(300, 3),
      makeTx(50, 4),
    ];
    const result = generateForecast(txs, { cash: 2000, upi: 500 });
    expect(result.hasEnoughData).toBe(true);
    expect(result.forecast.length).toBe(14);
  });

  it('forecast entries have correct shape', () => {
    const txs = [
      makeTx(100, 0),
      makeTx(200, 1),
      makeTx(150, 2),
      makeTx(300, 3),
    ];
    const result = generateForecast(txs, { cash: 1000, upi: 500 });
    result.forecast.forEach((entry) => {
      expect(entry).toHaveProperty('date');
      expect(entry).toHaveProperty('predictedBurn');
      expect(entry).toHaveProperty('projectedBalance');
      expect(typeof entry.predictedBurn).toBe('number');
      expect(typeof entry.projectedBalance).toBe('number');
    });
  });

  it('handles zero balances gracefully', () => {
    const txs = [makeTx(100, 0), makeTx(200, 1), makeTx(50, 2)];
    const result = generateForecast(txs, { cash: 0, upi: 0 });
    expect(result.forecast.length).toBe(14);
    expect(result.forecast[0].projectedBalance).toBeLessThanOrEqual(0);
  });

  it('handles very large expenses', () => {
    const txs = [
      makeTx(50000, 0),
      makeTx(30000, 1),
      makeTx(45000, 2),
      makeTx(60000, 3),
      makeTx(25000, 4),
    ];
    const result = generateForecast(txs, { cash: 100000, upi: 50000 });
    expect(result.hasEnoughData).toBe(true);
    expect(result.forecast.length).toBe(14);
    result.forecast.forEach((entry) => {
      expect(Number.isFinite(entry.predictedBurn)).toBe(true);
      expect(Number.isFinite(entry.projectedBalance)).toBe(true);
    });
  });

  it('filters out income transactions from forecast', () => {
    const txs = [
      makeTx(100, 0, 'expense'),
      makeTx(500, 0, 'income'),
      makeTx(200, 1, 'expense'),
      makeTx(300, 2, 'expense'),
      makeTx(150, 3, 'expense'),
    ];
    const result = generateForecast(txs, { cash: 5000, upi: 1000 });
    expect(result.hasEnoughData).toBe(true);
    result.forecast.forEach((entry) => {
      expect(entry.predictedBurn).toBeGreaterThanOrEqual(0);
    });
  });
});
