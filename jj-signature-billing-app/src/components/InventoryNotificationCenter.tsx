import { useEffect, useRef, useState } from 'react'
import { Bell, Check, ExternalLink, Volume2, VolumeX, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { isSupabaseConfigured } from '../lib/supabase'
import { listInventoryAlerts, markAllInventoryAlertsRead, markInventoryAlertRead, type InventoryAlert } from '../services/inventoryAlertService'
import { isInventorySoundEnabled, playInventoryAlertSound, setInventorySoundEnabled, unlockInventoryAlertSound } from '../services/inventoryAlertSound'
import { useNavigate } from 'react-router-dom'

const productName = (alert: InventoryAlert) => alert.product?.name || 'Inventory product'
const formatAlertTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function InventoryNotificationCenter() {
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState<InventoryAlert[]>([])
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<InventoryAlert | null>(null)
  const [soundsEnabled, setSoundsEnabled] = useState(() => isInventorySoundEnabled())
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const seenIds = useRef(new Set<string>())

  const refresh = async () => {
    if (!isSupabaseConfigured) return
    const result = await listInventoryAlerts()
    if (!result.error) setAlerts((result.data || []) as unknown as InventoryAlert[])
  }

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => { void refresh() }, 0)
    if (!isSupabaseConfigured) return
    const channel = supabase.channel('admin-inventory-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inventory_alerts' }, async payload => {
        const newAlert = payload.new as InventoryAlert
        if (seenIds.current.has(newAlert.id)) return
        seenIds.current.add(newAlert.id)
        const detail = await supabase.from('inventory_alerts').select('id, product_id, alert_type, stock_quantity, threshold, message, is_read, created_at, read_at, products(name)').eq('id', newAlert.id).single()
        const alert = (detail.data || newAlert) as unknown as InventoryAlert
        await refresh()
        setToast(alert)
        void playInventoryAlertSound(alert.alert_type)
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification(alert.alert_type === 'OUT_OF_STOCK' ? `Out of Stock: ${productName(alert)}` : `Low Stock: ${productName(alert)}`, {
            body: alert.alert_type === 'OUT_OF_STOCK' ? 'The product is now out of stock.' : alert.message || `Current stock: ${alert.stock_quantity}.`,
            tag: `inventory-alert-${alert.id}`,
          })
        }
        window.setTimeout(() => setToast(current => current?.id === alert.id ? null : current), 6500)
      })
      .subscribe()
    return () => { window.clearTimeout(initialRefresh); void supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!soundsEnabled) return
    const unlock = () => { void unlockInventoryAlertSound() }
    window.addEventListener('pointerdown', unlock, { once: true })
    return () => window.removeEventListener('pointerdown', unlock)
  }, [soundsEnabled])

  const unreadCount = alerts.filter(alert => !alert.is_read).length
  const toggleSounds = async () => {
    const enabled = !soundsEnabled
    setSoundsEnabled(enabled)
    setInventorySoundEnabled(enabled)
    if (enabled) { await unlockInventoryAlertSound(); void playInventoryAlertSound('LOW_STOCK') }
  }
  const enableBrowserNotifications = async () => {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setPermission(result)
  }
  const markRead = async (id: string) => {
    const result = await markInventoryAlertRead(id)
    if (!result.error) setAlerts(current => current.map(alert => alert.id === id ? { ...alert, is_read: true, read_at: new Date().toISOString() } : alert))
  }
  const goToProduct = (alert: InventoryAlert) => { setOpen(false); setToast(null); navigate(`/inventory?product=${alert.product_id}`) }

  return <>
    <div className="relative z-10 shrink-0">
      <button type="button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-label={`${unreadCount} unread inventory alerts`} className="touch-target relative inline-flex items-center justify-center rounded-xl border border-borderLight bg-[#FFFDF8] hover:bg-[#EDE4D4]">
        <Bell size={19} />
        {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#171717] px-1 text-[10px] font-black text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
      </button>
      {open && <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[100] w-[min(92vw,390px)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-borderLight bg-[#FFFDF8] shadow-2xl">
        <div className="flex items-center justify-between border-b border-borderLight px-4 py-3"><div><p className="text-sm font-black">Inventory alerts</p><p className="text-xs text-textMuted">{unreadCount} unread</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close alerts" className="touch-target inline-flex items-center justify-center rounded-lg"><X size={17} /></button></div>
        <div className="max-h-[min(65vh,480px)] overflow-y-auto p-2">
          {alerts.length === 0 ? <p className="px-3 py-8 text-center text-sm text-textMuted">No inventory alerts yet.</p> : alerts.map(alert => <article key={alert.id} className={`rounded-xl p-3 ${alert.is_read ? 'opacity-65' : 'bg-[#F3EBDD]'}`}>
            <div className="flex items-start gap-3"><div className={`mt-0.5 rounded-full p-2 ${alert.alert_type === 'OUT_OF_STOCK' ? 'bg-[#171717] text-white' : 'bg-[#CBB89D]'}`}><Bell size={14} /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-[11px] font-black uppercase tracking-[.14em]">{alert.alert_type === 'OUT_OF_STOCK' ? 'Out of stock' : 'Low stock'}</p>{!alert.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#171717]" aria-label="Unread" />}</div><p className="mt-1 break-words font-black">{productName(alert)}</p><p className="mt-1 text-xs text-textMuted">Stock: {alert.stock_quantity}{alert.threshold !== null && ` · Alert at: ${alert.threshold}`}</p><p className="mt-1 text-[11px] text-textMuted">{formatAlertTime(alert.created_at)}</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" onClick={() => goToProduct(alert)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-borderLight px-2.5 text-[11px] font-black"><ExternalLink size={13} />View product</button>{!alert.is_read && <button type="button" onClick={() => void markRead(alert.id)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-borderLight px-2.5 text-[11px] font-black"><Check size={13} />Mark read</button>}</div></div></div>
          </article>)}
        </div>
        <div className="border-t border-borderLight p-3"><div className="flex flex-wrap gap-2"><button type="button" onClick={() => void toggleSounds()} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border border-borderLight px-3 text-xs font-black">{soundsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}{soundsEnabled ? 'Sounds enabled' : 'Enable sounds'}</button>{permission === 'default' && <button type="button" onClick={() => void enableBrowserNotifications()} className="min-h-10 flex-1 rounded-xl border border-borderLight px-3 text-xs font-black">Enable browser alerts</button>}</div>{unreadCount > 0 && <button type="button" onClick={async () => { const result = await markAllInventoryAlertsRead(); if (!result.error) setAlerts(current => current.map(alert => ({ ...alert, is_read: true, read_at: new Date().toISOString() }))) }} className="mt-2 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-xl text-xs font-black text-textMuted"><Check size={14} />Mark all as read</button>}</div>
      </div>}
    </div>
    {toast && <div role="status" className="fixed bottom-4 right-4 z-[130] w-[min(calc(100vw-2rem),390px)] rounded-2xl border border-borderLight bg-[#FFFDF8] p-4 shadow-2xl"><button type="button" onClick={() => setToast(null)} aria-label="Dismiss notification" className="absolute right-2 top-2 rounded-lg p-2"><X size={15} /></button><p className="text-[11px] font-black uppercase tracking-[.16em]">{toast.alert_type === 'OUT_OF_STOCK' ? '⚠ Out of stock' : 'Low stock'}</p><p className="mt-2 font-black">{productName(toast)}</p><p className="mt-1 text-sm text-textMuted">{toast.alert_type === 'OUT_OF_STOCK' ? 'Current stock: 0' : toast.message || `Current stock: ${toast.stock_quantity}.`}</p><button type="button" onClick={() => goToProduct(toast)} className="mt-3 min-h-10 rounded-xl border border-borderLight px-3 text-xs font-black">View product</button></div>}
  </>
}
