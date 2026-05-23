-- Fix occupancy rate: booked nights / available room-nights (not confirmed bookings / all bookings)
CREATE OR REPLACE FUNCTION get_occupancy_rate(
  p_tenant_id  UUID,
  p_start_date DATE,
  p_end_date   DATE
)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  WITH props AS (
    SELECT GREATEST(COUNT(*), 1) AS cnt
    FROM pms_properties
    WHERE tenant_id = p_tenant_id
  ),
  booked AS (
    SELECT COALESCE(SUM(
      LEAST(check_out, p_end_date + 1) - GREATEST(check_in, p_start_date)
    ), 0) AS nights
    FROM pms_bookings
    WHERE tenant_id = p_tenant_id
      AND status = 'confirmed'
      AND check_in  < p_end_date + 1
      AND check_out > p_start_date
  )
  SELECT ROUND(
    booked.nights::NUMERIC
    / (props.cnt * (p_end_date - p_start_date + 1))::NUMERIC
    * 100, 2
  )
  FROM booked, props;
$$;

-- Recompute derived metrics with corrected formulas and add RevPAR
CREATE OR REPLACE FUNCTION upsert_pms_derived_metrics(p_tenant_id UUID, p_date DATE)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_start         DATE    := date_trunc('month', p_date)::DATE;
  v_end           DATE    := (date_trunc('month', p_date) + INTERVAL '1 month - 1 day')::DATE;
  v_days          INTEGER := v_end - v_start + 1;
  v_props         INTEGER;
  v_avail_nights  NUMERIC;
  v_booked_nights NUMERIC;
  v_total_rev     NUMERIC;
  v_occ           NUMERIC;
  v_adr           NUMERIC;
  v_revpar        NUMERIC;
BEGIN
  -- Available room-nights = properties × days in month
  SELECT GREATEST(COUNT(*), 1) INTO v_props
  FROM pms_properties WHERE tenant_id = p_tenant_id;
  v_avail_nights := v_props * v_days;

  -- Booked nights: clip each confirmed booking to month boundaries
  SELECT COALESCE(SUM(
    LEAST(check_out, v_end + 1) - GREATEST(check_in, v_start)
  ), 0)
  INTO v_booked_nights
  FROM pms_bookings
  WHERE tenant_id = p_tenant_id
    AND status = 'confirmed'
    AND check_in  < v_end + 1
    AND check_out > v_start;

  -- Revenue: confirmed bookings with check-in in this month
  SELECT COALESCE(ROUND(SUM(total_revenue), 2), 0)
  INTO v_total_rev
  FROM pms_bookings
  WHERE tenant_id = p_tenant_id
    AND status = 'confirmed'
    AND check_in >= v_start
    AND check_in <= v_end;

  -- Occupancy rate = booked nights / available room-nights × 100
  v_occ := ROUND(v_booked_nights / v_avail_nights * 100, 2);

  -- ADR = total revenue / booked nights (SUM÷SUM, not AVG of per-booking rates)
  v_adr := CASE WHEN v_booked_nights > 0
    THEN ROUND(v_total_rev / v_booked_nights, 2)
    ELSE 0
  END;

  -- RevPAR = total revenue / available room-nights
  v_revpar := ROUND(v_total_rev / v_avail_nights, 2);

  INSERT INTO performance_metrics(tenant_id, metric_date, metric_type, metric_value, source)
  VALUES
    (p_tenant_id, p_date, 'occupancy_rate', v_occ,       'pms_derived'),
    (p_tenant_id, p_date, 'adr',            v_adr,       'pms_derived'),
    (p_tenant_id, p_date, 'revpar',         v_revpar,    'pms_derived'),
    (p_tenant_id, p_date, 'total_revenue',  v_total_rev, 'pms_derived')
  ON CONFLICT (tenant_id, metric_date, metric_type, dimensions)
  DO UPDATE SET metric_value = EXCLUDED.metric_value;
END;
$$;
