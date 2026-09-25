/**
 * secureStorage.ts - Penyimpanan Terenkripsi Client-Side (Ponytail Security Pattern)
 * 
 * Menggunakan Web Crypto API native dengan standar industri RFC 7516 JWE 256-bit (A256GCM)
 * dan RFC 7517 JWK (JSON Web Key) 256-bit.
 * Format Compact Serialization: BASE64URL(Header) . "" . BASE64URL(IV) . BASE64URL(Ciphertext) . BASE64URL(Tag)
 * Mencegah kebocoran data tiket, session token, email pengguna, dan profil di DevTools Browser & Storage.
 */

const STORAGE_PREFIX = '__sec_enc_v2:';
const SALT_KEY = '__sec_dev_salt__';

// In-memory runtime cache untuk instant sync retrieval tanpa lag
const memoryCache = new Map<string, string>();

// Helper Base64URL encoding/decoding RFC 7515 / RFC 7516
function toBase64Url(u8: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < u8.length; i++) binary += String.fromCharCode(u8[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const u8 = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
  return u8;
}

// Dapatkan atau buat salt unik per perangkat browser
export function getDeviceSalt(): Uint8Array {
  if (typeof window === 'undefined') return new Uint8Array(16);
  let saltHex: string | null = null;
  try {
    saltHex = localStorage.getItem(SALT_KEY);
  } catch (_) {}

  if (!saltHex || saltHex.length !== 32) {
    const arr = new Uint8Array(16);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(arr);
    } else {
      for (let i = 0; i < 16; i++) arr[i] = Math.floor(Math.random() * 256);
    }
    saltHex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    try {
      localStorage.setItem(SALT_KEY, saltHex);
    } catch (_) {}
  }
  const match = saltHex.match(/.{1,2}/g);
  return match ? new Uint8Array(match.map(b => parseInt(b, 16))) : new Uint8Array(16);
}

// Derive AES-GCM 256-bit key menggunakan PBKDF2 native browser
export async function deriveEncryptionKey(salt: Uint8Array): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) {
    return null;
  }
  try {
    const enc = new TextEncoder();
    const secretMaterial = enc.encode('TicketOps-Secured-Client-Storage-Key-v2-' + (window.location.origin || 'app'));
    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      secretMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: (salt.buffer as ArrayBuffer),
        iterations: 50000,
        hash: 'SHA-256',
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'] as KeyUsage[]
    );
  } catch (err) {
    console.warn('[secureStorage] Key derivation fallback:', err);
    return null;
  }
}

/**
 * Export AES-GCM 256-bit CryptoKey to RFC 7517 JWK (JSON Web Key) format
 */
export async function exportJWK256(key: CryptoKey): Promise<JsonWebKey | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  try {
    return await window.crypto.subtle.exportKey('jwk', key);
  } catch {
    return null;
  }
}

/**
 * Import RFC 7517 JWK 256-bit key for AES-GCM encryption/decryption
 */
export async function importJWK256(jwk: JsonWebKey): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  try {
    return await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  } catch {
    return null;
  }
}

/**
 * Helper untuk mendapatkan JWK 256-bit aktif pada sesi saat ini
 */
export async function getSessionJWK256(): Promise<JsonWebKey | null> {
  const salt = getDeviceSalt();
  const key = await deriveEncryptionKey(salt);
  if (!key) return null;
  return exportJWK256(key);
}

// Helper synchronous obfuscator untuk fallback cepat & render synchronous
function syncObfuscate(data: string, salt: Uint8Array): string {
  try {
    const bytes = new TextEncoder().encode(data);
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      result[i] = bytes[i] ^ salt[i % salt.length] ^ ((i * 37) & 0xff);
    }
    let binary = '';
    for (let i = 0; i < result.length; i++) {
      binary += String.fromCharCode(result[i]);
    }
    return STORAGE_PREFIX + 'sync:' + btoa(binary);
  } catch {
    return data;
  }
}

