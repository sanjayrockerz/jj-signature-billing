import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BarChart3, Boxes, Box, FileText, List, LogOut, Menu, Package, ReceiptIndianRupee, ShoppingCart, X } from 'lucide-react'
import { useState } from 'react'
import { BRAND_EN, BRAND_LOGO } from '../lib/brand'
import { useAdminAuthStore } from '../store/store'

const links = [
  { href: '/pos', label: 'Billing Panel', icon: ShoppingCart },
  { href: '/advance-orders', label: 'Advance Orders', icon: FileText },
  { href: '/dashboard?tab=categories', label: 'Categories', icon: Package },
  { href: '/dashboard?tab=history', label: 'Order History', icon: List },
  { href: '/pos-analytics', label: 'Analytics Dashboard', icon: BarChart3 },
  { href: '/dashboard?tab=coupons', label: 'Coupons', icon: Box },
  { href: '/inventory', label: 'Inventory & Products', icon: Boxes },
  { href: '/expenses', label: 'Expense Tracker', icon: ReceiptIndianRupee },
]

export function AdminModuleShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const logout = useAdminAuthStore(state => state.logout)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const go = (href: string) => { setMobileNavOpen(false); navigate(href) }
  return (
    <div className="admin-shell flex min-h-screen bg-bgMain text-textMain">
      <aside className="hidden w-[260px] shrink-0 flex-col border-r border-borderLight bg-[#E5D4B8] lg:flex">
        <Link to="/dashboard" className="flex items-center gap-3 border-b border-borderLight px-5 py-5">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-borderLight bg-cardBg p-1 shadow-sm"><img src={BRAND_LOGO} alt={`${BRAND_EN} logo`} className="h-full w-full object-contain" /></span>
          <span className="truncate text-[20px] font-black tracking-tight text-[#171717]">{BRAND_EN}</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-2 px-4 py-4">
          {links.map(({ href, label, icon: Icon }) => {
            const [path, search = ''] = href.split('?')
            const active = location.pathname === path
              && (search ? location.search === `?${search}` : true)
            return <Link key={href} to={href} className={`flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold transition-colors ${active ? 'bg-[#CBB89D] text-[#171717] shadow-sm' : 'text-[#171717] hover:bg-[#FFFDF8]'}`}><Icon size={18} />{label}</Link>
          })}
        </nav>
        <button onClick={() => { logout(); navigate('/admin-login', { replace: true }) }} className="mb-5 mx-4 flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-bold text-[#171717] hover:bg-[#FFFDF8]"><LogOut size={18} />Logout</button>
      </aside>
      <main className="min-w-0 flex-1">
        <div className="border-b border-borderLight bg-cardBg px-4 py-4 sm:px-8 sm:py-5">
          <div className="mx-auto flex max-w-7xl items-start gap-3">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation" className="touch-target mt-0.5 inline-flex items-center justify-center rounded-xl border border-borderLight bg-[#FFFDF8] lg:hidden"><Menu size={20} /></button>
            <div className="min-w-0"><div className="mb-1 flex items-center gap-2 text-xs font-black uppercase tracking-[.2em] text-textMuted lg:hidden"><img src={BRAND_LOGO} alt="" className="h-7 w-7 rounded-lg object-contain" />{BRAND_EN}</div><h1 className="text-2xl font-black tracking-tight text-[#171717] sm:text-3xl">{title}</h1><p className="mt-1 text-sm text-textMuted">{subtitle}</p></div>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-8 sm:py-8">{children}</div>
      </main>
      {mobileNavOpen && <div className="fixed inset-0 z-[120] lg:hidden" role="dialog" aria-label="Navigation">
        <button type="button" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} className="absolute inset-0 bg-black/35" />
        <div className="relative flex h-full w-[min(86vw,320px)] flex-col bg-[#E5D4B8] p-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-borderLight pb-4"><div className="flex min-w-0 items-center gap-3"><img src={BRAND_LOGO} alt={`${BRAND_EN} logo`} className="h-10 w-10 rounded-xl bg-[#FFFDF8] object-contain p-1" /><span className="truncate text-lg font-black">{BRAND_EN}</span></div><button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation" className="touch-target inline-flex items-center justify-center rounded-xl"><X size={20} /></button></div>
          <nav className="mt-4 flex flex-col gap-2">{links.map(({ href, label, icon: Icon }) => { const [path, search = ''] = href.split('?'); const active = location.pathname === path && (search ? location.search === `?${search}` : true); return <button type="button" key={href} onClick={() => go(href)} className={`flex min-h-12 items-center gap-3 rounded-xl px-4 text-left text-sm font-bold ${active ? 'bg-[#CBB89D]' : 'hover:bg-[#FFFDF8]'}`}><Icon size={18} />{label}</button> })}</nav>
          <button type="button" onClick={() => { setMobileNavOpen(false); logout(); navigate('/admin-login', { replace: true }) }} className="mt-auto flex min-h-12 items-center gap-3 rounded-xl px-4 text-sm font-bold hover:bg-[#FFFDF8]"><LogOut size={18} />Logout</button>
        </div>
      </div>}
    </div>
  )
}
