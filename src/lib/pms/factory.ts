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
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
      });
    case "hostaway":
      return new HostawayAdapter({
        accountId: credentials.accountId,
        apiKey: credentials.apiKey,
      });
    default:
      throw new Error(`PMS provider not supported: ${provider}`);
  }
}
