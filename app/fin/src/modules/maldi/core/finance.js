/**
 * منطق مالی: انواع تراکنش، لاگ تراکنش، محاسبه پرداخت‌ها از روی تخصیص‌ها و موجودی صندوق.
 * عیناً از index.html مبدأ (خطوط ۳۶۶–۴۰۵).
 */
import { JalaliDate } from './jalali.js'
import { genId, todayISO } from '../config/units.js'

export const TX_TYPES = {
  check_add: { label: 'چک جدید', kind: 'info' }, check_edit: { label: 'ویرایش چک', kind: 'info' }, check_delete: { label: 'حذف چک', kind: 'warn' },
  check_cash: { label: 'نقد چک', kind: 'in' }, check_bounce: { label: 'چک برگشتی', kind: 'warn' }, check_transfer: { label: 'انتقال چک', kind: 'info' },
  check_revert: { label: 'برگشت به انتظار', kind: 'warn' }, expense_add: { label: 'هزینه جدید', kind: 'info' }, expense_edit: { label: 'ویرایش هزینه', kind: 'info' },
  expense_delete: { label: 'حذف هزینه', kind: 'warn' }, expense_pay: { label: 'پرداخت هزینه', kind: 'out' }, expense_unpay: { label: 'لغو پرداخت', kind: 'warn' },
  debt_add: { label: 'بدهی جدید', kind: 'info' }, debt_edit: { label: 'ویرایش بدهی', kind: 'info' }, debt_delete: { label: 'حذف بدهی', kind: 'warn' },
  debt_pay: { label: 'پرداخت بدهی', kind: 'out' }, debt_unpay: { label: 'لغو پرداخت بدهی', kind: 'warn' }, alloc: { label: 'تخصیص', kind: 'info' },
  cash_pay: { label: 'پرداخت از صندوق', kind: 'out' }
}

export const recordTx = (data, tx) => {
  const transactions = data.transactions || []
  const newTx = { id: genId(), date: todayISO(), createdAt: Date.now(), ...tx }
  return { ...data, transactions: [...transactions, newTx] }
}

export function syncPaidFromAllocations(data) {
  const paidExp = { ...(data.paidRecord?.expenses || {}) }
  const grouped = {}
  ;(data.allocations || []).forEach(a => {
    const ch = data.checks.find(c => c.id === a.checkId)
    if (!ch) return
    const d = new Date(ch.dueDate)
    const j = JalaliDate.gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
    const key = a.expenseId + '_' + j.jy + '_' + j.jm
    grouped[key] = (grouped[key] || 0) + a.amount
  })
  Object.entries(grouped).forEach(([key, sum]) => {
    const expId = key.split('_')[0]
    const ex = data.expenses.find(e => e.id === expId)
    if (ex && sum >= ex.amount) paidExp[key] = true
  })
  return paidExp
}

export function calcCashBalance(data) {
  const cashIn = (data.checks || []).filter(c => c.status === 'cashed').reduce((s, c) => s + c.amount, 0)
  let cashOut = 0
  Object.keys(data.paidRecord?.expenses || {}).forEach(k => {
    if (!data.paidRecord.expenses[k]) return
    const expId = k.split('_')[0]
    const ex = (data.expenses || []).find(e => e.id === expId)
    if (ex) cashOut += ex.amount
  })
  return cashIn - cashOut
}
