import { openDB } from 'idb';

const DB_NAME = 'FinanceOS_DB';
const DB_VERSION = 4;
const TRASH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

let dbPromise = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          if (!db.objectStoreNames.contains('transactions')) {
            const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
            txStore.createIndex('user_id', 'user_id');
            txStore.createIndex('created_at', 'created_at');
          }
        }
        if (!db.objectStoreNames.contains('trash')) {
          const trashStore = db.createObjectStore('trash', { keyPath: 'id' });
          trashStore.createIndex('user_id', 'user_id');
          trashStore.createIndex('deleted_at', 'deleted_at');
        }
        if (db.objectStoreNames.contains('syncQueue')) {
          db.deleteObjectStore('syncQueue');
        }
        if (db.objectStoreNames.contains('deleteQueue')) {
          db.deleteObjectStore('deleteQueue');
        }
      },
    });
  }
  return dbPromise;
}

export async function initDB() {
  return getDB();
}

export async function saveTransactionsToCache(txList) {
  try {
    const db = await getDB();
    const tx = db.transaction('transactions', 'readwrite');
    for (const item of txList) {
      await tx.store.put(item);
    }
    await tx.done;
  } catch (err) {
    console.error('saveTransactionsToCache failed:', err);
    throw err;
  }
}

export async function getCachedTransactions() {
  try {
    const db = await getDB();
    return await db.getAll('transactions');
  } catch (err) {
    console.error('getCachedTransactions failed:', err);
    throw err;
  }
}

export async function addTransactionToDB(transaction) {
  try {
    const db = await getDB();
    await db.put('transactions', transaction);
    return transaction;
  } catch (err) {
    console.error('addTransactionToDB failed:', err);
    throw err;
  }
}

export async function clearAllTransactions() {
  try {
    const db = await getDB();
    await db.clear('transactions');
  } catch (err) {
    console.error('clearAllTransactions failed:', err);
    throw err;
  }
}

export async function moveToTrash(transaction) {
  try {
    const db = await getDB();
    const trashed = { ...transaction, deleted_at: Date.now() };
    await db.put('trash', trashed);
    await db.delete('transactions', transaction.id);
  } catch (err) {
    console.error('moveToTrash failed:', err);
    throw err;
  }
}

export async function getTrashedTransactions() {
  try {
    const db = await getDB();
    return await db.getAll('trash');
  } catch (err) {
    console.error('getTrashedTransactions failed:', err);
    throw err;
  }
}

export async function restoreFromTrash(transactionId) {
  try {
    const db = await getDB();
    const item = await db.get('trash', transactionId);
    if (!item) return null;
    const { deleted_at, ...original } = item;
    await db.put('transactions', original);
    await db.delete('trash', transactionId);
    return original;
  } catch (err) {
    console.error('restoreFromTrash failed:', err);
    throw err;
  }
}

export async function permanentlyDeleteFromTrash(transactionId) {
  try {
    const db = await getDB();
    await db.delete('trash', transactionId);
  } catch (err) {
    console.error('permanentlyDeleteFromTrash failed:', err);
    throw err;
  }
}

export async function purgeExpiredTrash() {
  try {
    const db = await getDB();
    const all = await db.getAll('trash');
    const now = Date.now();
    const tx = db.transaction('trash', 'readwrite');
    for (const item of all) {
      if (now - item.deleted_at > TRASH_TTL_MS) {
        await tx.store.delete(item.id);
      }
    }
    await tx.done;
  } catch {}
}

export async function clearAllTrashedTransactions() {
  try {
    const db = await getDB();
    await db.clear('trash');
  } catch (err) {
    console.error('clearAllTrashedTransactions failed:', err);
    throw err;
  }
}

export async function atomicRestoreTransactions(txList) {
  const db = await getDB();
  const tx = db.transaction('transactions', 'readwrite');
  await tx.store.clear();
  for (const item of txList) {
    await tx.store.put(item);
  }
  await tx.done;
}

export async function atomicRestoreTrash(trashList) {
  const db = await getDB();
  const tx = db.transaction('trash', 'readwrite');
  await tx.store.clear();
  for (const item of trashList) {
    await tx.store.put(item);
  }
  await tx.done;
}
