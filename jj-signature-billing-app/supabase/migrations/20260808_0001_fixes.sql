-- Fix 1: Ensure gst_enabled and split_details exist (from migration 0003)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='gst_enabled') THEN
    ALTER TABLE public.orders ADD COLUMN gst_enabled BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='split_details') THEN
    ALTER TABLE public.orders ADD COLUMN split_details JSONB NOT NULL DEFAULT '{}'::JSONB;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='order_items' AND column_name='variant_name') THEN
    ALTER TABLE public.order_items ADD COLUMN variant_name TEXT;
    ALTER TABLE public.order_items ADD COLUMN unit_price NUMERIC(12,2) NOT NULL DEFAULT 0;
    ALTER TABLE public.order_items ADD COLUMN source TEXT NOT NULL DEFAULT 'catalogue';
    ALTER TABLE public.order_items ADD COLUMN note TEXT;
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq;

DO $$
DECLARE
  v_max_suffix BIGINT;
  v_sequence_value BIGINT;
BEGIN
  SELECT COALESCE(MAX((regexp_match(invoice_no, '-([0-9]+)$'))[1]::BIGINT), 0)
  INTO v_max_suffix
  FROM public.orders
  WHERE invoice_no ~ '-[0-9]+$';
  
  SELECT last_value INTO v_sequence_value FROM public.invoice_number_seq;
  
  PERFORM setval('public.invoice_number_seq', GREATEST(v_max_suffix, v_sequence_value, 1), TRUE);
EXCEPTION WHEN OTHERS THEN
  -- Ignore sequence errors if no rows
END;
$$;


-- Fix 2: Update create_advance_order and table constraints to allow 0 deposit and 100% deposit
ALTER TABLE public.advance_orders DROP CONSTRAINT IF EXISTS advance_orders_deposit_amount_check;
ALTER TABLE public.advance_orders ADD CONSTRAINT advance_orders_deposit_amount_check CHECK (deposit_amount >= 0);

ALTER TABLE public.advance_orders DROP CONSTRAINT IF EXISTS advance_deposit_less_than_total;
ALTER TABLE public.advance_orders ADD CONSTRAINT advance_deposit_less_than_total CHECK (deposit_amount <= total_amount);

CREATE OR REPLACE FUNCTION public.create_advance_order(
  p_customer_name text, p_phone text, p_address text, p_product_name text,
  p_category text, p_description text, p_total_amount numeric, p_deposit_amount numeric,
  p_expected_delivery_date date, p_remarks text, p_payment_method text, p_created_by_name text,
  p_products jsonb default '[]'::jsonb
)
RETURNS public.advance_orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE 
  v_order public.advance_orders; 
  v_now timestamptz := now(); 
  v_deposit_id text;
BEGIN
  if trim(coalesce(p_customer_name,'')) = '' then raise exception 'Customer name is required'; end if;
  if trim(coalesce(p_phone,'')) = '' then raise exception 'Phone number is required'; end if;
  if trim(coalesce(p_product_name,'')) = '' then raise exception 'Product name is required'; end if;
  if coalesce(p_total_amount,0) <= 0 then raise exception 'Total amount must be greater than zero'; end if;
  
  -- ALOW 0 DEPOSIT AND 100% DEPOSIT HERE
  if coalesce(p_deposit_amount,0) < 0 or p_deposit_amount > p_total_amount then 
    raise exception 'Deposit cannot be negative or greater than total amount'; 
  end if;
  
  if lower(coalesce(p_payment_method,'')) not in ('cash','upi','card') then raise exception 'Select a valid deposit payment method'; end if;
  
  v_deposit_id := 'DEP-' || to_char(v_now at time zone 'Asia/Kolkata','YYYYMMDD') || '-' || lpad(nextval('public.deposit_number_seq')::text,4,'0');
  
  insert into public.advance_orders(
    deposit_id, customer_name, phone, address, product_name, products, category, description,
    total_amount, deposit_amount, expected_delivery_date, remarks, created_by, created_by_name, created_at, updated_at
  )
  values(
    v_deposit_id, trim(p_customer_name), trim(p_phone), trim(coalesce(p_address,'')), trim(p_product_name), 
    case when jsonb_typeof(coalesce(p_products,'[]'::jsonb))='array' then coalesce(p_products,'[]'::jsonb) else '[]'::jsonb end,
    trim(coalesce(p_category,'')), trim(coalesce(p_description,'')), round(p_total_amount,2), round(p_deposit_amount,2), 
    p_expected_delivery_date, trim(coalesce(p_remarks,'')), auth.uid(), trim(coalesce(p_created_by_name,'')), v_now, v_now
  )
  returning * into v_order;
  
  return v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_advance_order(text,text,text,text,text,text,numeric,numeric,date,text,text,text,jsonb) TO public, anon, authenticated;

NOTIFY pgrst, 'reload schema';
