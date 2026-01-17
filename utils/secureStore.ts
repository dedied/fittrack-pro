// ==========================================
// SECURE STORAGE UTILITY
// Handles IndexedDB and Web Crypto API for
// secure, on-device session storage.
// ==========================================

const DB_NAME = 'FitTrackSecureDB';
const DB_VERSION = 1;
const STORE_NAME = 'secureStore';
const SESSION_KEY = 'encryptedSession';

// --- IndexedDB Helpers ---

let dbPromise: Promise<IDBDatabase> | null = null;

const getDB = (): Promise<IDBDatabase> => {
  if (dbPromise) {
    return dbPromise;
  }
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
  return dbPromise;
};

const dbAction = (type: 'get' | 'put' | 'delete', key: string, value?: any): Promise<any> => {
  return getDB().then(db => new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, type === 'get' ? 'readonly' : 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = type === 'get' ? store.get(key) : type === 'put' ? store.put(value) : store.delete(key);
    transaction.oncomplete = () => resolve(request.result);
    transaction.onerror = () => reject(transaction.error);
  }));
};

// --- Base64 Helpers ---
const bufferToBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
// FIX: Changed function to return Uint8Array instead of ArrayBuffer to match the type expected by `deriveKey`.
const base64ToBuffer = (base64: string) => Uint8Array.from(atob(base64), c => c.charCodeAt(0));

// --- Crypto Helpers ---

const PBKDF2_ITERATIONS = 200000;
const SALT_LENGTH = 16;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const deriveKey = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    textEncoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
};

// --- Public API ---

export interface EncryptedData {
  encryptedToken: string;
  salt: string;
  iv: string;
}

export const secureStore = {
  async set(pin: string, session: object): Promise<void> {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await deriveKey(pin, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encryptedTokenBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      textEncoder.encode(JSON.stringify(session))
    );
    
    await dbAction('put', SESSION_KEY, {
      key: SESSION_KEY,
      encryptedToken: bufferToBase64(encryptedTokenBuffer),
      salt: bufferToBase64(salt),
      iv: bufferToBase64(iv),
    });
  },
  
  async get(pin: string): Promise<object | null> {
    const data = await dbAction('get', SESSION_KEY);
    if (!data) return null;
    
    try {
      const salt = base64ToBuffer(data.salt);
      const iv = base64ToBuffer(data.iv);
      const encryptedToken = base64ToBuffer(data.encryptedToken);
      
      const key = await deriveKey(pin, salt);
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encryptedToken
      );
      
      return JSON.parse(textDecoder.decode(decryptedBuffer));
    } catch (e) {
      console.error("Decryption failed:", e);
      return null;
    }
  },

  async isPinSet(): Promise<boolean> {
    const data = await dbAction('get', SESSION_KEY);
    return !!data;
  },
  
  async clear(): Promise<void> {
    await dbAction('delete', SESSION_KEY);
  },
};
