-- ============================================================
-- JJ SIGNATURE AUDIT FIX — 20260808_0003
-- Fixes found during full system audit on 2026-08-08
-- ============================================================

-- FIX 1: Add missing reference_number column to advance_orders
-- (frontend was trying to update this column but it never existed)
ALTER TABLE public.advance_orders 
  ADD COLUMN IF NOT EXISTS reference_number TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_advance_orders_reference_number 
  ON public.advance_orders(reference_number);

-- FIX 2 & 3: Update complete_advance_order_v2 to:
--   a) Write BOTH base_price AND unit_price in order_items (POS uses unit_price, advance order was only writing base_price)
--   b) Include gst_enabled and split_details in the orders insert (they are NOT NULL columns)
CREATE OR REPLACE FUNCTION public.complete_advance_order_v2(
  p_order_id uuid,
  p_payment_method text,
  p_final_amount numeric,
  p_coupon_code text DEFAULT NULL,
  p_coupon_percentage numeric DEFAULT 0,
  p_manual_discount numeric DEFAULT 0,
  p_remarks text DEFAULT ''
)
RETURNS TABLE(order_id uuid, invoice_no text, completed_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_advance        public.advance_orders;
  v_order_id       uuid := gen_random_uuid();
  v_invoice        text;
  v_now            timestamptz := now();
  v_items          jsonb;
  v_item           jsonb;
  v_total_discount numeric := 0;
  v_item_price     numeric;
  v_item_qty       numeric;
  v_item_total     numeric;
BEGIN
  -- Validate payment method
  IF lower(coalesce(p_payment_method, '')) NOT IN ('cash', 'upi', 'card') THEN
    RAISE EXCEPTION 'Select a valid payment method';
  END IF;

  -- Lock and fetch the advance order
  SELECT * INTO v_advance FROM public.advance_orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Advance order not found';
  END IF;
  IF v_advance.status = 'cancelled' THEN
    RAISE EXCEPTION 'A cancelled order cannot be completed';
  END IF;
  IF v_advance.completed_order_id IS NOT NULL OR v_advance.invoice_number IS NOT NULL THEN
    RAISE EXCEPTION 'Invoice already generated for this order';
  END IF;

  -- Calculate total discount
  v_total_discount := p_manual_discount + (v_advance.remaining_balance - p_manual_discount - p_final_amount);
  IF v_total_discount < 0 THEN v_total_discount := 0; END IF;

  -- Generate invoice number with INV prefix + 8 digits
  v_invoice := 'INV' || LPAD(nextval('public.invoice_number_seq')::TEXT, 8, '0');

  -- Build items JSONB
  v_items := CASE
    WHEN jsonb_typeof(v_advance.products) = 'array' AND jsonb_array_length(v_advance.products) > 0
      THEN v_advance.products
    ELSE jsonb_build_array(jsonb_build_object(
        'name', v_advance.product_name, 'category', v_advance.category,
        'description', v_advance.description, 'quantity', 1,
        'base_price', v_advance.total_amount, 'line_total', v_advance.total_amount,
        'unit', 'piece', 'unit_type', 'unit', 'source', 'advance_order'
    ))
  END;

  -- Create the final sale order (including gst_enabled and split_details)
  INSERT INTO public.orders (
    id, invoice_no, customer_name, phone, address, user_id,
    items, subtotal, total, status, order_mode, order_type,
    shipping, delivery_charge, discount_amount, manual_discount_amount,
    coupon_code, coupon_percentage, manual_discount_type, manual_discount_value,
    payment_mode, payment_method, gst_enabled, split_details, created_at, updated_at
  ) VALUES (
    v_order_id, v_invoice,
    v_advance.customer_name, v_advance.phone, v_advance.address, auth.uid(),
    v_items, v_advance.total_amount, greatest(0, v_advance.total_amount - v_total_discount),
    'completed', 'offline', 'advance_order',
    0, 0, v_total_discount, p_manual_discount,
    p_coupon_code, p_coupon_percentage, 'flat', p_manual_discount,
    lower(p_payment_method), lower(p_payment_method),
    FALSE, '{}'::jsonb,
    v_now, v_now
  );

  -- Insert order_items with BOTH base_price AND unit_price for data consistency
  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items) LOOP
    v_item_price := greatest(coalesce((v_item->>'base_price')::numeric, 0), 0);
    v_item_qty   := greatest(coalesce((v_item->>'quantity')::numeric, 1), 0);
    v_item_total := greatest(coalesce((v_item->>'line_total')::numeric, 0), 0);

    INSERT INTO public.order_items (
      order_id, product_name, name, quantity, unit, unit_type,
      base_price, unit_price, line_total, is_manual, source
    ) VALUES (
      v_order_id,
      coalesce(nullif(trim(v_item->>'name'), ''), 'Product'),
      coalesce(nullif(trim(v_item->>'name'), ''), 'Product'),
      v_item_qty,
      coalesce(nullif(v_item->>'unit', ''), 'piece'),
      coalesce(nullif(v_item->>'unit_type', ''), 'unit'),
      v_item_price,
      v_item_price,  -- unit_price = base_price for data consistency with POS checkout
      v_item_total,
      false,
      coalesce(nullif(v_item->>'source', ''), 'advance_order')
    );
  END LOOP;

  -- Record the final payment received
  INSERT INTO public.advance_order_payments (
    advance_order_id, payment_type, amount, payment_method, remarks, received_by, received_at
  ) VALUES (
    p_order_id, 'remaining', p_final_amount,
    lower(p_payment_method), coalesce(p_remarks, ''), auth.uid(), v_now
  );

  -- Mark advance order as completed
  UPDATE public.advance_orders SET
    status               = 'completed',
    completed_at         = v_now,
    completed_order_id   = v_order_id,
    invoice_number       = v_invoice,
    final_payment_method = lower(p_payment_method),
    remarks              = CASE WHEN trim(coalesce(p_remarks, '')) = '' THEN remarks ELSE p_remarks END,
    updated_at           = v_now
  WHERE id = p_order_id;

  -- Timeline events
  INSERT INTO public.advance_order_timeline (
    advance_order_id, event_type, label, remarks, created_by, created_at
  ) VALUES
    (p_order_id, 'remaining_payment_received', 'Remaining Payment Received', coalesce(p_remarks, ''), auth.uid(), v_now),
    (p_order_id, 'invoice_generated', 'Invoice Generated', v_invoice, auth.uid(), v_now);

  RETURN QUERY SELECT v_order_id, v_invoice, v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_advance_order_v2(uuid, text, numeric, text, numeric, numeric, text)
  TO public, anon, authenticated;

NOTIFY pgrst, 'reload schema';
