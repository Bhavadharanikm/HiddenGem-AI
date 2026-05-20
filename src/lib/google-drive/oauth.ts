import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const REDIRECT_URI =
  process.env.GOOGLE_REDIRECT_URI ??
  "http://localhost:3000/api/v1/google-drive/callback";

export function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );
}

export function getAuthUrl(state: string): string {
  const oauth2 = createOAuthClient();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state,
    prompt: "consent", // Force refresh token on every auth
  });
}

export async function exchangeCode(code: string) {
  const oauth2 = createOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  return tokens;
}

export async function refreshAccessToken(refreshToken: string) {
  const oauth2 = createOAuthClient();
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2.refreshAccessToken();
  return credentials;
}
