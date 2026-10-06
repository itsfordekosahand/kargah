/**
 * لایه ذخیره‌سازی محلی و ادغام/نرمال‌سازی سند — عیناً از index.html مبدأ (خطوط ۴۴۲–۴۶۹).
 * تنها نقطه نوشتن localStorage سند اصلی، همین ماژول است (saveData).
 */

export const STORAGE_KEY = 'checkManager_v2'
export const REMINDER_KEY = 'checkManager_reminderDismissed'

export const getEmbeddedData = () => {
  try {
    const el = document.getElementById('app-data')
    if (el && el.textContent.trim() && el.textContent.trim() !== 'null') return JSON.parse(el.textContent)
  } catch (e) {}
  return null
}

export const loadData = () => {
  let local = null
  try {
    const d = localStorage.getItem(STORAGE_KEY)
    if (d) local = JSON.parse(d)
  } catch {}
  const embedded = getEmbeddedData()
  if (!local && !embedded) return null
  if (!local) return embedded
  if (!embedded) return local
  const lT = local._savedAt || 0
  const eT = embedded._savedAt || 0
  return lT >= eT ? local : embedded
}

export const saveData = (data) => {
  const withStamp = { ...data, _savedAt: Date.now() }
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(withStamp)) } catch (e) {}
}

export const getDefaultData = () => ({
  checks: [],
  expenses: [],
  allocations: [],
  debts: [],
  transactions: [],
  paidRecord: { checks: {}, expenses: {}, debts: {} },
  expenseTemplates: [],
  settings: { unit: 'toman' }
})

export const normalizeData = (parsed) => {
  const d = { ...parsed }
  if (!d.paidRecord) d.paidRecord = { checks: {}, expenses: {}, debts: {} }
  if (!d.paidRecord.checks) d.paidRecord.checks = {}
  if (!d.paidRecord.expenses) d.paidRecord.expenses = {}
  if (!d.paidRecord.debts) d.paidRecord.debts = {}
  if (!d.checks) d.checks = []
  if (!d.expenses) d.expenses = []
  if (!d.debts) d.debts = []
  if (!d.allocations) d.allocations = []
  if (!d.expenseTemplates) d.expenseTemplates = []
  if (!d.transactions) d.transactions = []
  if (!d.settings) d.settings = {}
  if (!d.settings.unit) d.settings.unit = 'toman'
  return d
}

export const mergeArrayById = (current, imported) => {
  const map = new Map()
  ;(current || []).forEach(it => { if (it && it.id) map.set(it.id, it) })
  ;(imported || []).forEach(it => { if (it && it.id) map.set(it.id, it) })
  return Array.from(map.values())
}

export const mergeData = (current, imported) => {
  const c = normalizeData(current)
  const i = normalizeData(imported)
  return {
    ...c,
    checks: mergeArrayById(c.checks, i.checks),
    expenses: mergeArrayById(c.expenses, i.expenses),
    allocations: mergeArrayById(c.allocations, i.allocations),
    debts: mergeArrayById(c.debts, i.debts),
    expenseTemplates: mergeArrayById(c.expenseTemplates, i.expenseTemplates),
    transactions: mergeArrayById(c.transactions, i.transactions),
    paidRecord: {
      checks: { ...(c.paidRecord.checks || {}), ...(i.paidRecord.checks || {}) },
      expenses: { ...(c.paidRecord.expenses || {}), ...(i.paidRecord.expenses || {}) },
      debts: { ...(c.paidRecord.debts || {}), ...(i.paidRecord.debts || {}) }
    },
    settings: { ...(c.settings || {}), ...(i.settings || {}) },
    _savedAt: Date.now()
  }
}

export const countImportItems = (imported) => {
  const i = normalizeData(imported)
  return {
    checks: i.checks.length,
    expenses: i.expenses.length,
    debts: i.debts.length,
    allocations: i.allocations.length,
    templates: i.expenseTemplates.length,
    transactions: i.transactions.length
  }
}
