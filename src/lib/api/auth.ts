import { getServiceClient } from "@/lib/supabase/service";
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

export type AuthContext = {
  tenantId: string;
  scopes: string[];
  keyId: string;
};

// Web Crypto API — works in both Edge and Node.js 18+
async function sha256hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

let _ratelimit: Ratelimit | null = null;

function getRatelimiter(limit: number): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  if (!_ratelimit) {
    _ratelimit = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      }),
      limiter: Ratelimit.slidingWindow(limit, "60 s"),
      prefix: "hgm_rl",
    });
  }
  return _ratelimit;
}

export async function validateApiKey(
  req: NextRequest
): Promise<AuthContext | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey.startsWith("hgm_")) return null;

  const keyHash = await sha256hex(rawKey);
  const db = getServiceClient();

  const { data } = await db.rpc("resolve_api_key", { p_key_hash: keyHash });
  if (!data || data.length === 0) return null;

  const { tenant_id, scopes, rate_limit, key_id } = data[0] as {
    tenant_id: string;
    scopes: string[];
    rate_limit: number;
    key_id: string;
  };

  const limiter = getRatelimiter(rate_limit);
  if (limiter) {
    const { success } = await limiter.limit(key_id);
    if (!success) return null;
  }

  return { tenantId: tenant_id, scopes, keyId: key_id };
}

export function requireScope(ctx: AuthContext, scope: string): boolean {
  return ctx.scopes.includes(scope) || ctx.scopes.includes("*");
}