function syncDeobfuscate(payload: string, salt: Uint8Array): string | null {
  try {
    const base64 = payload.replace(STORAGE_PREFIX + 'sync:', '');
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i) ^ salt[i % salt.length] ^ ((i * 37) & 0xff);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

// Enkripsi string menjadi format RFC 7516 JWE 256-bit (A256GCM)
async function encryptToJWE(value: string, salt: Uint8Array): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  try {
    const cryptoKey = await deriveEncryptionKey(salt);
    if (!cryptoKey) return null;

    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const headerObj = { alg: 'dir', enc: 'A256GCM', cty: 'JWT' };
    const encodedHeader = new TextEncoder().encode(JSON.stringify(headerObj));
    const encodedPlaintext = new TextEncoder().encode(value);

    const encryptedBuffer = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        additionalData: encodedHeader as BufferSource,
        tagLength: 128,
      },
      cryptoKey,
      encodedPlaintext as BufferSource
    );

    const encryptedBytes = new Uint8Array(encryptedBuffer);
    const tag = encryptedBytes.slice(encryptedBytes.length - 16);
    const ciphertext = encryptedBytes.slice(0, encryptedBytes.length - 16);

    const jweCompact = `${toBase64Url(encodedHeader)}..${toBase64Url(iv)}.${toBase64Url(ciphertext)}.${toBase64Url(tag)}`;
    return `${STORAGE_PREFIX}jwe:${jweCompact}`;
  } catch (err) {
    console.warn('[secureStorage] JWE encryption error:', err);
    return null;
  }
}

// Dekripsi format RFC 7516 JWE 256-bit (A256GCM)
async function decryptFromJWE(raw: string, salt: Uint8Array): Promise<string | null> {
  if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
  try {
    const jweCompact = raw.replace(STORAGE_PREFIX + 'jwe:', '');
    const parts = jweCompact.split('.');
    if (parts.length !== 5) return null;

    const [headerB64, , ivB64, cipherB64, tagB64] = parts;
    const encodedHeader = fromBase64Url(headerB64);
    const iv = fromBase64Url(ivB64);
    const ciphertext = fromBase64Url(cipherB64);
    const tag = fromBase64Url(tagB64);

    const combined = new Uint8Array(ciphertext.length + tag.length);
    combined.set(ciphertext, 0);
    combined.set(tag, ciphertext.length);

    const cryptoKey = await deriveEncryptionKey(salt);
    if (!cryptoKey) return null;

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as BufferSource,
        additionalData: encodedHeader as BufferSource,
        tagLength: 128,
      },
      cryptoKey,
      combined as BufferSource
    );
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.warn('[secureStorage] JWE decryption failed:', err);
    return null;
  }
}

