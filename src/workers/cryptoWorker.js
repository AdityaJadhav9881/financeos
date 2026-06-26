import CryptoJS from 'crypto-js';

const VAULT_KEY = 'f1n4nc30s_v4ult_3ncrypt10n_k3y_2024!';

self.onmessage = function (e) {
  const { id, action, data } = e.data;

  try {
    if (action === 'encrypt') {
      const jsonStr = JSON.stringify(data);
      const encrypted = CryptoJS.AES.encrypt(jsonStr, VAULT_KEY).toString();
      self.postMessage({ id, result: encrypted });
    } else if (action === 'decrypt') {
      const bytes = CryptoJS.AES.decrypt(data, VAULT_KEY);
      const jsonStr = bytes.toString(CryptoJS.enc.Utf8);
      if (!jsonStr) throw new Error('Decryption failed: invalid key or corrupted data');
      const decrypted = JSON.parse(jsonStr);
      self.postMessage({ id, result: decrypted });
    } else {
      throw new Error(`Unknown action: ${action}`);
    }
  } catch (err) {
    self.postMessage({ id, error: err.message });
  }
};
