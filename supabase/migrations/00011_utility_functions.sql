CREATE OR REPLACE FUNCTION get_occupancy_rate(
  p_tenant_id  UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    ROUND(
      COUNT(*) FILTER (WHERE status = 'confirmed')::NUMERIC /
      NULLIF(COUNT(*)::NUMERIC, 0) * 100, 2
    )
  FROM pms_bookings b
  WHERE b.tenant_id = p_tenant_id
    AND b.check_in >= p_start_date
    AND b.check_out <= p_end_date;
$$;

-- Compute and upsert derived metrics after a PMS sync
CREATE OR REPLACE FUNCTION upsert_pms_derived_metrics(p_tenant_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_start DATE := date_trunc('month', p_date)::DATE;
  v_end   DATE := (date_trunc('month', p_date) + INTERVAL '1 month - 1 day')::DATE;
  v_occ   NUMERIC;
  v_adr   NUMERIC;
  v_rev   NUMERIC;
BEGIN
  -- Occupancy rate
  SELECT get_occupancy_rate(p_tenant_id, v_start, v_end) INTO v_occ;

  -- Average Daily Rate
  SELECT ROUND(AVG(total_revenue / GREATEST(check_out - check_in, 1)), 2)
  INTO v_adr
  FROM pms_bookings
  WHERE tenant_id = p_tenant_id
    AND status = 'confirmed'
    AND check_in >= v_start AND check_out <= v_end;

  -- Total revenue
  SELECT ROUND(SUM(total_revenue), 2)
  INTO v_rev
  FROM pms_bookings
  WHERE tenant_id = p_tenant_id
    AND status = 'confirmed'
    AND check_in >= v_start AND check_out <= v_end;

  INSERT INTO performance_metrics(tenant_id, metric_date, metric_type, metric_value, source)
  VALUES
    (p_tenant_id, p_date, 'occupancy_rate', v_occ, 'pms_derived'),
    (p_tenant_id, p_date, 'adr', v_adr, 'pms_derived'),
    (p_tenant_id, p_date, 'total_revenue', v_rev, 'pms_derived')
  ON CONFLICT (tenant_id, metric_date, metric_type, dimensions)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$;