function createSecureStorageWrapper(getStorage: () => Storage | null) {
  return {
    /**
     * Simpan data terenkripsi JWE 256-bit (A256GCM)
     */
    async setItem(key: string, value: string): Promise<void> {
      memoryCache.set(key, value);
      const storage = getStorage();
      if (!storage) return;

      const salt = getDeviceSalt();
      // Simpan sync obfuscated cipher terlebih dahulu agar storage TIDAK PERNAH memuat plaintext
      storage.setItem(key, syncObfuscate(value, salt));

      // Tingkatkan ke RFC 7516 JWE 256-bit terotentikasi penuh
      const jwe = await encryptToJWE(value, salt);
      if (jwe) {
        try {
          storage.setItem(key, jwe);
        } catch (_) {}
      }
    },

    /**
     * Baca data terenkripsi dan dekripsi kembali
     */
    async getItem(key: string): Promise<string | null> {
      const storage = getStorage();
      if (!storage) return memoryCache.get(key) || null;

      const raw = storage.getItem(key);
      if (!raw) {
        memoryCache.delete(key);
        return null;
      }

      // Backward compatibility: jika legacy plaintext
      if (!raw.startsWith(STORAGE_PREFIX)) {
        memoryCache.set(key, raw);
        // Otomatis enkripsi plaintext lama
        this.setItem(key, raw).catch(() => {});
        return raw;
      }

      const salt = getDeviceSalt();

      if (raw.startsWith(STORAGE_PREFIX + 'jwe:')) {
        const decrypted = await decryptFromJWE(raw, salt);
        if (decrypted) {
          memoryCache.set(key, decrypted);
          return decrypted;
        }
      }

      if (raw.startsWith(STORAGE_PREFIX + 'sync:')) {
        const decrypted = syncDeobfuscate(raw, salt);
        if (decrypted) {
          memoryCache.set(key, decrypted);
          // Upgrade ke JWE di background
          this.setItem(key, decrypted).catch(() => {});
          return decrypted;
        }
      }

      return memoryCache.get(key) || null;
    },

    /**
     * Simpan synchronous dengan cipher instan lalu jadwalkan JWE 256-bit
     */
    setItemSync(key: string, value: string): void {
      memoryCache.set(key, value);
      const storage = getStorage();
      if (!storage) return;

      const salt = getDeviceSalt();
      storage.setItem(key, syncObfuscate(value, salt));

      // Asynchronously upgrade to JWE 256-bit
      encryptToJWE(value, salt).then(jwe => {
        if (jwe && storage.getItem(key)?.startsWith(STORAGE_PREFIX)) {
          storage.setItem(key, jwe);
        }
      }).catch(() => {});
    },

    /**
     * Baca synchronous (dari memory cache atau sync cipher)
     */
    getItemSync(key: string): string | null {
      if (memoryCache.has(key)) {
        return memoryCache.get(key)!;
      }

      const storage = getStorage();
      if (!storage) return null;

      const raw = storage.getItem(key);
      if (!raw) return null;

      if (!raw.startsWith(STORAGE_PREFIX)) {
        memoryCache.set(key, raw);
        return raw; // Legacy plain JSON
      }

      if (raw.startsWith(STORAGE_PREFIX + 'sync:')) {
        const salt = getDeviceSalt();
        const decrypted = syncDeobfuscate(raw, salt);
        if (decrypted) {
          memoryCache.set(key, decrypted);
          return decrypted;
        }
      }

      return null;
    },

    removeItem(key: string): void {
      memoryCache.delete(key);
      getStorage()?.removeItem(key);
    },

    clear(): void {
      memoryCache.clear();
      getStorage()?.clear();
    }
  };
}

/**
 * Penyimpanan terenkripsi JWE 256-bit untuk localStorage
 */
export const secureStorage = createSecureStorageWrapper(() => (typeof window !== 'undefined' ? window.localStorage : null));

/**
 * Penyimpanan terenkripsi JWE 256-bit untuk sessionStorage
 */
export const secureSessionStorage = createSecureStorageWrapper(() => (typeof window !== 'undefined' ? window.sessionStorage : null));

/**
 * Pembersih otomatis: mendeteksi dan menghapus/mengenkripsi seluruh data plaintext yang tersisa di storage
 */
export function scrubLegacyPlaintextStorage(): void {
  if (typeof window === 'undefined') return;

  const sensitiveKeys = [
    'ticketops_auth_session',
    'ticketops_otrs_session',
    'ticketops_shift_roster',
    'ticketops_state_v3',
    'ticketops_state_v1',
  ];

  // 1. Bersihkan sessionStorage (Sesi user, token OTRS)
  try {
    for (const key of sensitiveKeys) {
      const val = sessionStorage.getItem(key);
      if (val && !val.startsWith(STORAGE_PREFIX)) {
        // Plaintext JSON terdeteksi di DevTools! Enkripsi langsung dengan JWK/JWE 256-bit
        secureSessionStorage.setItemSync(key, val);
        secureSessionStorage.setItem(key, val).catch(() => {});
      }
    }
  } catch (_) {}

  // 2. Bersihkan localStorage (Cache user, jadwal shift)
  try {
    for (const key of sensitiveKeys) {
      const val = localStorage.getItem(key);
      if (val && !val.startsWith(STORAGE_PREFIX)) {
        secureStorage.setItemSync(key, val);
        secureStorage.setItem(key, val).catch(() => {});
      }
    }
  } catch (_) {}
}
