import type { PMSAdapter, PMSProvider } from "./adapter";
import { GuestyAdapter } from "./guesty";
import { HostawayAdapter } from "./hostaway";
import { HostfullyAdapter } from "./hostfully";
import { LodgifyAdapter } from "./lodgify";
import { OwnerRezAdapter } from "./ownerrez";
import { SmoobuAdapter } from "./smoobu";
import { Beds24Adapter } from "./beds24";
import { IgmsAdapter } from "./igms";
import { GenericRestAdapter } from "./generic-rest";

export function createPMSAdapter(
  provider: PMSProvider,
  credentials: Record<string, string>
): PMSAdapter {
  switch (provider) {
    case "guesty":
      return new GuestyAdapter({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      });
    case "hostaway":
      return new HostawayAdapter({
        accountId: credentials.account_id,
        apiKey: credentials.client_secret,
      });
    case "hostfully":
      return new HostfullyAdapter({
        api_key: credentials.api_key,
        agency_uid: credentials.agency_uid,
      });
    case "lodgify":
      return new LodgifyAdapter({ api_key: credentials.api_key });
    case "ownerrez":
      return new OwnerRezAdapter({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
      });
    case "smoobu":
      return new SmoobuAdapter({ api_key: credentials.api_key });
    case "beds24":
      return new Beds24Adapter({
        entry_id: credentials.entry_id,
        api_key: credentials.api_key,
      });
    case "igms":
      return new IgmsAdapter({ api_key: credentials.api_key });
    case "streamline":
    case "liverez":
    case "track":
    case "custom":
      return new GenericRestAdapter(provider, {
        base_url: credentials.base_url,
        username: credentials.username,
        password: credentials.password,
        api_key: credentials.api_key,
      });
    default: {
      const exhaustive: never = provider;
      throw new Error(`PMS provider not supported: ${exhaustive}`);
    }
  }
}
