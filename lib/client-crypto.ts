// All crypto runs in the browser — the server never sees plaintext passwords.
// Key derivation: PBKDF2-SHA256 (600k iterations) → AES-256-GCM

const SESSION_KEY = "wp_k";
const PBKDF2_ITERATIONS = 600_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function b64ToBytes(b64: string): Uint8Array {
  return new Uint8Array(
    atob(b64)
      .split("")
      .map((c) => c.charCodeAt(0))
  );
}

// ── Key derivation ────────────────────────────────────────────────────────────

export function generateSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToB64(bytes);
}

export async function deriveKey(password: string, saltB64: string): Promise<CryptoKey> {
  const raw = new TextEncoder().encode(password);
  const salt = b64ToBytes(saltB64);

  const material = await crypto.subtle.importKey("raw", raw, "PBKDF2", false, ["deriveKey"]);

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    true, // exportable so we can persist in sessionStorage
    ["encrypt", "decrypt"]
  );
}

// ── Session key storage ───────────────────────────────────────────────────────

export async function storeSessionKey(key: CryptoKey): Promise<void> {
  const raw = await crypto.subtle.exportKey("raw", key);
  sessionStorage.setItem(SESSION_KEY, bytesToB64(new Uint8Array(raw)));
}

export async function getSessionKey(): Promise<CryptoKey | null> {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  try {
    return crypto.subtle.importKey(
      "raw",
      b64ToBytes(stored),
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
  } catch {
    return null;
  }
}

export function clearSessionKey(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

export async function encryptText(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    ciphertext: bytesToB64(new Uint8Array(encrypted)),
    iv: bytesToB64(iv),
  };
}

export async function decryptText(
  ciphertext: string,
  ivB64: string,
  key: CryptoKey
): Promise<string> {
  const iv = b64ToBytes(ivB64);
  const data = b64ToBytes(ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(decrypted);
}
