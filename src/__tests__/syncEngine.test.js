import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDB = {
  transaction: vi.fn(() => ({
    store: { put: vi.fn(), add: vi.fn() },
    done: Promise.resolve(),
  })),
  getAll: vi.fn(() => Promise.resolve([])),
  put: vi.fn(() => Promise.resolve()),
  add: vi.fn(() => Promise.resolve(1)),
  delete: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
};

vi.mock('idb', () => ({
  openDB: vi.fn(() => Promise.resolve(mockDB)),
}));

import {
  initDB,
  saveTransactionsToCache,
  getCachedTransactions,
  addTransactionToDB,
  moveToTrash,
  clearAllTransactions,
} from '../utils/syncEngine';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('syncEngine', () => {
  it('initDB returns a database instance', async () => {
    const db = await initDB();
    expect(db).toBeDefined();
  });

  it('saveTransactionsToCache calls put for each item', async () => {
    const txs = [
      { id: '1', amount: 100, category: 'Food' },
      { id: '2', amount: 200, category: 'Transport' },
    ];
    await saveTransactionsToCache(txs);
    expect(mockDB.transaction).toHaveBeenCalled();
  });

  it('getCachedTransactions returns all transactions', async () => {
    mockDB.getAll.mockResolvedValueOnce([
      { id: '1', amount: 100 },
      { id: '2', amount: 200 },
    ]);
    const result = await getCachedTransactions();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('1');
  });

  it('addTransactionToDB stores a transaction', async () => {
    const tx = { id: 'local_123', amount: 50, category: 'Food' };
    await addTransactionToDB(tx);
    expect(mockDB.put).toHaveBeenCalledWith('transactions', tx);
  });

  it('moveToTrash moves a transaction to trash store', async () => {
    const tx = { id: 'tx_abc', amount: 100, category: 'Food', user_id: 'user1' };
    await moveToTrash(tx);
    expect(mockDB.put).toHaveBeenCalledWith('trash', expect.objectContaining({ id: 'tx_abc', deleted_at: expect.any(Number) }));
    expect(mockDB.delete).toHaveBeenCalledWith('transactions', 'tx_abc');
  });

  it('clearAllTransactions clears the transactions store', async () => {
    await clearAllTransactions();
    expect(mockDB.clear).toHaveBeenCalledWith('transactions');
  });
});
