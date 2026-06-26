import CryptoJS from 'crypto-js';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import StoragePermission from './storagePermission';
import {
  getCachedTransactions,
  getTrashedTransactions,
  initDB,
  atomicRestoreTransactions,
  atomicRestoreTrash,
} from './syncEngine';

const VAULT_KEY = 'f1n4nc30s_v4ult_3ncrypt10n_k3y_2024!';
const VAULT_FILE = 'vault.enc';
const EXCLUDED_KEYS = ['appLock_pinHash', 'appLock_attempts', 'appLock_lockoutUntil'];

let debounceTimer = null;
let isExporting = false;
let pendingExport = null;
let restoreInProgress = false;

function encryptData(data) {
  return CryptoJS.AES.encrypt(JSON.stringify(data), VAULT_KEY).toString();
}

export function decryptData(ciphertext) {
  if (!ciphertext || typeof ciphertext !== 'string') {
    throw new Error('Invalid ciphertext: not a string');
  }
  const bytes = CryptoJS.AES.decrypt(ciphertext, VAULT_KEY);
  const jsonStr = bytes.toString(CryptoJS.enc.Utf8);
  if (!jsonStr) throw new Error('Decryption failed: empty result');
  return JSON.parse(jsonStr);
}

function collectVaultData(userId) {
  const localStorageData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!EXCLUDED_KEYS.includes(key)) {
      localStorageData[key] = localStorage.getItem(key);
    }
  }
  return { localStorage: localStorageData, exportedAt: new Date().toISOString(), userId };
}

async function ensureStoragePermission() {
  if (!Capacitor.isNativePlatform()) return true;
  if (Capacitor.getPlatform() !== 'android') return true;

  try {
    const check = await StoragePermission.checkPermission();
    if (check.granted) return true;
    const result = await StoragePermission.requestPermission();
    return result.granted;
  } catch {
    return false;
  }
}

export async function exportToVault(userId, { onPermissionDenied } = {}) {
  if (!Capacitor.isNativePlatform()) return;
  if (restoreInProgress) return;

  if (isExporting) {
    pendingExport = { userId, onPermissionDenied };
    return;
  }
  isExporting = true;

  try {
    const hasPermission = await ensureStoragePermission();
    if (!hasPermission) {
      if (onPermissionDenied) onPermissionDenied();
      return;
    }

    const transactions = await getCachedTransactions();
    const trash = await getTrashedTransactions();
    const localData = collectVaultData(userId);
    const payload = { ...localData, transactions, trash };
    const encrypted = encryptData(payload);

    try {
      await Filesystem.writeFile({
        path: VAULT_FILE,
        data: encrypted,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    } catch {
      if (onPermissionDenied) onPermissionDenied();
    }

    try {
      await Filesystem.writeFile({
        path: VAULT_FILE,
        data: encrypted,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
        recursive: true,
      });
    } catch {}
  } catch (err) {
    console.error('Vault export failed:', err);
  } finally {
    isExporting = false;
    if (pendingExport) {
      const next = pendingExport;
      pendingExport = null;
      exportToVault(next.userId, next);
    }
  }
}

export function exportToVaultDebounced(userId, delayMs = 3000, options = {}) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    exportToVault(userId, options);
  }, delayMs);
}

export function exportToVaultImmediate(userId) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  exportToVault(userId);
}

export function cancelPendingExport() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = null;
  pendingExport = null;
}

