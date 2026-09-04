-- Keep the actual time a bill was created separate from the optional bill date.
--
-- The POS screen allows staff to enter an older billing date. That value is
-- stored in orders.created_at for invoice display, but using it for history
-- ordering makes a newly-created bill appear below older bills. recorded_at
-- is immutable application metadata for chronological history ordering.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

-- Preserve the existing order as closely as possible for historical rows.
UPDATE public.orders
SET recorded_at = created_at
WHERE recorded_at IS NULL;

ALTER TABLE public.orders
  ALTER COLUMN recorded_at SET DEFAULT NOW(),
  ALTER COLUMN recorded_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_recorded_at
  ON public.orders (recorded_at DESC, created_at DESC, id DESC);

-- The public/shared portal uses the anon role rather than Supabase Auth.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.orders TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
