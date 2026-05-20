const API_VERSION = "v19.0";
const GRAPH_URL = `https://graph.facebook.com/${API_VERSION}`;
const REDIRECT_URI =
  process.env.META_REDIRECT_URI ??
  "http://localhost:3000/api/v1/meta-ads/callback";

const SCOPES = [
  "ads_read",
  "ads_management",
  "pages_read_engagement",
  "business_management",
];

export function getMetaAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES.join(","),
    state,
    response_type: "code",
  });
  return `https://www.facebook.com/${API_VERSION}/dialog/oauth?${params}`;
}

export async function exchangeCode(code: string): Promise<{
  shortToken: string;
}> {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    redirect_uri: REDIRECT_URI,
    code,
  });
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params}`);
  if (!res.ok) throw new Error(`Meta token exchange failed: ${res.status}`);
  const data = await res.json();
  return { shortToken: data.access_token };
}

export async function getLongLivedToken(shortToken: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID ?? "",
    client_secret: process.env.META_APP_SECRET ?? "",
    fb_exchange_token: shortToken,
  });
  const res = await fetch(`${GRAPH_URL}/oauth/access_token?${params}`);
  if (!res.ok) throw new Error(`Meta long-lived token failed: ${res.status}`);
  const data = await res.json();
  const expiresAt = new Date(Date.now() + (data.expires_in ?? 5184000) * 1000);
  return { token: data.access_token, expiresAt };
}

export async function getAdAccounts(
  accessToken: string
): Promise<Array<{ id: string; name: string; account_id: string }>> {
  const res = await fetch(
    `${GRAPH_URL}/me/adaccounts?fields=id,name,account_id&access_token=${accessToken}`
  );
  if (!res.ok) throw new Error(`Failed to fetch ad accounts: ${res.status}`);
  const data = await res.json();
  return data.data ?? [];
}
