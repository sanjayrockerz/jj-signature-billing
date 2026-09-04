-- J.J Signature: server-authoritative inventory alert lifecycle.
-- No backfill is performed: alerts represent new threshold transitions only.

CREATE TABLE IF NOT EXISTS public.inventory_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('LOW_STOCK', 'OUT_OF_STOCK')),
  stock_quantity INTEGER NOT NULL CHECK (stock_quantity >= 0),
  threshold INTEGER CHECK (threshold IS NULL OR threshold >= 0),
  message TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS inventory_alerts_product_idx
  ON public.inventory_alerts (product_id);
CREATE INDEX IF NOT EXISTS inventory_alerts_read_idx
  ON public.inventory_alerts (is_read);
CREATE INDEX IF NOT EXISTS inventory_alerts_created_idx
  ON public.inventory_alerts (created_at DESC);
CREATE INDEX IF NOT EXISTS inventory_alerts_unread_created_idx
  ON public.inventory_alerts (created_at DESC)
  WHERE is_read = FALSE;

CREATE OR REPLACE FUNCTION public.create_inventory_alert_on_stock_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock NUMERIC := COALESCE(NEW.stock_quantity, NEW.stock, 0);
  v_old_stock NUMERIC := COALESCE(OLD.stock_quantity, OLD.stock, 0);
  v_threshold NUMERIC := COALESCE(NEW.low_stock_alert, 0);
  v_alert_type TEXT;
  v_message TEXT;
BEGIN
  IF NOT COALESCE(NEW.track_inventory, TRUE)
     OR v_stock IS NOT DISTINCT FROM v_old_stock THEN
    RETURN NEW;
  END IF;

  -- Row updates are already serialized by PostgreSQL. This transaction lock
  -- additionally makes the transition decision safe if multiple stock paths
  -- are introduced later and prevents duplicate event inserts in one cycle.
  PERFORM pg_advisory_xact_lock(hashtextextended('inventory-alert:' || NEW.id::TEXT, 0));

  IF v_stock <= 0 AND v_old_stock > 0 THEN
    v_alert_type := 'OUT_OF_STOCK';
    v_message := 'The product is now out of stock.';
  ELSIF v_stock > 0 AND v_stock <= v_threshold AND v_old_stock > v_threshold THEN
    v_alert_type := 'LOW_STOCK';
    v_message := format('Stock has reached the configured threshold (%s). Current stock: %s.', v_threshold, v_stock);
  ELSE
    -- This includes recovery above the threshold. The next crossing is
    -- naturally re-armed because the trigger compares OLD and NEW values.
    RETURN NEW;
  END IF;

  INSERT INTO public.inventory_alerts (product_id, alert_type, stock_quantity, threshold, message)
  VALUES (NEW.id, v_alert_type, GREATEST(TRUNC(v_stock), 0)::INTEGER,
          CASE WHEN v_alert_type = 'LOW_STOCK' THEN GREATEST(TRUNC(v_threshold), 0)::INTEGER ELSE NULL END,
          v_message);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_inventory_alert_transition ON public.products;
CREATE TRIGGER products_inventory_alert_transition
AFTER UPDATE OF stock_quantity, stock ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.create_inventory_alert_on_stock_transition();

ALTER TABLE public.inventory_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_alerts_admin_select ON public.inventory_alerts;
CREATE POLICY inventory_alerts_admin_select ON public.inventory_alerts
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS inventory_alerts_admin_update ON public.inventory_alerts;
CREATE POLICY inventory_alerts_admin_update ON public.inventory_alerts
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE INSERT, DELETE ON public.inventory_alerts FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.inventory_alerts TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_alerts;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END;
$$;

NOTIFY pgrst, 'reload schema';