export async function restoreFromVault({ onPermissionDenied } = {}) {
  if (!Capacitor.isNativePlatform()) return { restored: false };

  restoreInProgress = true;
  if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }

  try {
    const hasPermission = await ensureStoragePermission();
    if (!hasPermission) {
      if (onPermissionDenied) onPermissionDenied();
      return { restored: false };
    }

    try {
      const result = await Filesystem.readFile({
        path: VAULT_FILE,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      const restoreResult = await decryptAndRestore(result.data);
      if (restoreResult.restored) {
        try {
          await Filesystem.writeFile({
            path: VAULT_FILE,
            data: result.data,
            directory: Directory.Data,
            encoding: Encoding.UTF8,
            recursive: true,
          });
        } catch {}
      }
      return restoreResult;
    } catch {}

    try {
      const result = await Filesystem.readFile({
        path: VAULT_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return await decryptAndRestore(result.data);
    } catch {}

    return { restored: false };
  } finally {
    restoreInProgress = false;
  }
}

async function decryptAndRestore(data) {
  try {
    const decrypted = decryptData(data);

    if (decrypted.localStorage) {
      for (const [key, value] of Object.entries(decrypted.localStorage)) {
        localStorage.setItem(key, value);
      }
    }

    await initDB();

    if (decrypted.transactions && decrypted.transactions.length > 0) {
      await atomicRestoreTransactions(decrypted.transactions);
    }

    if (decrypted.trash && decrypted.trash.length > 0) {
      await atomicRestoreTrash(decrypted.trash);
    }

    return { restored: true, transactionCount: decrypted.transactions?.length || 0 };
  } catch (err) {
    console.error('Vault decrypt/restore failed:', err);
    return { restored: false, error: err.message };
  }
}

export async function isLocalDBEmpty(userId) {
  try {
    await initDB();
    const transactions = await getCachedTransactions();
    const userTx = transactions.filter((t) => t.user_id === userId);
    return userTx.length === 0;
  } catch {
    return true;
  }
}

export async function hasVaultFile() {
  try {
    restoreInProgress = true;
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
    await ensureStoragePermission();
    await Filesystem.stat({ path: VAULT_FILE, directory: Directory.Documents });
    return true;
  } catch {
    return false;
  }
}

export async function readVaultPayload() {
  try {
    restoreInProgress = true;
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }

    const hasPermission = await ensureStoragePermission();
    if (!hasPermission) return null;

    try {
      const result = await Filesystem.readFile({
        path: VAULT_FILE,
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      return decryptData(result.data);
    } catch {}

    try {
      const result = await Filesystem.readFile({
        path: VAULT_FILE,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return decryptData(result.data);
    } catch {}

    return null;
  } catch {
    return null;
  }
}

export function unlockVaultExport() {
  restoreInProgress = false;
}

export async function archiveVault() {
  try {
    const hasPermission = await ensureStoragePermission();
    if (!hasPermission) return null;

    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0'),
      String(now.getSeconds()).padStart(2, '0'),
    ].join('');
    const archiveName = `vault_${ts}.enc`;

    try {
      await Filesystem.rename({
        from: VAULT_FILE,
        to: archiveName,
        directory: Directory.Documents,
      });
      return archiveName;
    } catch {
      try {
        const result = await Filesystem.readFile({
          path: VAULT_FILE,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
        });
        await Filesystem.writeFile({
          path: archiveName,
          data: result.data,
          directory: Directory.Documents,
          encoding: Encoding.UTF8,
          recursive: true,
        });
        await Filesystem.deleteFile({ path: VAULT_FILE, directory: Directory.Documents });
        return archiveName;
      } catch {
        return null;
      }
    }
  } catch {
    return null;
  }
}

export function mergeVaultPayloads(existing, imported) {
  const existingTxMap = new Map();
  for (const tx of (existing?.transactions || [])) {
    existingTxMap.set(tx.id, tx);
  }
  for (const tx of (imported?.transactions || [])) {
    existingTxMap.set(tx.id, tx);
  }

  const existingTrashMap = new Map();
  for (const tx of (existing?.trash || [])) {
    existingTrashMap.set(tx.id, tx);
  }
  for (const tx of (imported?.trash || [])) {
    existingTrashMap.set(tx.id, tx);
  }

  const mergedLocalStorage = { ...(existing?.localStorage || {}), ...(imported?.localStorage || {}) };

  return {
    localStorage: mergedLocalStorage,
    transactions: Array.from(existingTxMap.values()),
    trash: Array.from(existingTrashMap.values()),
    exportedAt: new Date().toISOString(),
  };
}

export async function restorePayload(payload) {
  try {
    if (payload.localStorage) {
      for (const [key, value] of Object.entries(payload.localStorage)) {
        localStorage.setItem(key, value);
      }
    }

    await initDB();

    if (payload.transactions && payload.transactions.length > 0) {
      await atomicRestoreTransactions(payload.transactions);
    }

    if (payload.trash && payload.trash.length > 0) {
      await atomicRestoreTrash(payload.trash);
    }

    return { restored: true, transactionCount: payload.transactions?.length || 0 };
  } catch (err) {
    return { restored: false, error: err.message };
  }
}
