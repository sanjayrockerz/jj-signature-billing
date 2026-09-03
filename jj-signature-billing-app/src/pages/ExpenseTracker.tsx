import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Edit3, Plus, Power, ReceiptIndianRupee, Trash2, X } from 'lucide-react'
import { AdminModuleShell } from '../components/AdminModuleShell'
import { createExpense, deleteExpense, listExpenseCategories, listExpenses, saveExpenseCategory, toggleExpenseCategory, updateExpense, type Expense, type ExpenseCategory } from '../services/expenseService'
import { downloadXlsx } from '../lib/xlsxExport'
import { formatCurrency } from '../lib/retail'

type Filter = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom'
const localDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
// DATE columns normally arrive as YYYY-MM-DD, but normalise defensively so
// Today/period totals also work if PostgREST returns a timestamp-shaped value.
const expenseDateKey = (value: unknown) => {
  const text = String(value ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : text
}
const today = () => localDateKey(new Date())
const startOfWeek = () => { const d = new Date(); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return localDateKey(d) }
const startOfMonth = () => { const d = new Date(); d.setDate(1); return localDateKey(d) }
const startOfYear = () => `${new Date().getFullYear()}-01-01`
const inputClass = 'w-full rounded-xl border border-borderLight bg-cardBg px-3 py-2.5 text-sm font-semibold text-textMain outline-none focus:border-[#CBB89D]'

export default function ExpenseTracker() {
  const [tab, setTab] = useState<'expenses' | 'categories'>('expenses')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [filter, setFilter] = useState<Filter>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [modal, setModal] = useState<'expense' | 'category' | null>(null)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [form, setForm] = useState({ expense_date: today(), category_id: '', description: '', amount: '', notes: '' })
  const [categoryName, setCategoryName] = useState('')
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const [expenseResult, categoryResult] = await Promise.all([listExpenses(), listExpenseCategories()])
    if (expenseResult.error) setNotice({ type: 'error', text: expenseResult.error.message })
    else setExpenses(((expenseResult.data || []) as Expense[]).map(expense => ({ ...expense, expense_date: expenseDateKey(expense.expense_date) })))
    if (categoryResult.error) setNotice({ type: 'error', text: categoryResult.error.message })
    else setCategories((categoryResult.data || []) as ExpenseCategory[])
    setLoading(false)
    return !expenseResult.error && !categoryResult.error
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void refresh() }, 0); return () => window.clearTimeout(timer) }, [refresh])

  const range = useMemo(() => {
    if (filter === 'today') return { from: today(), to: today() }
    if (filter === 'week') return { from: startOfWeek(), to: today() }
    if (filter === 'month') return { from: startOfMonth(), to: today() }
    if (filter === 'year') return { from: startOfYear(), to: today() }
    if (filter === 'custom') return { from: customFrom, to: customTo }
    return { from: '', to: '' }
  }, [filter, customFrom, customTo])
  const visibleExpenses = useMemo(() => expenses.filter(e => {
    const date = expenseDateKey(e.expense_date)
    return (!range.from || date >= range.from) && (!range.to || date <= range.to)
  }), [expenses, range])
  const totals = useMemo(() => {
    const sum = (rows: Expense[]) => rows.reduce((total, row) => total + Number(row.amount || 0), 0)
    const dated = (predicate: (date: string) => boolean) => expenses.filter(expense => predicate(expenseDateKey(expense.expense_date)))
    return { today: sum(dated(date => date === today())), week: sum(dated(date => date >= startOfWeek() && date <= today())), month: sum(dated(date => date >= startOfMonth() && date <= today())), year: sum(dated(date => date >= startOfYear() && date <= today())), all: sum(expenses) }
  }, [expenses])

  const openExpense = (expense?: Expense) => {
    setEditing(expense || null)
    setForm(expense ? { expense_date: expense.expense_date, category_id: expense.category_id, description: expense.description, amount: String(expense.amount), notes: expense.notes || '' } : { expense_date: today(), category_id: categories.find(c => c.is_active)?.id || '', description: '', amount: '', notes: '' })
    setModal('expense'); setNotice(null)
  }
  const submitExpense = async (event: React.FormEvent) => {
    event.preventDefault(); setNotice(null)
    const amount = Number(form.amount)
    if (!form.category_id || !form.description.trim() || !Number.isFinite(amount) || amount < 0 || !/^\d{4}-\d{2}-\d{2}$/.test(form.expense_date)) { setNotice({ type: 'error', text: 'Enter a valid date, category, description, and non-negative amount.' }); return }
    const result = editing ? await updateExpense(editing.id, { ...form, amount, notes: form.notes }) : await createExpense({ ...form, amount, notes: form.notes })
    if (result.error || !result.data) { setNotice({ type: 'error', text: result.error?.message || 'The database did not return the saved expense.' }); return }
    setModal(null)
    const refreshed = await refresh()
    if (refreshed) setNotice({ type: 'success', text: editing ? 'Expense updated.' : 'Expense saved.' })
  }
  const remove = async (id: string) => { if (!window.confirm('Delete this expense?')) return; const result = await deleteExpense(id); if (result.error) setNotice({ type: 'error', text: result.error.message }); else { setNotice({ type: 'success', text: 'Expense deleted.' }); await refresh() } }
  const submitCategory = async (event: React.FormEvent) => { event.preventDefault(); if (!categoryName.trim()) return; const result = await saveExpenseCategory(editingCategory?.id || null, categoryName); if (result.error) setNotice({ type: 'error', text: result.error.message }); else { setCategoryName(''); setEditingCategory(null); setModal(null); setNotice({ type: 'success', text: 'Category saved.' }); await refresh() } }
  const exportExpenses = () => downloadXlsx(`jj-signature-expenses-${today()}`, visibleExpenses.map(e => ({ Date: e.expense_date, Category: e.category?.name || '—', Description: e.description, Amount: Number(e.amount), Notes: e.notes || '' })))

  return <AdminModuleShell title="Expense Tracker" subtitle="Record and understand every operating expense from the J.J Signature database.">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex rounded-xl border border-borderLight bg-cardBg p-1">{(['expenses', 'categories'] as const).map(value => <button key={value} onClick={() => setTab(value)} className={`rounded-lg px-4 py-2 text-sm font-black capitalize ${tab === value ? 'bg-[#CBB89D] text-[#171717]' : 'text-textMuted hover:bg-[#E5D4B8]'}`}>{value}</button>)}</div><div className="flex flex-wrap gap-2">{tab === 'expenses' && <><button onClick={exportExpenses} className="btn-secondary inline-flex items-center gap-2"><Download size={16} />Export XLSX</button><button onClick={() => openExpense()} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Add Expense</button></>}</div></div>
    {notice && <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-bold ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-borderLight bg-[#EDE4D4] text-[#171717]'}`}>{notice.text}</div>}
    {tab === 'expenses' ? <>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">{[['Today', totals.today], ['This Week', totals.week], ['This Month', totals.month], ['This Year', totals.year], ['Total All Time', totals.all]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-borderLight bg-cardBg p-4 shadow-soft"><p className="text-[10px] font-black uppercase tracking-wider text-textMuted">{label}</p><p className="mt-2 text-lg font-black text-[#171717]">{formatCurrency(Number(value))}</p></div>)}</div>
      <div className="mb-5 flex flex-wrap items-end gap-2 rounded-2xl border border-borderLight bg-cardBg p-3">{(['all', 'today', 'week', 'month', 'year', 'custom'] as Filter[]).map(value => <button key={value} onClick={() => setFilter(value)} className={`rounded-lg px-3 py-2 text-xs font-black capitalize ${filter === value ? 'bg-[#CBB89D] text-[#171717]' : 'border border-borderLight text-textMuted hover:bg-[#EDE4D4]'}`}>{value === 'all' ? 'All Time' : value === 'custom' ? 'Custom' : `This ${value}`}</button>)}{filter === 'custom' && <><label className="text-[11px] font-bold text-textMuted">From<input type="date" className={`${inputClass} mt-1`} value={customFrom} onChange={e => setCustomFrom(e.target.value)} /></label><label className="text-[11px] font-bold text-textMuted">To<input type="date" className={`${inputClass} mt-1`} value={customTo} onChange={e => setCustomTo(e.target.value)} /></label></>}</div>
      <div className="overflow-hidden rounded-2xl border border-borderLight bg-cardBg shadow-soft"><div className="border-b border-borderLight px-4 py-4"><h2 className="flex items-center gap-2 text-lg font-black"><ReceiptIndianRupee size={19} />Expenses</h2></div>{loading ? <p className="p-8 text-center text-sm text-textMuted">Loading expenses…</p> : visibleExpenses.length === 0 ? <p className="p-8 text-center text-sm text-textMuted">No expenses in this period.</p> : <>
        <div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="bg-[#EDE4D4] text-[10px] font-black uppercase tracking-wider"><tr>{['Date', 'Category', 'Description', 'Amount', 'Actions'].map(h => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y divide-borderLight">{visibleExpenses.map(expense => <tr key={expense.id} className="hover:bg-[#EDE4D4]/40"><td className="whitespace-nowrap px-4 py-3 font-semibold">{expense.expense_date}</td><td className="px-4 py-3">{expense.category?.name || '—'}</td><td className="px-4 py-3 font-semibold">{expense.description}{expense.notes && <p className="text-xs text-textMuted">{expense.notes}</p>}</td><td className="px-4 py-3 font-black">{formatCurrency(Number(expense.amount))}</td><td className="px-4 py-3"><button onClick={() => openExpense(expense)} className="touch-target mr-1 rounded-lg border border-borderLight p-2 hover:bg-[#EDE4D4]" title="Edit"><Edit3 size={15} /></button><button onClick={() => void remove(expense.id)} className="touch-target rounded-lg border border-borderLight p-2 hover:bg-[#EDE4D4]" title="Delete"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>
        <div className="space-y-3 p-3 md:hidden">{visibleExpenses.map(expense => <article key={expense.id} className="rounded-xl border border-borderLight bg-[#FFFDF8] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-wider text-textMuted">{expense.expense_date} · {expense.category?.name || '—'}</p><h3 className="mt-1 break-words font-black">{expense.description}</h3>{expense.notes && <p className="mt-1 break-words text-xs text-textMuted">{expense.notes}</p>}</div><p className="shrink-0 text-base font-black">{formatCurrency(Number(expense.amount))}</p></div><div className="mt-3 flex gap-2 border-t border-borderLight pt-3"><button onClick={() => openExpense(expense)} className="touch-target inline-flex items-center gap-2 rounded-lg border border-borderLight px-3 text-xs font-black"><Edit3 size={15} />Edit</button><button onClick={() => void remove(expense.id)} className="touch-target inline-flex items-center gap-2 rounded-lg border border-red-200 px-3 text-xs font-black text-red-700"><Trash2 size={15} />Delete</button></div></article>)}</div>
      </>}</div>
    </> : <div className="rounded-2xl border border-borderLight bg-cardBg shadow-soft"><div className="flex items-center justify-between border-b border-borderLight p-4"><h2 className="text-lg font-black">Expense Categories</h2><button onClick={() => { setEditingCategory(null); setCategoryName(''); setModal('category') }} className="btn-primary inline-flex items-center gap-2"><Plus size={16} />Add Category</button></div><div className="divide-y divide-borderLight">{categories.map(category => <div key={category.id} className="flex items-center justify-between gap-3 px-4 py-3"><span className={`font-bold ${category.is_active ? '' : 'text-textMuted line-through'}`}>{category.name}</span><div><button onClick={() => { setEditingCategory(category); setCategoryName(category.name); setModal('category') }} className="mr-1 rounded-lg border border-borderLight p-2 hover:bg-[#EDE4D4]"><Edit3 size={15} /></button><button onClick={async () => { const result = await toggleExpenseCategory(category.id, !category.is_active); if (result.error) setNotice({ type: 'error', text: result.error.message }); else await refresh() }} className="rounded-lg border border-borderLight p-2 hover:bg-[#EDE4D4]"><Power size={15} /></button></div></div>)}</div></div>}
    {modal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div className="w-full max-w-lg rounded-2xl border border-borderLight bg-cardBg p-5 shadow-2xl"> <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black">{modal === 'expense' ? (editing ? 'Edit Expense' : 'Add Expense') : (editingCategory ? 'Rename Category' : 'Add Category')}</h2><button onClick={() => setModal(null)}><X size={20} /></button></div>{modal === 'expense' ? <form onSubmit={submitExpense} className="space-y-3"><label className="block text-xs font-black uppercase">Date<input required type="date" className={`${inputClass} mt-1`} value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></label><label className="block text-xs font-black uppercase">Category<select required className={`${inputClass} mt-1`} value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}><option value="">Select category</option>{categories.filter(c => c.is_active).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="block text-xs font-black uppercase">Description<input required className={`${inputClass} mt-1`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></label><label className="block text-xs font-black uppercase">Amount<input required min="0" step="0.01" type="number" className={`${inputClass} mt-1`} value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></label><label className="block text-xs font-black uppercase">Notes (optional)<textarea className={`${inputClass} mt-1`} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label><button className="btn-primary w-full" type="submit">Save Expense</button></form> : <form onSubmit={submitCategory} className="space-y-3"><label className="block text-xs font-black uppercase">Category name<input autoFocus required className={`${inputClass} mt-1`} value={categoryName} onChange={e => setCategoryName(e.target.value)} /></label><button className="btn-primary w-full" type="submit">Save Category</button></form>}</div></div>}
  </AdminModuleShell>
}
