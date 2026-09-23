/**
 * Standard Encryption Utility (AES-256-GCM)
 * Complies with PRD S-11:
 * - Algoritma: AES-256-GCM (Authenticated Encryption with Associated Data)
 * - IV: 12-byte cryptographically secure random bytes
 * - Tag: 128-bit authentication tag (anti-padding oracle)
 * - Native Web Crypto API (SubtleCrypto)
 */

export interface EncryptedPayload {
  iv: string; // hex
  ciphertext: string; // hex
  tag?: string; // included in ciphertext for Web Crypto GCM
}

function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Derive a 256-bit CryptoKey from a secret passphrase or key string using SHA-256.
 */
async function deriveAesKey(secret: string): Promise<CryptoKey> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (subtle) is not available.');
  }

  const enc = new TextEncoder();
  const keyHash = await cryptoObj.subtle.digest('SHA-256', enc.encode(secret));

  return cryptoObj.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext string using AES-256-GCM with a unique 12-byte IV.
 */
export async function encryptData(plaintext: string, secretKey: string): Promise<EncryptedPayload> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (subtle) is not available.');
  }

  const key = await deriveAesKey(secretKey);
  const iv = cryptoObj.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();

  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    key,
    enc.encode(plaintext)
  );

  return {
    iv: bufferToHex(iv),
    ciphertext: bufferToHex(encryptedBuffer),
  };
}

/**
 * Decrypt AES-256-GCM payload with the secret key and authentication tag verification.
 */
export async function decryptData(payload: EncryptedPayload, secretKey: string): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (subtle) is not available.');
  }

  const key = await deriveAesKey(secretKey);
  const iv = hexToUint8Array(payload.iv);
  const ciphertextBytes = hexToUint8Array(payload.ciphertext);

  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as unknown as BufferSource,
      tagLength: 128,
    },
    key,
    ciphertextBytes as unknown as BufferSource
  );

  const dec = new TextDecoder();
  return dec.decode(decryptedBuffer);
}
