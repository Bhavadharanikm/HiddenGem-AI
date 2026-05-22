import type { PMSAdapter, PMSProvider } from "./adapter";
import { GuestyAdapter } from "./guesty";
import { HostawayAdapter } from "./hostaway";

export function createPMSAdapter(
  provider: PMSProvider,
  credentials: Record<string, string>
): PMSAdapter {
  switch (provider) {
    case "guesty":
      return new GuestyAdapter({
        clientId: credentials.client_id,
        clientSecret: credentials.client_secret,
      });
    case "hostaway":
      return new HostawayAdapter({
        accountId: credentials.account_id,
        apiKey: credentials.client_secret,
      });
    default:
      throw new Error(`PMS provider not supported: ${provider}`);
  }
}
