export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agency_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          role?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit: number | null
          scopes: string[] | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit?: number | null
          scopes?: string[] | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit?: number | null
          scopes?: string[] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_history: {
        Row: {
          budget: number | null
          campaign_name: string
          campaign_type: string | null
          created_at: string | null
          end_date: string | null
          goals: Json | null
          id: string
          notes: string | null
          results: Json | null
          start_date: string | null
          tenant_id: string
        }
        Insert: {
          budget?: number | null
          campaign_name: string
          campaign_type?: string | null
          created_at?: string | null
          end_date?: string | null
          goals?: Json | null
          id?: string
          notes?: string | null
          results?: Json | null
          start_date?: string | null
          tenant_id: string
        }
        Update: {
          budget?: number | null
          campaign_name?: string
          campaign_type?: string | null
          created_at?: string | null
          end_date?: string | null
          goals?: Json | null
          id?: string
          notes?: string | null
          results?: Json | null
          start_date?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_memories: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          tenant_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          tenant_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_memories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          role?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          source: string | null
          summary: string | null
          tenant_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          summary?: string | null
          tenant_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          source?: string | null
          summary?: string | null
          tenant_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_drive_connections: {
        Row: {
          access_token: string
          connected_at: string | null
          id: string
          refresh_token: string
          scopes: string[] | null
          tenant_id: string
          token_expires_at: string | null
        }
        Insert: {
          access_token: string
          connected_at?: string | null
          id?: string
          refresh_token: string
          scopes?: string[] | null
          tenant_id: string
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string
          connected_at?: string | null
          id?: string
          refresh_token?: string
          scopes?: string[] | null
          tenant_id?: string
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_drive_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string | null
          document_id: string
          embedding: string | null
          id: string
          metadata: Json | null
          tenant_id: string
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          content: string
          created_at?: string | null
          document_id: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string | null
          document_id?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_chunks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          created_at: string | null
          error_msg: string | null
          google_doc_url: string
          google_drive_id: string
          id: string
          last_modified_at: string | null
          metadata: Json | null
          mime_type: string | null
          name: string
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          error_msg?: string | null
          google_doc_url: string
          google_drive_id: string
          id?: string
          last_modified_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name: string
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          error_msg?: string | null
          google_doc_url?: string
          google_drive_id?: string
          id?: string
          last_modified_at?: string | null
          metadata?: Json | null
          mime_type?: string | null
          name?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string | null
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          role: string
          tenant_id: string
          tool_use: Json | null
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role: string
          tenant_id: string
          tool_use?: Json | null
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          role?: string
          tenant_id?: string
          tool_use?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_ad_insights: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          date_start: string
          date_stop: string
          id: string
          impressions: number | null
          raw_data: Json | null
          reach: number | null
          revenue: number | null
          roas: number | null
          spend: number | null
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          date_start: string
          date_stop: string
          id?: string
          impressions?: number | null
          raw_data?: Json | null
          reach?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          ctr?: number | null
          date_start?: string
          date_stop?: string
          id?: string
          impressions?: number | null
          raw_data?: Json | null
          reach?: number | null
          revenue?: number | null
          roas?: number | null
          spend?: number | null
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_ad_insights_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "meta_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_ad_insights_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_agency_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          id: string
          scopes: string[] | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          id?: string
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          id?: string
          scopes?: string[] | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      meta_audiences: {
        Row: {
          approximate_count: number | null
          connection_id: string | null
          description: string | null
          external_id: string
          id: string
          name: string
          raw_data: Json | null
          subtype: string | null
          synced_at: string | null
          tenant_id: string
          type: string | null
        }
        Insert: {
          approximate_count?: number | null
          connection_id?: string | null
          description?: string | null
          external_id: string
          id?: string
          name: string
          raw_data?: Json | null
          subtype?: string | null
          synced_at?: string | null
          tenant_id: string
          type?: string | null
        }
        Update: {
          approximate_count?: number | null
          connection_id?: string | null
          description?: string | null
          external_id?: string
          id?: string
          name?: string
          raw_data?: Json | null
          subtype?: string | null
          synced_at?: string | null
          tenant_id?: string
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_audiences_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "meta_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_audiences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_campaigns: {
        Row: {
          budget_type: string | null
          connection_id: string | null
          daily_budget: number | null
          external_id: string
          id: string
          lifetime_budget: number | null
          name: string
          objective: string | null
          raw_data: Json | null
          start_time: string | null
          status: string | null
          stop_time: string | null
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          budget_type?: string | null
          connection_id?: string | null
          daily_budget?: number | null
          external_id: string
          id?: string
          lifetime_budget?: number | null
          name: string
          objective?: string | null
          raw_data?: Json | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          budget_type?: string | null
          connection_id?: string | null
          daily_budget?: number | null
          external_id?: string
          id?: string
          lifetime_budget?: number | null
          name?: string
          objective?: string | null
          raw_data?: Json | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_campaigns_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "meta_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meta_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_client_assignments: {
        Row: {
          account_name: string | null
          ad_account_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          tenant_id: string
        }
        Insert: {
          account_name?: string | null
          ad_account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          tenant_id: string
        }
        Update: {
          account_name?: string | null
          ad_account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_client_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_connections: {
        Row: {
          access_token: string
          ad_account_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          page_id: string | null
          scopes: string[] | null
          tenant_id: string
          token_expires_at: string | null
        }
        Insert: {
          access_token: string
          ad_account_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          page_id?: string | null
          scopes?: string[] | null
          tenant_id: string
          token_expires_at?: string | null
        }
        Update: {
          access_token?: string
          ad_account_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          page_id?: string | null
          scopes?: string[] | null
          tenant_id?: string
          token_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meta_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          created_at: string | null
          dimensions: Json | null
          id: string
          metric_date: string
          metric_type: string
          metric_value: number | null
          source: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          metric_date: string
          metric_type: string
          metric_value?: number | null
          source?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          dimensions?: Json | null
          id?: string
          metric_date?: string
          metric_type?: string
          metric_value?: number | null
          source?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pms_bookings: {
        Row: {
          check_in: string | null
          check_out: string | null
          external_id: string
          guests: number | null
          id: string
          platform: string | null
          property_id: string
          raw_data: Json | null
          status: string | null
          synced_at: string | null
          tenant_id: string
          total_revenue: number | null
        }
        Insert: {
          check_in?: string | null
          check_out?: string | null
          external_id: string
          guests?: number | null
          id?: string
          platform?: string | null
          property_id: string
          raw_data?: Json | null
          status?: string | null
          synced_at?: string | null
          tenant_id: string
          total_revenue?: number | null
        }
        Update: {
          check_in?: string | null
          check_out?: string | null
          external_id?: string
          guests?: number | null
          id?: string
          platform?: string | null
          property_id?: string
          raw_data?: Json | null
          status?: string | null
          synced_at?: string | null
          tenant_id?: string
          total_revenue?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pms_bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "pms_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pms_connections: {
        Row: {
          created_at: string | null
          credentials: Json
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          provider: string
          sync_status: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          credentials: Json
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider: string
          sync_status?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          credentials?: Json
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          provider?: string
          sync_status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pms_connections_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pms_properties: {
        Row: {
          address: Json | null
          amenities: string[] | null
          base_price: number | null
          bathrooms: number | null
          bedrooms: number | null
          connection_id: string
          currency: string | null
          external_id: string
          id: string
          name: string
          raw_data: Json | null
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          address?: Json | null
          amenities?: string[] | null
          base_price?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          connection_id: string
          currency?: string | null
          external_id: string
          id?: string
          name: string
          raw_data?: Json | null
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          address?: Json | null
          amenities?: string[] | null
          base_price?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          connection_id?: string
          currency?: string | null
          external_id?: string
          id?: string
          name?: string
          raw_data?: Json | null
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pms_properties_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "pms_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_properties_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pms_reviews: {
        Row: {
          external_id: string
          id: string
          property_id: string
          rating: number | null
          raw_data: Json | null
          response_text: string | null
          review_date: string | null
          review_text: string | null
          reviewer_name: string | null
          synced_at: string | null
          tenant_id: string
        }
        Insert: {
          external_id: string
          id?: string
          property_id: string
          rating?: number | null
          raw_data?: Json | null
          response_text?: string | null
          review_date?: string | null
          review_text?: string | null
          reviewer_name?: string | null
          synced_at?: string | null
          tenant_id: string
        }
        Update: {
          external_id?: string
          id?: string
          property_id?: string
          rating?: number | null
          raw_data?: Json | null
          response_text?: string | null
          review_date?: string | null
          review_text?: string | null
          reviewer_name?: string | null
          synced_at?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pms_reviews_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "pms_properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pms_reviews_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          agency_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          settings: Json | null
          slug: string
          system_prompt: string | null
          updated_at: string | null
        }
        Insert: {
          agency_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          settings?: Json | null
          slug: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Update: {
          agency_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          settings?: Json | null
          slug?: string
          system_prompt?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_deliveries: {
        Row: {
          attempts: number | null
          created_at: string | null
          endpoint_id: string
          event_type: string
          id: string
          last_attempt_at: string | null
          next_retry_at: string | null
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string | null
          tenant_id: string
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          endpoint_id: string
          event_type: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          tenant_id: string
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          endpoint_id?: string
          event_type?: string
          id?: string
          last_attempt_at?: string | null
          next_retry_at?: string | null
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_deliveries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          created_at: string | null
          events: string[]
          id: string
          is_active: boolean | null
          name: string | null
          secret: string
          tenant_id: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          events: string[]
          id?: string
          is_active?: boolean | null
          name?: string | null
          secret: string
          tenant_id: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          events?: string[]
          id?: string
          is_active?: boolean | null
          name?: string | null
          secret?: string
          tenant_id?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accessible_tenant_ids: { Args: never; Returns: string[] }
      get_occupancy_rate: {
        Args: { p_end_date: string; p_start_date: string; p_tenant_id: string }
        Returns: number
      }
      match_knowledge_chunks: {
        Args: {
          p_embedding: string
          p_match_count?: number
          p_tenant_id: string
          p_threshold?: number
        }
        Returns: {
          content: string
          document_name: string
          id: string
          similarity: number
        }[]
      }
      resolve_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          key_id: string
          rate_limit: number
          scopes: string[]
          tenant_id: string
        }[]
      }
      upsert_pms_derived_metrics: {
        Args: { p_date: string; p_tenant_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
