import crypto from "crypto";

// ENCRYPTION_KEY must be at least a 64-char hex string (32 bytes for AES-256)
const KEY = process.env.ENCRYPTION_KEY!.slice(0, 64);

export function encrypt(plaintext: string): { encryptedPassword: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(KEY, "hex"), iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return { encryptedPassword: encrypted, iv: iv.toString("hex") };
}

export function decrypt(encryptedPassword: string, iv: string): string {
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(KEY, "hex"),
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encryptedPassword, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
