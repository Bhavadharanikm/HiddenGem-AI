// AES-256-GCM credential encryption using Web Crypto API.
// Works in Node.js 18+ and Netlify Edge/Functions without any extra deps.
//
// If PMS_ENCRYPTION_KEY is not set, credentials are stored as plaintext.
// This lets the app run in dev without the key configured.

type Encrypted = { v: 1; iv: string; ct: string };

async function getKey(): Promise<CryptoKey | null> {
  const hex = process.env.PMS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) return null;
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function encryptCredentials(
  plain: Record<string, string>
): Promise<Record<string, string> | Encrypted> {
  const key = await getKey();
  if (!key) return plain; // no key configured — store plaintext

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(plain));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded.buffer as ArrayBuffer);
  return { v: 1, iv: b64(iv.buffer as ArrayBuffer), ct: b64(ct) };
}

export async function decryptCredentials(stored: unknown): Promise<Record<string, string>> {
  if (!stored || typeof stored !== "object") return {};
  const obj = stored as Record<string, unknown>;

  // Encrypted envelope
  if (obj.v === 1 && typeof obj.iv === "string" && typeof obj.ct === "string") {
    const key = await getKey();
    if (!key) throw new Error("PMS_ENCRYPTION_KEY is not set but credentials are encrypted");
    const ivBuf = unb64(obj.iv).buffer.slice(0) as ArrayBuffer;
    const ctBuf = unb64(obj.ct).buffer.slice(0) as ArrayBuffer;
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBuf }, key, ctBuf);
    return JSON.parse(new TextDecoder().decode(plain));
  }

  // Legacy plaintext — return as-is (will be re-encrypted on next save)
  return stored as Record<string, string>;
}

// Single-value helpers for OAuth/API tokens stored in text columns
export async function encryptToken(token: string): Promise<string> {
  const result = await encryptCredentials({ t: token });
  if ("v" in result) return JSON.stringify(result);
  return token; // no key — store plaintext
}

export async function decryptToken(stored: string): Promise<string> {
  if (!stored) return stored;
  try {
    const parsed = JSON.parse(stored);
    if (parsed && typeof parsed === "object" && parsed.v === 1) {
      const creds = await decryptCredentials(parsed);
      return creds.t ?? stored;
    }
  } catch {
    // not a JSON envelope — plaintext token
  }
  return stored;
}
