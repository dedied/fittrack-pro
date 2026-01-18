
// ==========================================
// SECURE STORAGE UTILITY
// Handles IndexedDB and Web Crypto API for
// secure, on-device session storage.
// ==========================================

const DB_NAME = 'FitTrackSecureDB';
const DB_VERSION = 2; // Incremented for schema update if needed (though object store is dynamic)
const STORE_NAME = 'secureStore';
const SESSION_KEY = 'encryptedSession';
const LOCK_KEY = 'appLockVerification'; // New key for independent lock verification
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
    // 1. Always set the Lock Verification key
    // This allows verifying the PIN even if no session exists (Guest mode)
    const lockData = await encryptData(pin, 'VALID');
    await dbAction('put', LOCK_KEY, { key: LOCK_KEY, ...lockData });

    // 2. Set Session if provided
    if (session) {
        const sessionData = await encryptData(pin, JSON.stringify(session));
        await dbAction('put', SESSION_KEY, { key: SESSION_KEY, ...sessionData });
    } else {
        // Ensure no stale session lingers if setting lock as guest
        await dbAction('delete', SESSION_KEY);
    }
  },

  async verify(pin: string): Promise<boolean> {
     // 1. Try independent Lock Key first
     const lockEntry = await dbAction('get', LOCK_KEY);
     if (lockEntry) {
         try {
             const result = await decryptData(pin, lockEntry.encrypted, lockEntry.salt, lockEntry.iv);
             return result === 'VALID';
         } catch { return false; }
     }

     // 2. Fallback: Migration for existing users (Check Session Key)
     const sessionEntry = await dbAction('get', SESSION_KEY);
     if (sessionEntry) {
         try {
             await decryptData(pin, sessionEntry.encryptedToken, sessionEntry.salt, sessionEntry.iv);
             // If successful, we can implicitly trust the PIN. 
             // Ideally we should migrate here, but let's just return true.
             return true; 
         } catch { return false; }
     }

     return false;
  },
  
  // Legacy getter: now just retrieves session, assumes PIN is verified or checks implicitly
  async get(pin: string): Promise<object | null> {
    const data = await dbAction('get', SESSION_KEY);
    if (!data) return null;
    
    try {
      // Handle legacy format vs new format if needed (legacy used specific field names)
      // Legacy structure: { encryptedToken, salt, iv } matches our new helper output structure roughly?
      // Our helper encryptData outputs { encrypted, salt, iv }
      // Existing code wrote { encryptedToken, salt, iv }
      
      const encrypted = data.encryptedToken || data.encrypted;
      const decryptedStr = await decryptData(pin, encrypted, data.salt, data.iv);
      return JSON.parse(decryptedStr);
    } catch (e) {
      console.error("Decryption failed:", e);
      return null;
    }
  },

  async removeSession(): Promise<void> {
      await dbAction('delete', SESSION_KEY);
  },

  async isPinSet(): Promise<boolean> {
    // Check either key to support migration
    const lock = await dbAction('get', LOCK_KEY);
    const session = await dbAction('get', SESSION_KEY);
    return !!lock || !!session;
  },
  
  async clear(): Promise<void> {
    await dbAction('delete', SESSION_KEY);
    await dbAction('delete', LOCK_KEY);
    await dbAction('delete', BIO_KEY);
  },

  // --- Biometrics Additions ---

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
       return false;
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
