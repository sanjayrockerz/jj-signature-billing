-- Repair category relationships for products created before the category_id
-- flow was made consistent. This only updates products whose text category
-- matches an existing category; it does not delete products or orders.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS remarks TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reference_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;

UPDATE public.products AS p
SET category_id = c.id,
    category = c.name_en,
    updated_at = NOW()
FROM public.categories AS c
WHERE LOWER(BTRIM(COALESCE(p.category, ''))) = LOWER(BTRIM(c.name_en))
  AND (p.category_id IS DISTINCT FROM c.id);

-- Keep the denormalized display label correct for every already-linked product.
UPDATE public.products AS p
SET category = c.name_en,
    updated_at = NOW()
FROM public.categories AS c
WHERE p.category_id = c.id
  AND p.category IS DISTINCT FROM c.name_en;

NOTIFY pgrst, 'reload schema';
