/**
 * Password Hashing & Verification Module
 * Standard: PBKDF2 with SHA-256, 100,000 iterations, 16-byte random salt.
 * Built entirely on standard Web Crypto API (SubtleCrypto) supported natively
 * in modern browsers, Node.js 18+, and Capacitor mobile runtimes.
 */

const ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';
const KEY_LEN_BYTES = 32;

/**
 * Constant-time comparison for two byte arrays / hex strings to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
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
 * Hash a plaintext password with PBKDF2-SHA256 and a cryptographically secure random salt.
 * Format: pbkdf2$sha256$<iterations>$<saltHex>$<hashHex>
 */
export async function hashPassword(password: string): Promise<string> {
  const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
  if (!cryptoObj || !cryptoObj.subtle) {
    throw new Error('Web Crypto API (subtle) is not available in this environment.');
  }

  const enc = new TextEncoder();
  const salt = cryptoObj.getRandomValues(new Uint8Array(16));

  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const derivedBits = await cryptoObj.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATIONS,
      hash: HASH_ALGO,
    },
    keyMaterial,
    KEY_LEN_BYTES * 8
  );

  const saltHex = bufferToHex(salt);
  const hashHex = bufferToHex(derivedBits);

  return `pbkdf2$sha256$${ITERATIONS}$${saltHex}$${hashHex}`;
}

/**
 * Verify a plaintext password against a stored hash string.
 * Supports:
 * - Standard PBKDF2 hash: `pbkdf2$sha256$<iterations>$<saltHex>$<hashHex>`
 * - Legacy unhashed fallback: gracefully detects and validates legacy records during migration
 */
export async function verifyPassword(password: string, storedHash?: string | null): Promise<boolean> {
  if (!password || !storedHash) return false;

  if (storedHash.startsWith('pbkdf2$sha256$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 5) return false;

    const iterations = parseInt(parts[2], 10);
    const saltHex = parts[3];
    const targetHashHex = parts[4];

    if (!iterations || !saltHex || !targetHashHex) return false;

    const cryptoObj = typeof window !== 'undefined' ? window.crypto : globalThis.crypto;
    if (!cryptoObj || !cryptoObj.subtle) return false;

    try {
      const enc = new TextEncoder();
      const salt = hexToUint8Array(saltHex);
      const keyMaterial = await cryptoObj.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
      );

      const derivedBits = await cryptoObj.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt as unknown as BufferSource,
          iterations,
          hash: HASH_ALGO,
        },
        keyMaterial,
        targetHashHex.length * 4
      );

      const computedHashHex = bufferToHex(derivedBits);
      return constantTimeEqual(computedHashHex, targetHashHex);
    } catch {
      return false;
    }
  }

  // Fallback for legacy plaintext password in DB during migration
  return constantTimeEqual(password, storedHash);
}
