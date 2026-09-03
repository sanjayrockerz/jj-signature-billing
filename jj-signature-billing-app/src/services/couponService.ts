import { isSupabaseConfigured, supabase } from '../lib/supabase'

export type AppliedCoupon = {
  code: string
  percentage: number
  discountType: 'percentage' | 'fixed'
  discountValue: number
  maximumDiscount: number | null
  discount: number
}

export async function validateCoupon(rawCode: string, subtotal: number): Promise<{ data: AppliedCoupon | null; error: string | null }> {
  const code = rawCode.trim().toUpperCase()
  if (!isSupabaseConfigured) return { data: null, error: 'Coupon validation requires a live connection' }
  try {
    const { data, error } = await supabase.rpc('validate_coupon', { p_code: code, p_subtotal: subtotal })
    if (error || !data) return { data: null, error: error?.message || 'Invalid or expired coupon code' }
    const row = data as Record<string, unknown>
    return {
      data: {
        code: String(row.code || code),
        percentage: Number(row.percentage || 0),
        discountType: row.discount_type === 'fixed' ? 'fixed' : 'percentage',
        discountValue: Number(row.discount_value || 0),
        maximumDiscount: row.maximum_discount == null ? null : Number(row.maximum_discount),
        discount: Number(row.discount || 0),
      },
      error: null,
    }
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Failed to validate coupon. Try again.' }
  }
}
