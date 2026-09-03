-- JJ Signature backend hardening. Apply after the existing target migrations.
-- This migration changes no source-business data and seeds no transaction data.

ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percentage';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS discount_value numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS maximum_discount numeric(12,2);
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_from timestamptz;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS valid_until timestamptz;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_product_ids bigint[] NOT NULL DEFAULT '{}';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_categories text[] NOT NULL DEFAULT '{}';
UPDATE public.coupons SET discount_value = percentage WHERE discount_value = 0 AND percentage > 0;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin','staff','customer'));

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','staff'));
$$;

CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_subtotal numeric, p_product_ids bigint[] DEFAULT '{}', p_category_names text[] DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.coupons; d numeric;
BEGIN
  SELECT * INTO c FROM public.coupons WHERE upper(btrim(code))=upper(btrim(p_code)) AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid or inactive coupon'; END IF;
  IF c.valid_from IS NOT NULL AND now()<c.valid_from THEN RAISE EXCEPTION 'Coupon is not active yet'; END IF;
  IF coalesce(c.valid_until,c.expiry_date) IS NOT NULL AND now()>coalesce(c.valid_until,c.expiry_date) THEN RAISE EXCEPTION 'Coupon has expired'; END IF;
  IF c.usage_limit IS NOT NULL AND c.usage_count>=c.usage_limit THEN RAISE EXCEPTION 'Coupon usage limit has been reached'; END IF;
  IF p_subtotal<coalesce(c.min_order_value,0) THEN RAISE EXCEPTION 'Minimum order value is %', c.min_order_value; END IF;
  IF cardinality(c.applicable_product_ids)>0 AND NOT (c.applicable_product_ids && coalesce(p_product_ids,'{}')) THEN RAISE EXCEPTION 'Coupon does not apply to these products'; END IF;
  IF cardinality(c.applicable_categories)>0 AND NOT (c.applicable_categories && coalesce(p_category_names,'{}')) THEN RAISE EXCEPTION 'Coupon does not apply to these categories'; END IF;
  d:=CASE WHEN c.discount_type='fixed' THEN c.discount_value ELSE round(p_subtotal*c.discount_value/100,2) END;
  d:=least(d,coalesce(c.maximum_discount,d),p_subtotal);
  RETURN jsonb_build_object('id',c.id,'code',c.code,'discount_type',c.discount_type,'discount_value',c.discount_value,'percentage',c.percentage,'maximum_discount',c.maximum_discount,'discount',d);
END; $$;
GRANT EXECUTE ON FUNCTION public.validate_coupon(text,numeric,bigint[],text[]) TO anon, authenticated;

-- Remove inherited broad policies before installing role-scoped policies.
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('profiles','categories','products','product_variants','coupons','orders','order_items','advance_orders','advance_order_timeline','advance_order_payments','store_settings') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY; ALTER TABLE public.products ENABLE ROW LEVEL SECURITY; ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY; ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY; ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY; ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY; ALTER TABLE public.advance_orders ENABLE ROW LEVEL SECURITY; ALTER TABLE public.advance_order_timeline ENABLE ROW LEVEL SECURITY; ALTER TABLE public.advance_order_payments ENABLE ROW LEVEL SECURITY; ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid() OR public.is_admin()); CREATE POLICY profiles_admin_write ON public.profiles FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY categories_public_read ON public.categories FOR SELECT TO anon,authenticated USING (is_active); CREATE POLICY categories_admin_write ON public.categories FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY products_public_read ON public.products FOR SELECT TO anon,authenticated USING (is_active); CREATE POLICY products_admin_write ON public.products FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY variants_public_read ON public.product_variants FOR SELECT TO anon,authenticated USING (is_active); CREATE POLICY variants_admin_write ON public.product_variants FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY coupons_public_read ON public.coupons FOR SELECT TO anon,authenticated USING (is_active AND (valid_from IS NULL OR valid_from<=now()) AND (coalesce(valid_until,expiry_date) IS NULL OR coalesce(valid_until,expiry_date)>=now())); CREATE POLICY coupons_admin_write ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY orders_admin_read ON public.orders FOR SELECT TO authenticated USING (public.is_admin() OR user_id=auth.uid()); CREATE POLICY orders_admin_update ON public.orders FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin()); CREATE POLICY order_items_read ON public.order_items FOR SELECT TO authenticated USING (public.is_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id=order_id AND o.user_id=auth.uid()));
CREATE POLICY advances_admin ON public.advance_orders FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin()); CREATE POLICY advance_timeline_admin ON public.advance_order_timeline FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin()); CREATE POLICY advance_payments_admin ON public.advance_order_payments FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin()); CREATE POLICY settings_admin ON public.store_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname='create_order_with_stock' LOOP
    EXECUTE 'REVOKE ALL ON FUNCTION ' || f.signature || ' FROM anon, public';
    EXECUTE 'GRANT EXECUTE ON FUNCTION ' || f.signature || ' TO authenticated';
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
