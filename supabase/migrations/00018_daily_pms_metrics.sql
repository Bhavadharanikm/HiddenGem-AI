-- Switch from monthly aggregates to true daily metrics.
-- Each row now represents a single calendar day, not a full month.

-- Clear stale monthly rows so the next sync writes clean daily data.
DELETE FROM performance_metrics WHERE source = 'pms_derived';

-- Rewrite the function: p_date is now the exact day (no month-trunc).
CREATE OR REPLACE FUNCTION upsert_pms_derived_metrics(p_tenant_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_props        INTEGER;
  v_booked_units NUMERIC;   -- occupied units on p_date
  v_daily_rev    NUMERIC;   -- revenue attributed to p_date (pro-rated per night)
  v_occ          NUMERIC;
  v_adr          NUMERIC;
  v_revpar       NUMERIC;
BEGIN
  SELECT GREATEST(COUNT(*), 1) INTO v_props
  FROM pms_properties WHERE tenant_id = p_tenant_id;

  -- Count occupied units and attribute nightly revenue for this specific day.
  -- Each booking contributes total_revenue / nights to each day it covers.
  SELECT
    COALESCE(COUNT(*), 0),
    COALESCE(SUM(
      total_revenue::NUMERIC / GREATEST((check_out - check_in)::NUMERIC, 1)
    ), 0)
  INTO v_booked_units, v_daily_rev
  FROM pms_bookings
  WHERE tenant_id = p_tenant_id
    AND status    = 'confirmed'
    AND check_in  <= p_date
    AND check_out  > p_date;

  v_occ    := ROUND(v_booked_units / v_props * 100, 2);
  v_adr    := CASE WHEN v_booked_units > 0
                THEN ROUND(v_daily_rev / v_booked_units, 2)
                ELSE 0
              END;
  v_revpar := ROUND(v_daily_rev / v_props, 2);

  INSERT INTO performance_metrics(tenant_id, metric_date, metric_type, metric_value, source)
  VALUES
    (p_tenant_id, p_date, 'occupancy_rate', v_occ,       'pms_derived'),
    (p_tenant_id, p_date, 'adr',            v_adr,       'pms_derived'),
    (p_tenant_id, p_date, 'revpar',         v_revpar,    'pms_derived'),
    (p_tenant_id, p_date, 'total_revenue',  v_daily_rev, 'pms_derived')
  ON CONFLICT (tenant_id, metric_date, metric_type, dimensions)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$;
