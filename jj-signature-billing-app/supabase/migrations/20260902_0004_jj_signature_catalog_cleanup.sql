-- J.J Signature catalog guardrail.
-- Run this only on the dedicated J.J Signature database before entering the
-- real catalog. It removes legacy template categories/products without
-- touching customers, orders, or billing logic.

DO $$
DECLARE
  legacy_categories CONSTANT text[] := ARRAY[
    'tailoring', 'jewellery & accessories', 'jewellery', 'jewelry',
    'posstore', 'frames', 'fames', 'lenses', 'contact lenses',
    'solutions', 'surfaces', 'reading glasses'
  ];
BEGIN
  DELETE FROM public.products p
  WHERE LOWER(BTRIM(COALESCE(p.category, ''))) = ANY (legacy_categories)
     OR p.category_id IN (
       SELECT c.id
       FROM public.categories c
       WHERE LOWER(BTRIM(c.name_en)) = ANY (legacy_categories)
     );

  DELETE FROM public.categories c
  WHERE LOWER(BTRIM(c.name_en)) = ANY (legacy_categories);
END $$;

INSERT INTO public.categories (name_en, name_ta, is_active, sort_order)
VALUES
  ('Sarees', '', TRUE, 1),
  ('Salwar', '', TRUE, 2),
  ('Nighty', '', TRUE, 3)
ON CONFLICT (name_en) DO UPDATE SET
  is_active = TRUE,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Products are intentionally not seeded. Each variety is entered manually
-- under one of the three categories from the admin portal.
