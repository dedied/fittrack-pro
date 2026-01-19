
// ==========================================
// SECURE STORAGE UTILITY
// Handles IndexedDB and Web Crypto API for
// secure, on-device session storage.
// ==========================================

const DB_NAME = 'FitTrackSecureDB';
const DB_VERSION = 2; 
const STORE_NAME = 'secureStore';
const SESSION_KEY = 'encryptedSession';
const LOCK_KEY = 'appLockVerification'; 
const BIO_KEY = 'biometricPin';

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
const bufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToBuffer = (base64: string) => {
  try {
    return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  } catch (e) {
    return new Uint8Array(0);
  }
};

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

const encryptData = async (pin: string, dataStr: string) => {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const key = await deriveKey(pin, salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const buffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      textEncoder.encode(dataStr)
    );
    return {
        encrypted: bufferToBase64(buffer),
        salt: bufferToBase64(salt),
        iv: bufferToBase64(iv)
    };
};

const decryptData = async (pin: string, encryptedBase64: string, saltBase64: string, ivBase64: string) => {
      const salt = base64ToBuffer(saltBase64);
      const iv = base64ToBuffer(ivBase64);
      const encrypted = base64ToBuffer(encryptedBase64);
      
      const key = await deriveKey(pin, salt);
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return textDecoder.decode(decryptedBuffer);
};

// --- Public API ---

export const secureStore = {
  async set(pin: string, session: object | null): Promise<void> {
    const lockData = await encryptData(pin, 'VALID');
    await dbAction('put', LOCK_KEY, { key: LOCK_KEY, ...lockData });

    if (session) {
        const sessionData = await encryptData(pin, JSON.stringify(session));
        await dbAction('put', SESSION_KEY, { key: SESSION_KEY, ...sessionData });
    } else {
        await dbAction('delete', SESSION_KEY);
    }
  },

  async verify(pin: string): Promise<boolean> {
     const lockEntry = await dbAction('get', LOCK_KEY);
     if (lockEntry) {
         try {
             const result = await decryptData(pin, lockEntry.encrypted, lockEntry.salt, lockEntry.iv);
             return result === 'VALID';
         } catch { return false; }
     }

     const sessionEntry = await dbAction('get', SESSION_KEY);
     if (sessionEntry) {
         try {
             await decryptData(pin, sessionEntry.encryptedToken || sessionEntry.encrypted, sessionEntry.salt, sessionEntry.iv);
             return true; 
         } catch { return false; }
     }

     return false;
  },
  
  async get(pin: string): Promise<object | null> {
    const data = await dbAction('get', SESSION_KEY);
    if (!data) return null;
    
    try {
      const encrypted = data.encryptedToken || data.encrypted;
      const decryptedStr = await decryptData(pin, encrypted, data.salt, data.iv);
      return JSON.parse(decryptedStr);
    } catch (e) {
      return null;
    }
  },

  async removeSession(): Promise<void> {
      await dbAction('delete', SESSION_KEY);
  },

  async isPinSet(): Promise<boolean> {
    const lock = await dbAction('get', LOCK_KEY);
    const session = await dbAction('get', SESSION_KEY);
    return !!lock || !!session;
  },
  
  async clear(): Promise<void> {
    await dbAction('delete', SESSION_KEY);
    await dbAction('delete', LOCK_KEY);
    await dbAction('delete', BIO_KEY);
  },

  async enableBiometrics(pin: string): Promise<boolean> {
    if (!window.PublicKeyCredential) return false;
    
    try {
       const challenge = new Uint8Array(32);
       window.crypto.getRandomValues(challenge);
       
       const userId = new Uint8Array(16);
       window.crypto.getRandomValues(userId);

       const credential = await navigator.credentials.create({
         publicKey: {
           challenge,
           rp: { name: "FitTrack Pro" },
           user: {
             id: userId,
             name: `user_${Date.now()}`,
             displayName: "FitTrack User"
           },
           pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
           authenticatorSelection: { 
             authenticatorAttachment: 'platform',
             userVerification: "required" 
           },
           timeout: 60000,
           attestation: 'none'
         }
       }) as PublicKeyCredential;
       
       if (!credential) return false;

       const credentialId = bufferToBase64(credential.rawId);
       await dbAction('put', BIO_KEY, { key: BIO_KEY, pin, credentialId });
       return true;
    } catch (e) {
       console.error("Biometric setup failed", e);
       throw e;
    }
  },

  async disableBiometrics() {
    await dbAction('delete', BIO_KEY);
  },

  async getBiometricPin(): Promise<string | null> {
     const data = await dbAction('get', BIO_KEY);
     if (!data || !data.pin || !data.credentialId) return null;

     try {
       const challenge = new Uint8Array(32);
       window.crypto.getRandomValues(challenge);
       const credentialIdBuffer = base64ToBuffer(data.credentialId);

       await navigator.credentials.get({
         publicKey: {
           challenge,
           allowCredentials: [{
             id: credentialIdBuffer,
             type: 'public-key'
           }],
           userVerification: "required",
           timeout: 60000
         }
       });
       
       return data.pin;
     } catch (e) {
       console.error("Biometric auth failed", e);
       return null;
     }
  },

  async hasBiometrics(): Promise<boolean> {
     const data = await dbAction('get', BIO_KEY);
     return !!data && !!data.credentialId;
  }
};
