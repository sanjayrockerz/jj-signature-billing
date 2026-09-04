-- Repair legacy history rows whose recorded_at was initially backfilled from
-- a manually-entered/future billing date. The invoice sequence is the stable
-- creation order for those existing bills, while created_at remains the date
-- displayed on the invoice.

WITH ordered_legacy_orders AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      ORDER BY
        CASE WHEN invoice_no ~ '[0-9]+$' THEN 0 ELSE 1 END,
        CASE
          WHEN invoice_no ~ '[0-9]+$'
            THEN substring(invoice_no FROM '([0-9]+)$')::BIGINT
          ELSE NULL
        END NULLS LAST,
        created_at ASC,
        id ASC
    ) AS history_position
  FROM public.orders
)
UPDATE public.orders AS orders_row
SET recorded_at = TIMESTAMPTZ '2000-01-01 00:00:00+00'
                 + (ordered_legacy_orders.history_position * INTERVAL '1 second')
FROM ordered_legacy_orders
WHERE orders_row.id = ordered_legacy_orders.id;

CREATE INDEX IF NOT EXISTS idx_orders_recorded_at
  ON public.orders (recorded_at DESC, created_at DESC, id DESC);

NOTIFY pgrst, 'reload schema';
