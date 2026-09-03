import { supabase } from '../lib/supabase'

export type ExpenseCategory = {
  id: string
  name: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Expense = {
  id: string
  expense_date: string
  category_id: string
  description: string
  amount: number
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  category?: Pick<ExpenseCategory, 'id' | 'name'> | null
}

export async function listExpenseCategories(includeInactive = true) {
  let query = supabase.from('expense_categories').select('*').order('name')
  if (!includeInactive) query = query.eq('is_active', true)
  return query
}

export async function listExpenses(from?: string, to?: string) {
  let query = supabase.from('expenses').select('*, category:expense_categories(id, name)').order('expense_date', { ascending: false }).order('created_at', { ascending: false })
  if (from) query = query.gte('expense_date', from)
  if (to) query = query.lte('expense_date', to)
  return query
}

export async function createExpense(input: Pick<Expense, 'expense_date' | 'category_id' | 'description' | 'amount' | 'notes'>) {
  return supabase.from('expenses').insert({ ...input, description: input.description.trim(), notes: input.notes?.trim() || null }).select('*, category:expense_categories(id, name)').single()
}

export async function updateExpense(id: string, input: Pick<Expense, 'expense_date' | 'category_id' | 'description' | 'amount' | 'notes'>) {
  return supabase.from('expenses').update({ ...input, description: input.description.trim(), notes: input.notes?.trim() || null }).eq('id', id).select('*, category:expense_categories(id, name)').single()
}

export function deleteExpense(id: string) {
  return supabase.from('expenses').delete().eq('id', id).select('id').single()
}

export function saveExpenseCategory(id: string | null, name: string) {
  const clean = name.trim()
  return id
    ? supabase.from('expense_categories').update({ name: clean }).eq('id', id).select().single()
    : supabase.from('expense_categories').insert({ name: clean, is_active: true }).select().single()
}

export function toggleExpenseCategory(id: string, isActive: boolean) {
  return supabase.from('expense_categories').update({ is_active: isActive }).eq('id', id).select().single()
}

export function deleteExpenseCategory(id: string) {
  return supabase.from('expense_categories').delete().eq('id', id).select('id').single()
}
