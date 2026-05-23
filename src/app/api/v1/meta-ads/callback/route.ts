import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, getLongLivedToken } from "@/lib/meta/oauth";
import { getServiceClient } from "@/lib/supabase/service";
import { encryptToken } from "@/lib/crypto/credentials";

export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.URL ?? "";
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${siteUrl}/?meta_error=missing_code`);
  }

  try {
    const { shortToken } = await exchangeCode(code);
    const { token, expiresAt } = await getLongLivedToken(shortToken);

    const db = getServiceClient();
    // Replace any existing agency token
    await db.from("meta_agency_tokens").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await db.from("meta_agency_tokens").insert({
      access_token: await encryptToken(token),
      token_expires_at: expiresAt.toISOString(),
      scopes: ["ads_read", "ads_management", "pages_read_engagement", "business_management"],
    });
  } catch (err) {
    console.error("[meta-ads/callback]", err);
    return NextResponse.redirect(`${siteUrl}/?meta_error=auth_failed`);
  }

  return NextResponse.redirect(`${siteUrl}/?meta_connected=1`);
}
