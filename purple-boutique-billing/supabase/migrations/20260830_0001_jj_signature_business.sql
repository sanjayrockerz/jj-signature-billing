-- JJ Signature target-business configuration.
-- Applied only to the separate JJ Signature database; no production data is copied.

UPDATE public.products
SET is_active = FALSE, updated_at = NOW()
WHERE LOWER(BTRIM(COALESCE(category, ''))) IN (
  'tailoring', 'jewellery & accessories', 'posstore',
  'frames', 'lenses', 'contact lenses', 'solutions', 'surfaces', 'reading glasses'
)
OR category_id IN (
  SELECT id FROM public.categories
  WHERE LOWER(BTRIM(name_en)) IN (
    'tailoring', 'jewellery & accessories', 'posstore',
    'frames', 'lenses', 'contact lenses', 'solutions', 'surfaces', 'reading glasses'
  )
);

UPDATE public.categories
SET is_active = FALSE, updated_at = NOW()
WHERE LOWER(BTRIM(name_en)) IN (
  'tailoring', 'jewellery & accessories', 'posstore',
  'frames', 'lenses', 'contact lenses', 'solutions', 'surfaces', 'reading glasses'
);

INSERT INTO public.categories (name_en, name_ta, is_active, sort_order)
VALUES ('Sarees', '', TRUE, 1), ('Salwar', '', TRUE, 2), ('Nighty', '', TRUE, 3)
ON CONFLICT (name_en) DO UPDATE SET is_active = TRUE, sort_order = EXCLUDED.sort_order, updated_at = NOW();

UPDATE public.store_settings
SET name = 'JJ Signature', owner_name = '', phone = '+91 63790 48966',
    email = 'safasignora@gmail.com',
    address = '31 A, Blue Star Building, Madurai Road, Junction, Tirunelveli - 627001',
    updated_at = NOW()
WHERE id = 1;

NOTIFY pgrst, 'reload schema';
