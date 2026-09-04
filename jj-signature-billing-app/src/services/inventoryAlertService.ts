import { supabase } from '../lib/supabase'

export type InventoryAlertType = 'LOW_STOCK' | 'OUT_OF_STOCK'

export type InventoryAlert = {
  id: string
  product_id: string | number
  alert_type: InventoryAlertType
  stock_quantity: number
  threshold: number | null
  message: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
  product?: { name?: string | null } | null
}

export async function listInventoryAlerts(limit = 30) {
  return supabase
    .from('inventory_alerts')
    .select('id, product_id, alert_type, stock_quantity, threshold, message, is_read, created_at, read_at, products(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
}

export async function markInventoryAlertRead(id: string) {
  return supabase
    .from('inventory_alerts')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
}

export async function markAllInventoryAlertsRead() {
  return supabase
    .from('inventory_alerts')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false)
}
