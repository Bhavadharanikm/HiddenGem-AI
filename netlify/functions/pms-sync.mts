import type { Config } from "@netlify/functions";

export default async function handler() {
  const baseUrl = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL;
  const secret = process.env.CRON_SECRET;

  if (!baseUrl || !secret) {
    console.error("[pms-sync] Missing URL or CRON_SECRET env vars");
    return;
  }

  const res = await fetch(`${baseUrl}/api/v1/cron/pms-sync`, {
    headers: { Authorization: `Bearer ${secret}` },
  });

  const body = await res.json().catch(() => ({}));
  console.log(`[pms-sync] status=${res.status}`, body);
}

export const config: Config = {
  schedule: "0 */4 * * *", // every 4 hours
};
