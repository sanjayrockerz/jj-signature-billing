-- J.J Signature Phase 2: expenses, inventory classification, and stock ledger.
-- Reuses the existing public.products and public.categories tables.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS track_inventory BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS expense_categories_name_unique
  ON public.expense_categories (LOWER(BTRIM(name)));

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date DATE NOT NULL,
  category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL CHECK (length(BTRIM(description)) > 0),
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS expenses_date_idx ON public.expenses (expense_date DESC);
CREATE INDEX IF NOT EXISTS expenses_category_idx ON public.expenses (category_id);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity_change NUMERIC(12,3) NOT NULL CHECK (quantity_change <> 0),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('RESTOCK', 'SALE', 'DAMAGE', 'LOSS', 'MANUAL_ADJUSTMENT')),
  reason TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stock_movements_product_date_idx
  ON public.stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_type_date_idx
  ON public.stock_movements (movement_type, created_at DESC);

INSERT INTO public.expense_categories (name)
VALUES ('Maintenance'), ('Marketing'), ('Other'), ('Rent'), ('Salaries'), ('Supplies'), ('Utilities')
ON CONFLICT DO NOTHING;

-- Inventory categories are the existing shared catalog categories. These are
-- inserted only when absent and never overwrite admin-created categories.
INSERT INTO public.categories (name_en, name_ta, is_active, sort_order)
VALUES ('Sarees', '', TRUE, 1), ('Salwar', '', TRUE, 2), ('Nighty', '', TRUE, 3)
ON CONFLICT (name_en) DO NOTHING;

CREATE OR REPLACE FUNCTION public.record_sale_stock_movement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tracks_inventory BOOLEAN;
BEGIN
  IF NEW.product_id IS NULL OR NEW.is_manual IS TRUE THEN RETURN NEW; END IF;
  SELECT p.track_inventory INTO tracks_inventory FROM public.products p WHERE p.id = NEW.product_id;
  IF COALESCE(tracks_inventory, TRUE) THEN
    INSERT INTO public.stock_movements (product_id, quantity_change, movement_type, reason, created_by)
    VALUES (NEW.product_id, -ABS(NEW.quantity), 'SALE', 'Completed sale', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

-- The existing billing RPC updates product stock directly. This guard keeps
-- service products non-stock-tracked without changing that RPC signature.
CREATE OR REPLACE FUNCTION public.prevent_service_stock_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT COALESCE(OLD.track_inventory, TRUE) THEN
    NEW.stock_quantity := OLD.stock_quantity;
    NEW.stock := OLD.stock;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_stock_guard ON public.products;
CREATE TRIGGER service_stock_guard
BEFORE UPDATE OF stock_quantity, stock ON public.products
FOR EACH ROW EXECUTE FUNCTION public.prevent_service_stock_change();

DROP TRIGGER IF EXISTS order_item_sale_stock_movement ON public.order_items;
CREATE TRIGGER order_item_sale_stock_movement
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION public.record_sale_stock_movement();

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id BIGINT,
  p_quantity_change NUMERIC,
  p_movement_type TEXT,
  p_reason TEXT DEFAULT ''
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result_row public.products;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_quantity_change = 0 THEN RAISE EXCEPTION 'Stock adjustment cannot be zero'; END IF;
  IF p_movement_type NOT IN ('RESTOCK', 'DAMAGE', 'LOSS', 'MANUAL_ADJUSTMENT') THEN
    RAISE EXCEPTION 'Invalid stock movement type';
  END IF;

  UPDATE public.products
  SET stock_quantity = GREATEST(stock_quantity + p_quantity_change, 0),
      stock = GREATEST(FLOOR(stock_quantity + p_quantity_change), 0)::INTEGER,
      updated_at = NOW()
  WHERE id = p_product_id AND track_inventory;
  IF NOT FOUND THEN RAISE EXCEPTION 'Inventory product not found'; END IF;

  INSERT INTO public.stock_movements (product_id, quantity_change, movement_type, reason, created_by)
  VALUES (p_product_id, p_quantity_change, p_movement_type, BTRIM(COALESCE(p_reason, '')), auth.uid());

  SELECT * INTO result_row FROM public.products WHERE id = p_product_id;
  RETURN result_row;
END;
$$;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS expense_categories_admin ON public.expense_categories;
CREATE POLICY expense_categories_admin ON public.expense_categories FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS expenses_admin ON public.expenses;
CREATE POLICY expenses_admin ON public.expenses FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS stock_movements_admin ON public.stock_movements;
CREATE POLICY stock_movements_admin ON public.stock_movements FOR SELECT TO authenticated
  USING (public.is_admin());

REVOKE ALL ON FUNCTION public.adjust_product_stock(BIGINT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(BIGINT, NUMERIC, TEXT, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
