/**
 * ساخت سند چاپی فاکتور — عیناً از تابع printInvoice (لاین 2379-2440)
 * اسکریپت قدیمی، با خروجی خالص رشته تا قابل تست باشد.
 */
import { esc, num, fmt, fmtInt, faNow } from '../utils/format.js'
import { numToWords, thousands } from './amount-format.js'
import { templateTotals } from './totals.js'
import { invoiceNumberFor } from './invoice.js'

export function buildInvoiceHtml(t, opts = {}) {
  const now = opts.now || faNow()
  const store = opts.store
  const tt = templateTotals(t)
  const invNum = opts.invNum || invoiceNumberFor(t, store)
  const rows = (t.items || []).map(it => `
    <tr>
      <td>${esc(it.type || '—')}</td>
      <td style="word-break:break-word;white-space:normal;max-width:280px">${esc(it.label)}</td>
      <td>${fmt(it.qty)}</td>
      <td>${esc(it.unit || '—')}</td>
      <td class="num-col">${thousands(it.unitPrice)}</td>
      <td class="num-col">${thousands(num(it.qty) * num(it.unitPrice))}</td>
    </tr>`).join('')

  const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8">
  <title>فاکتور - ${esc(t.name)}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Tahoma,"Segoe UI",sans-serif;padding:36px 42px;color:#111;background:#fff;direction:rtl;font-size:13.5px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #111;padding-bottom:14px;margin-bottom:20px}
    h1{margin:0 0 4px;font-size:22px}
    .sub{color:#666;font-size:12.5px}
    .w{color:#666;font-size:11px;font-weight:400;margin-top:2px;line-height:1.5}
    .num{background:#f3f4f6;padding:6px 12px;border-radius:8px;font-family:monospace;font-size:13px}
    .meta{display:flex;justify-content:space-between;margin-bottom:16px;font-size:13px;color:#333}
    .title-box{background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;padding:10px 14px;margin-bottom:16px}
    .title-box b{font-size:15px}
    table{width:100%;border-collapse:collapse;margin-top:14px;font-size:13px;table-layout:fixed}
    th,td{border:1px solid #ddd;padding:9px 10px;text-align:right;word-break:break-word}
    th{background:#f3f4f6;font-weight:700}
    .num-col{font-family:monospace;direction:ltr;text-align:left}
    .summary{margin-top:18px;background:#fafafa;border:1px solid #e5e7eb;border-radius:10px;padding:14px;max-width:440px;margin-inline-start:auto}
    .summary .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dashed #ddd}
    .summary .row:last-child{border-bottom:0}
    .summary .big{border-top:2px solid #111;margin-top:6px;padding-top:12px;font-size:16px;font-weight:700}
    .notes{margin-top:20px;padding:12px 14px;background:#f9fafb;border-inline-start:4px solid #2563eb;border-radius:6px;font-size:12.5px;color:#333}
    @media print{ body{padding:20px 24px} }
  <\/style><\/head><body>
    <div class="head">
      <div><h1>دکور سهند</h1><div class="sub">${now}</div></div>
      <div class="num">#${invNum}</div>
    </div>
    <div class="meta"><span>تاریخ صدور: ${now}</span><span>تعداد اقلام: ${fmt((t.items || []).length)}</span></div>
    <div class="title-box"><b>عنوان:</b> ${esc(t.name)}</div>
    <table>
      <thead><tr>
        <th style="width:80px">نوع</th>
        <th>شرح</th>
        <th style="width:70px">تعداد</th>
        <th style="width:70px">واحد</th>
        <th style="width:110px">قیمت واحد</th>
        <th style="width:120px">جمع</th>
      </tr></thead>
      <tbody>${rows || '<tr><td colspan="6" style="text-align:center;color:#888">قلمی ثبت نشده</td></tr>'}</tbody>
    </table>
    <div class="summary">
      <div class="row"><span>جمع کل اقلام:</span><span class="num-col">${thousands(tt.sub)} تومان<div class="w">${esc(numToWords(tt.sub, 'تومان'))}</div></span></div>
      <div class="row"><span>تخفیف (${fmt(t.discountPercent || 0)}٪):</span><span class="num-col">${thousands(tt.disc)} تومان<div class="w">${esc(numToWords(tt.disc, 'تومان'))}</div></span></div>
      <div class="row"><span>مالیات (${fmt(t.taxPercent || 0)}٪):</span><span class="num-col">${thousands(tt.tax)} تومان<div class="w">${esc(numToWords(tt.tax, 'تومان'))}</div></span></div>
      <div class="row big"><span>مبلغ نهایی قابل پرداخت:</span><span class="num-col">${thousands(tt.total)} تومان<div class="w">${esc(numToWords(tt.total, 'تومان'))}</div></span></div>
    </div>
    ${t.notes ? `<div class="notes"><b>توضیحات:</b> ${esc(t.notes)}</div>` : ''}
  <\/body><\/html>`

  return html
}
