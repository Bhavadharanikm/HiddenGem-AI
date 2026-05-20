import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// Service role client — bypasses RLS. Only use server-side.
// After resolving an API key, always manually enforce tenant_id.
let _serviceClient: ReturnType<typeof createClient<Database>> | null = null;

export function getServiceClient() {
  if (!_serviceClient) {
    _serviceClient = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return _serviceClient;
}
