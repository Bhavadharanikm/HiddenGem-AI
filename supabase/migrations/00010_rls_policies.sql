-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_drive_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE pms_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pms_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pms_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pms_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_ad_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE meta_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Helper: returns all tenant IDs the current user can access
CREATE OR REPLACE FUNCTION accessible_tenant_ids()
RETURNS UUID[]
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT ARRAY(
    SELECT id FROM tenants WHERE agency_id = auth.uid()
    UNION
    SELECT tenant_id FROM client_users WHERE id = auth.uid()
  );
$$;

-- Tenants
CREATE POLICY "agency_see_own_tenants" ON tenants FOR SELECT
  USING (agency_id = auth.uid() OR id = ANY(accessible_tenant_ids()));
CREATE POLICY "agency_manage_own_tenants" ON tenants FOR ALL
  USING (agency_id = auth.uid());

-- Generic tenant isolation applied to all data tables
CREATE POLICY "tenant_isolation" ON google_drive_connections FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON knowledge_documents FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON knowledge_chunks FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON conversations FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON messages FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON pms_connections FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON pms_properties FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON pms_bookings FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON pms_reviews FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON meta_connections FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON meta_campaigns FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON meta_ad_insights FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON meta_audiences FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON performance_metrics FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON campaign_history FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON api_keys FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON webhook_endpoints FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
CREATE POLICY "tenant_isolation" ON webhook_deliveries FOR ALL
  USING (tenant_id = ANY(accessible_tenant_ids()));
