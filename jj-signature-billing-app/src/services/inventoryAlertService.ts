import { supabase } from '../lib/supabase'

let inventoryAlertsTableMissing = false

const isMissingRelation = (error: { code?: string; status?: number } | null | undefined) =>
  error?.status === 404 || error?.code === 'PGRST205' || error?.code === '42P01'

export const isInventoryAlertsTableMissing = () => inventoryAlertsTableMissing

const requestInventoryAlerts = async (limit: number) => {
  const result = await supabase
    .from('inventory_alerts')
    .select('id, product_id, alert_type, stock_quantity, threshold, message, is_read, created_at, read_at, products(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (isMissingRelation(result.error)) inventoryAlertsTableMissing = true
  return result
}

let inventoryAlertsRequest: ReturnType<typeof requestInventoryAlerts> | null = null

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
  if (inventoryAlertsTableMissing) return { data: [], error: null }
  inventoryAlertsRequest ??= requestInventoryAlerts(limit)
  try { return await inventoryAlertsRequest } finally { inventoryAlertsRequest = null }
}

export async function markInventoryAlertRead(id: string) {
  if (inventoryAlertsTableMissing) return { data: null, error: null }
  const result = await supabase
    .from('inventory_alerts')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
  if (isMissingRelation(result.error)) inventoryAlertsTableMissing = true
  return result
}

export async function markAllInventoryAlertsRead() {
  if (inventoryAlertsTableMissing) return { data: null, error: null }
  const result = await supabase
    .from('inventory_alerts')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('is_read', false)
  if (isMissingRelation(result.error)) inventoryAlertsTableMissing = true
  return result
}
