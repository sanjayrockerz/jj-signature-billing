import { supabase } from '../lib/supabase'

export type StockMovement = {
  id: string
  product_id: number
  quantity_change: number
  movement_type: 'RESTOCK' | 'SALE' | 'DAMAGE' | 'LOSS' | 'MANUAL_ADJUSTMENT'
  reason: string
  created_by: string | null
  created_at: string
}

export async function listStockMovements(from?: string, to?: string) {
  let query = supabase.from('stock_movements').select('*').order('created_at', { ascending: false })
  if (from) query = query.gte('created_at', `${from}T00:00:00`)
  if (to) query = query.lte('created_at', `${to}T23:59:59`)
  return query
}

export function adjustProductStock(productId: number, quantityChange: number, movementType: StockMovement['movement_type'], reason: string) {
  return supabase.rpc('adjust_product_stock', {
    p_product_id: productId,
    p_quantity_change: quantityChange,
    p_movement_type: movementType,
    p_reason: reason.trim(),
  })
}
