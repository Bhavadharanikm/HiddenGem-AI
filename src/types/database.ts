// Placeholder types — regenerate with: npx supabase gen types typescript --local > src/types/database.ts

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

type Row<T> = T;
type Insert<T> = Partial<T>;
type Update<T> = Partial<T>;

type TenantRow = {
  id: string;
  slug: string;
  name: string;
  agency_id: string;
  system_prompt: string | null;
  settings: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type ConversationRow = {
  id: string;
  tenant_id: string;
  external_id: string | null;
  title: string | null;
  source: "api" | "dashboard" | "widget";
  summary: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

type ClientMemoryRow = {
  id: string;
  tenant_id: string;
  content: string;
  category: "preference" | "insight" | "fact" | "goal" | "issue";
  created_at: string;
}

type MessageRow = {
  id: string;
  tenant_id: string;
  conversation_id: string;
  role: "user" | "assistant" | "tool";
  content: Json;
  tool_use: Json | null;
  input_tokens: number | null;
  output_tokens: number | null;
  model: string | null;
  created_at: string;
}

type KnowledgeDocumentRow = {
  id: string;
  tenant_id: string;
  name: string;
  google_drive_id: string;
  google_doc_url: string;
  mime_type: string | null;
  last_modified_at: string | null;
  status: "pending" | "processing" | "ready" | "error";
  error_msg: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

type KnowledgeChunkRow = {
  id: string;
  tenant_id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  token_count: number | null;
  embedding: number[] | null;
  metadata: Json;
  created_at: string;
}

type GoogleDriveConnectionRow = {
  id: string;
  tenant_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string | null;
  scopes: string[] | null;
  connected_at: string;
}

type PmsConnectionRow = {
  id: string;
  tenant_id: string;
  provider: "guesty" | "hostaway" | "lodgify" | "custom";
  credentials: Json;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: "idle" | "running" | "error";
  created_at: string;
}

type PmsPropertyRow = {
  id: string;
  tenant_id: string;
  connection_id: string;
  external_id: string;
  name: string;
  address: Json | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[] | null;
  base_price: number | null;
  currency: string;
  raw_data: Json | null;
  synced_at: string;
}

type PmsBookingRow = {
  id: string;
  tenant_id: string;
  property_id: string;
  external_id: string;
  status: string | null;
  check_in: string | null;
  check_out: string | null;
  guests: number | null;
  total_revenue: number | null;
  platform: string | null;
  raw_data: Json | null;
  synced_at: string;
}

type PmsReviewRow = {
  id: string;
  tenant_id: string;
  property_id: string;
  external_id: string;
  rating: number | null;
  reviewer_name: string | null;
  review_text: string | null;
  response_text: string | null;
  review_date: string | null;
  raw_data: Json | null;
  synced_at: string;
}

type MetaConnectionRow = {
  id: string;
  tenant_id: string;
  ad_account_id: string;
  page_id: string | null;
  access_token: string;
  token_expires_at: string | null;
  scopes: string[] | null;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
}

type MetaCampaignRow = {
  id: string;
  tenant_id: string;
  connection_id: string;
  external_id: string;
  name: string;
  status: string | null;
  objective: string | null;
  budget_type: string | null;
  daily_budget: number | null;
  lifetime_budget: number | null;
  start_time: string | null;
  stop_time: string | null;
  raw_data: Json | null;
  synced_at: string;
}

type MetaAdInsightRow = {
  id: string;
  tenant_id: string;
  campaign_id: string | null;
  date_start: string;
  date_stop: string;
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  conversions: number;
  revenue: number;
  cpm: number | null;
  cpc: number | null;
  ctr: number | null;
  roas: number | null;
  raw_data: Json | null;
  synced_at: string;
}

type MetaAudienceRow = {
  id: string;
  tenant_id: string;
  connection_id: string;
  external_id: string;
  name: string;
  type: "custom" | "lookalike" | "saved" | null;
  subtype: string | null;
  description: string | null;
  approximate_count: number | null;
  raw_data: Json | null;
  synced_at: string;
}

type PerformanceMetricRow = {
  id: string;
  tenant_id: string;
  metric_date: string;
  metric_type: string;
  metric_value: number | null;
  dimensions: Json;
  source: "manual" | "pms_derived" | "meta_derived" | null;
  created_at: string;
}

type CampaignHistoryRow = {
  id: string;
  tenant_id: string;
  campaign_name: string;
  campaign_type: string | null;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  goals: Json | null;
  results: Json | null;
  notes: string | null;
  created_at: string;
}

type ApiKeyRow = {
  id: string;
  tenant_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  scopes: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

type WebhookEndpointRow = {
  id: string;
  tenant_id: string;
  name: string | null;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type WebhookDeliveryRow = {
  id: string;
  tenant_id: string;
  endpoint_id: string;
  event_type: string;
  payload: Json;
  status: "pending" | "delivered" | "failed" | "retrying";
  attempts: number;
  next_retry_at: string | null;
  last_attempt_at: string | null;
  response_status: number | null;
  response_body: string | null;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: Row<TenantRow>;
        Insert: Insert<TenantRow>;
        Update: Update<TenantRow>;
        Relationships: [];
      };
      agency_users: {
        Row: { id: string; email: string; role: string; created_at: string };
        Insert: Partial<{ id: string; email: string; role: string }>;
        Update: Partial<{ email: string; role: string }>;
        Relationships: [];
      };
      client_users: {
        Row: { id: string; tenant_id: string; email: string; role: string; created_at: string };
        Insert: Partial<{ id: string; tenant_id: string; email: string; role: string }>;
        Update: Partial<{ email: string; role: string }>;
        Relationships: [];
      };
      conversations: {
        Row: Row<ConversationRow>;
        Insert: Insert<ConversationRow>;
        Update: Update<ConversationRow>;
        Relationships: [];
      };
      messages: {
        Row: Row<MessageRow>;
        Insert: Insert<MessageRow>;
        Update: Update<MessageRow>;
        Relationships: [];
      };
      knowledge_documents: {
        Row: Row<KnowledgeDocumentRow>;
        Insert: Insert<KnowledgeDocumentRow>;
        Update: Update<KnowledgeDocumentRow>;
        Relationships: [];
      };
      knowledge_chunks: {
        Row: Row<KnowledgeChunkRow>;
        Insert: Insert<KnowledgeChunkRow>;
        Update: Update<KnowledgeChunkRow>;
        Relationships: [];
      };
      google_drive_connections: {
        Row: Row<GoogleDriveConnectionRow>;
        Insert: Insert<GoogleDriveConnectionRow>;
        Update: Update<GoogleDriveConnectionRow>;
        Relationships: [];
      };
      pms_connections: {
        Row: Row<PmsConnectionRow>;
        Insert: Insert<PmsConnectionRow>;
        Update: Update<PmsConnectionRow>;
        Relationships: [];
      };
      pms_properties: {
        Row: Row<PmsPropertyRow>;
        Insert: Insert<PmsPropertyRow>;
        Update: Update<PmsPropertyRow>;
        Relationships: [];
      };
      pms_bookings: {
        Row: Row<PmsBookingRow>;
        Insert: Insert<PmsBookingRow>;
        Update: Update<PmsBookingRow>;
        Relationships: [];
      };
      pms_reviews: {
        Row: Row<PmsReviewRow>;
        Insert: Insert<PmsReviewRow>;
        Update: Update<PmsReviewRow>;
        Relationships: [];
      };
      meta_connections: {
        Row: Row<MetaConnectionRow>;
        Insert: Insert<MetaConnectionRow>;
        Update: Update<MetaConnectionRow>;
        Relationships: [];
      };
      meta_campaigns: {
        Row: Row<MetaCampaignRow>;
        Insert: Insert<MetaCampaignRow>;
        Update: Update<MetaCampaignRow>;
        Relationships: [];
      };
      meta_ad_insights: {
        Row: Row<MetaAdInsightRow>;
        Insert: Insert<MetaAdInsightRow>;
        Update: Update<MetaAdInsightRow>;
        Relationships: [];
      };
      meta_audiences: {
        Row: Row<MetaAudienceRow>;
        Insert: Insert<MetaAudienceRow>;
        Update: Update<MetaAudienceRow>;
        Relationships: [];
      };
      performance_metrics: {
        Row: Row<PerformanceMetricRow>;
        Insert: Insert<PerformanceMetricRow>;
        Update: Update<PerformanceMetricRow>;
        Relationships: [];
      };
      campaign_history: {
        Row: Row<CampaignHistoryRow>;
        Insert: Insert<CampaignHistoryRow>;
        Update: Update<CampaignHistoryRow>;
        Relationships: [];
      };
      api_keys: {
        Row: Row<ApiKeyRow>;
        Insert: Insert<ApiKeyRow>;
        Update: Update<ApiKeyRow>;
        Relationships: [];
      };
      webhook_endpoints: {
        Row: Row<WebhookEndpointRow>;
        Insert: Insert<WebhookEndpointRow>;
        Update: Update<WebhookEndpointRow>;
        Relationships: [];
      };
      webhook_deliveries: {
        Row: Row<WebhookDeliveryRow>;
        Insert: Insert<WebhookDeliveryRow>;
        Update: Update<WebhookDeliveryRow>;
        Relationships: [];
      };
      client_memories: {
        Row: Row<ClientMemoryRow>;
        Insert: Insert<ClientMemoryRow>;
        Update: Update<ClientMemoryRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      resolve_api_key: {
        Args: { p_key_hash: string };
        Returns: {
          tenant_id: string;
          scopes: string[];
          rate_limit: number;
          key_id: string;
        }[];
      };
      match_knowledge_chunks: {
        Args: {
          p_tenant_id: string;
          p_embedding: number[];
          p_match_count?: number;
          p_threshold?: number;
        };
        Returns: {
          id: string;
          content: string;
          document_name: string;
          similarity: number;
        }[];
      };
      accessible_tenant_ids: {
        Args: Record<string, never>;
        Returns: string[];
      };
      get_occupancy_rate: {
        Args: { p_tenant_id: string; p_start_date: string; p_end_date: string };
        Returns: number;
      };
      upsert_pms_derived_metrics: {
        Args: { p_tenant_id: string; p_date: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
