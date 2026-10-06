/**
 * داده نمونه — عیناً از تابع loadDemo (لاین 3004-3045) اسکریپت قدیمی.
 * uid/تاریخ هنگام فراخوانی تولید می‌شوند.
 */
import { uid, faNow } from '../utils/format.js'

export function demoData() {
  const tools = [
    { id: uid(), name: 'فرز انگشتی', category: 'ابزار برقی', total: 2, note: 'ماکیتا' },
    { id: uid(), name: 'دریل شارژی', category: 'ابزار برقی', total: 3, note: '' },
    { id: uid(), name: 'متر نواری ۵ متری', category: 'ابزار اندازه‌گیری', total: 6, note: '' },
    { id: uid(), name: 'پرس لولا', category: 'ابزار دستی', total: 1, note: '' }
  ]
  const sheets = [
    { id: uid(), category: 'MDF', sub: 'روکش‌دار', width: 183, length: 244, qty: 12, note: 'سفید' },
    { id: uid(), category: 'MDF', sub: 'خام', width: 183, length: 244, qty: 5, note: '' },
    { id: uid(), category: 'نئوپان', sub: 'ملامینه', width: 183, length: 244, qty: 20, note: 'گردویی' },
    { id: uid(), category: 'MDF', sub: 'روکش‌دار', width: 80, length: 27, qty: 10, note: 'برش‌خورده' }
  ]
  const hardware = [
    { id: uid(), category: 'پیچ', sub: 'پیچ ام‌دی‌اف 4×16', unit: 'pack', packSize: 100, qty: 8, note: '', title: 'پیچ ام‌دی‌اف 4×16' },
    { id: uid(), category: 'پیچ', sub: 'پیچ ام‌دی‌اف 4×30', unit: 'pack', packSize: 100, qty: 3, note: '', title: 'پیچ ام‌دی‌اف 4×30' },
    { id: uid(), category: 'لولا', sub: 'گازور کلیپ‌آن', unit: 'piece', packSize: 0, qty: 48, note: 'کوتاه', title: 'لولا گازور کوتاه' },
    { id: uid(), category: 'ریل', sub: 'زیرکش ۴۵ سانتی', unit: 'pack', packSize: 2, qty: 10, note: '', title: 'ریل زیرکش ۴۵ سانتی' }
  ]
  const templates = [{
    id: uid(), name: 'کابینت آشپزخانه - نمونه',
    items: [
      { id: uid(), type: 'ورق', label: 'ورق MDF روکش‌دار ۱۸۳×۲۴۴', qty: 3, unit: 'تخته', unitPrice: 2400000 },
      { id: uid(), type: 'یراق', label: 'لولا گازور کلیپ‌آن', qty: 16, unit: 'عدد', unitPrice: 18000 },
      { id: uid(), type: 'یراق', label: 'ریل زیرکش ۴۵ سانتی', qty: 6, unit: 'جفت', unitPrice: 85000 },
      { id: uid(), type: 'خدمت', label: 'برش ورق', qty: 1, unit: 'سرویس', unitPrice: 350000 },
      { id: uid(), type: 'خدمت', label: 'حمل و نصب', qty: 1, unit: 'سرویس', unitPrice: 800000 }
    ],
    discountPercent: 0, taxPercent: 9, notes: ''
  }]
  const t1 = tools[0], t2 = tools[1]
  const jobs = [{
    id: uid(), name: 'کابینت آشپزخانه - نمونه', date: faNow(),
    items: [
      { id: uid(), toolId: t1.id, qty: 1, returned: false, outAt: faNow() },
      { id: uid(), toolId: t2.id, qty: 2, returned: true, outAt: faNow(), inAt: faNow() }
    ],
    closed: false
  }]
  return { tools, sheets, hardware, templates, jobs }
}
