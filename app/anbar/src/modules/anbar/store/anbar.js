/**
 * استور اصلی انبار (Pinia) — معادل شیء state + save/load + اکشن‌های اسکریپت قدیمی.
 * ساختار داده، کلیدهای localStorage و ترتیب سینک عین نسخه قدیمی است.
 */
import { defineStore } from 'pinia'
import { reactive, computed } from 'vue'
import {
  KEY, THEME_KEY, INV_COUNTER_KEY, CLOUD_TABLES, emptyTombs
} from '../config/constants.js'
import { uid, nowMs, num, faNow, uniq } from '../utils/format.js'
import {
  hwTotal, toolOut, toolAvail, templateTotals, jobPendingCount,
  jobsOpen, jobsClosed, dashboardStats
} from '../core/totals.js'
import { assignInvoiceNumber, invoiceNumberFor, getNextInvoiceNumber, getInvoiceNumber } from '../core/invoice.js'
import { mergeById } from '../core/merge.js'
import { demoData } from '../core/demo-data.js'
import { buildInvoiceHtml } from '../core/invoice-html.js'
import { searchSheets } from '../core/sheet-search.js'
import { createApi } from './api.js'
import { createSyncEngine } from './sync.js'

const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null)

export const useAnbarStore = defineStore('anbar', () => {
  /* ---------------- state ---------------- */
  const data = reactive({
    tools: [], sheets: [], hardware: [], templates: [], jobs: [],
    tombstones: emptyTombs()
  })
  const ui = reactive({
    tab: 'dash',
    toolCat: null,
    sheetsCat: null, sheetsSub: null,
    hardwareCat: null, hardwareSub: null,
    showSheetSearch: false,
    openTemplate: null, openJob: null, jobFilter: 'open',
    sq: null
  })
  const modal = reactive({
    kind: null,       // 'tool' | 'wizard' | 'startJob' | 'item' | 'import'
    title: '',
    editId: null, presetCat: null, presetSub: null,
    wizard: null,     // {type, step, category, sub, editId, data}
    item: null,       // {tplId, itemId}
    pendingImport: null, importFileName: '', importMode: 'merge'
  })
  const toastState = reactive({ id: 0, msg: '', type: 'info' })
  const theme = reactive({ current: 'dark' })
  const cloud = reactive({ ready: false, synced: false })

  /* ---------------- persistence ---------------- */
  function persist() {
    try {
      ls().setItem(KEY, JSON.stringify({
        tools: data.tools, sheets: data.sheets,
        hardware: data.hardware, templates: data.templates, jobs: data.jobs,
        tombstones: data.tombstones || emptyTombs()
      }))
    } catch (e) { console.warn(e) }
  }

  function save() {
    try {
      persist()
      engine && engine.queueSyncToCloud()
    } catch (e) { console.warn(e) }
  }

  function loadFromLocalStorage() {
    try {
      const d = JSON.parse(ls().getItem(KEY) || '{}')
      data.tools = d.tools || []
      data.sheets = d.sheets || []
      data.hardware = d.hardware || []
      data.templates = d.templates || []
      data.jobs = d.jobs || []
      data.tombstones = d.tombstones || emptyTombs()
    } catch (e) { console.warn(e) }
  }

  /* ---------------- cloud sync ---------------- */
  const api = createApi()
  const engine = createSyncEngine({
    api,
    storage: {
      getItem: k => { try { return ls().getItem(k) } catch (_) { return null } },
      setItem: (k, v) => { try { ls().setItem(k, v) } catch (_) {} }
    },
    hooks: {
      state: () => data,
      persist,
      notify: (msg, type) => toast(msg, type),
      log: (level, ...args) => (console[level] || console.log)(...args)
    }
  })

  function boot() {
    try {
      loadFromLocalStorage()
      if (!data.tombstones) data.tombstones = emptyTombs()
    } catch (e) { console.warn(e) }
    if (api.base) engine.start().then(() => { cloud.ready = true })
  }

  /* ---------------- ui helpers ---------------- */
  function toast(msg, type) {
    toastState.id++
    toastState.msg = String(msg ?? '')
    toastState.type = type || 'info'
  }

  function setTheme(t) {
    theme.current = t
    try {
      document.documentElement.setAttribute('data-theme', t)
      const meta = document.querySelector('meta[name=theme-color]')
      if (meta) meta.setAttribute('content', t === 'dark' ? '#111111' : '#FFFFFF')
      ls().setItem(THEME_KEY, t)
    } catch (_) {}
  }
  function toggleTheme() {
    const next = theme.current === 'dark' ? 'light' : 'dark'
    setTheme(next)
    toast(next === 'dark' ? 'تم تاریک فعال شد' : 'تم روشن فعال شد', 'ok')
  }

  function setTab(tab) {
    ui.tab = tab
    ui.toolCat = null
    ui.sheetsCat = null; ui.sheetsSub = null
    ui.hardwareCat = null; ui.hardwareSub = null
    ui.openTemplate = null
    ui.openJob = null
    ui.showSheetSearch = false
  }

  /* ---------------- modals ---------------- */
  function openModal(kind, props = {}) {
    modal.kind = kind
    Object.assign(modal, {
      editId: null, presetCat: null, presetSub: null,
      wizard: null, item: null, pendingImport: null
    }, props)
  }
  function closeModal() {
    modal.kind = null
    modal.wizard = null
    modal.pendingImport = null
  }

  /* ---------------- lookups (equal to old helpers) ---------------- */
  const templateOf = id => data.templates.find(t => t.id === id)
  const toolOf = id => data.tools.find(t => t.id === id)
  const jobOf = id => data.jobs.find(j => j.id === id)

  /* ---------------- tools ---------------- */
  function saveTool(id, form) {
    const obj = {
      name: form.name, category: form.category,
      total: num(form.total), note: form.note
    }
    if (!obj.category) { toast('دسته را وارد کنید', 'warn'); return false }
    if (id) {
      const t = data.tools.find(x => x.id === id)
      if (t) Object.assign(t, obj)
      // BUG-3: با تغییر دسته در ویرایش، فیلتر لیست هم به‌روز می‌شد
      ui.toolCat = obj.category
    } else {
      data.tools.unshift({ id: uid(), ...obj })
      ui.toolCat = obj.category
    }
    save()
    toast(id ? 'ذخیره شد' : 'ابزار افزوده شد', 'ok')
    return true
  }

  /* ---------------- generic delete with tombstone ---------------- */
  const TYPE_TO_TABLE = { tool: 'tools', sheet: 'sheets', hardware: 'hardware', template: 'templates', job: 'jobs' }

  function deleteRow(type, id) {
    const table = TYPE_TO_TABLE[type]
    if (!table) return false
    if (!data.tombstones) data.tombstones = emptyTombs()
    if (!data.tombstones[table]) data.tombstones[table] = {}
    data.tombstones[table][id] = nowMs()          // BUG-1: قبلاً با کلید مفرد ('tool') ثبت می‌شد
    if (type === 'tool') data.tools = data.tools.filter(x => x.id !== id)
    if (type === 'sheet') data.sheets = data.sheets.filter(x => x.id !== id)
    if (type === 'hardware') data.hardware = data.hardware.filter(x => x.id !== id)
    if (type === 'template') {
      data.templates = data.templates.filter(x => x.id !== id)
      if (ui.openTemplate === id) ui.openTemplate = null
    }
    if (type === 'job') {
      data.jobs = data.jobs.filter(x => x.id !== id)
      if (ui.openJob === id) ui.openJob = null
    }
    save()
    toast('حذف شد', 'dan')
    return true
  }

  /* ---------------- categories / subcategories ---------------- */
  const arrOfType = type => type === 'tool' ? data.tools : type === 'sheet' ? data.sheets : data.hardware
  function renameCategory(type, oldName, newName) {
    if (!newName || !newName.trim() || newName.trim() === oldName) return false
    const arr = arrOfType(type)
    arr.forEach(item => { if (item.category === oldName) item.category = newName.trim() })
    if (type === 'tool' && ui.toolCat === oldName) ui.toolCat = newName.trim()
    if (type === 'sheet' && ui.sheetsCat === oldName) ui.sheetsCat = newName.trim()
    if (type === 'hardware' && ui.hardwareCat === oldName) ui.hardwareCat = newName.trim()
    save(); toast('نام دسته تغییر یافت', 'ok')
    return true
  }
  function deleteCategory(type, name) {
    const arr = arrOfType(type)
    const count = arr.filter(i => i.category === name).length
    if (!confirm(`حذف دسته «${name}» و ${count} ردیف مربوطه؟`)) return false
    if (type === 'tool') data.tools = arr.filter(i => i.category !== name)
    else if (type === 'sheet') data.sheets = arr.filter(i => i.category !== name)
    else data.hardware = arr.filter(i => i.category !== name)
    if (type === 'tool' && ui.toolCat === name) ui.toolCat = null
    if (type === 'sheet' && ui.sheetsCat === name) { ui.sheetsCat = null; ui.sheetsSub = null }
    if (type === 'hardware' && ui.hardwareCat === name) { ui.hardwareCat = null; ui.hardwareSub = null }
    save(); toast('دسته حذف شد', 'dan')
    return true
  }
  function renameSub(type, cat, oldSub, newName) {
    if (!newName || !newName.trim() || newName.trim() === oldSub) return false
    const arr = arrOfType(type)
    arr.forEach(item => { if (item.category === cat && item.sub === oldSub) item.sub = newName.trim() })
    if (type === 'sheet' && ui.sheetsSub === oldSub) ui.sheetsSub = newName.trim()
    if (type === 'hardware' && ui.hardwareSub === oldSub) ui.hardwareSub = newName.trim()
    save(); toast('نام زیردسته تغییر یافت', 'ok')
    return true
  }
  function deleteSub(type, cat, sub) {
    const arr = arrOfType(type)
    const count = arr.filter(i => i.category === cat && i.sub === sub).length
    if (!confirm(`حذف زیردسته «${sub}» و ${count} ردیف مربوطه؟`)) return false
    if (type === 'sheet') data.sheets = arr.filter(i => !(i.category === cat && i.sub === sub))
    else if (type === 'hardware') data.hardware = arr.filter(i => !(i.category === cat && i.sub === sub))
    else data.tools = arr.filter(i => !(i.category === cat && i.sub === sub))
    if (type === 'sheet' && ui.sheetsSub === sub) ui.sheetsSub = null
    if (type === 'hardware' && ui.hardwareSub === sub) ui.hardwareSub = null
    save(); toast('زیردسته حذف شد', 'dan')
    return true
  }

  /* ---------------- start job modal (لاین 928-933 قدیمی) ---------------- */
  function openStartJob() {
    const avail = data.tools.filter(t => num(t.total) > 0)
    if (!avail.length) {
      toast('ابتدا از تب «ابزار» تعدادی ابزار تعریف کنید', 'warn')
      return false
    }
    openModal('startJob')
    return true
  }

  /* ---------------- wizard (sheet / hardware) ---------------- */
  function openWizard(type, editId, presetCat, presetSub) {
    const w = { type, step: 1, category: '', sub: '', editId: editId || null, data: {} }
    if (editId) {
      const item = type === 'sheet'
        ? data.sheets.find(s => s.id === editId)
        : data.hardware.find(h => h.id === editId)
      if (item) {
        w.category = item.category || ''
        w.sub = item.sub || ''
        w.step = 3
        Object.assign(w.data, item)
      }
    } else if (presetCat && presetSub) {
      w.category = presetCat; w.sub = presetSub; w.step = 3
    } else if (presetCat) {
      w.category = presetCat; w.step = 2
    }
    modal.wizard = w
    openModal('wizard', { wizard: w })
  }

  function saveWizard(form) {
    const w = modal.wizard
    if (!w) return false
    if (w.step === 2) {
      if (!w.category) { toast('دسته را انتخاب کنید', 'warn'); return false }
      if (!w.sub) { toast('زیردسته را انتخاب کنید', 'warn'); return false }
      w.step = 3
      return 'next'
    }
    if (w.type === 'sheet') {
      const obj = {
        category: w.category, sub: w.sub,
        width: num(form.width), length: num(form.length),
        qty: num(form.qty), note: form.note
      }
      if (w.editId) Object.assign(data.sheets.find(s => s.id === w.editId), obj)
      else data.sheets.unshift({ id: uid(), ...obj })
      ui.sheetsCat = w.category
      ui.sheetsSub = w.sub
    } else {
      const obj = {
        category: w.category, sub: w.sub, title: form.title,
        qty: num(form.qty), unit: form.unit || 'piece',
        packSize: num(form.packSize), note: form.note
      }
      if (w.editId) Object.assign(data.hardware.find(h => h.id === w.editId), obj)
      else data.hardware.unshift({ id: uid(), ...obj })
      ui.hardwareCat = w.category
      ui.hardwareSub = w.sub
    }
    save()
    toast(w.editId ? 'ذخیره شد' : 'ثبت شد', 'ok')
    return true
  }

  /* ---------------- jobs ---------------- */
  function createJob(name, picked) {
    const job = {
      id: uid(), name, date: faNow(),
      items: picked.map(p => ({ id: uid(), toolId: p.id, qty: p.qty, returned: false, outAt: faNow() })),
      closed: false
    }
    data.jobs.unshift(job)
    save()
    toast(`${num(picked.length)} ابزار برای کار «${name}» ثبت شد`, 'ok')
    ui.tab = 'jobs'
    ui.openJob = job.id
    return job
  }
  function toggleReturn(jobId, itemId, checked) {
    const j = jobOf(jobId); if (!j) return
    const it = (j.items || []).find(x => x.id === itemId); if (!it) return
    if (checked) { if (!it.returned) { it.returned = true; it.inAt = faNow() } }
    else if (it.returned) { it.returned = false; delete it.inAt }
    save()
  }
  function returnAll(jobId) {
    const j = jobOf(jobId); if (!j) return
    const pend = (j.items || []).filter(i => !i.returned)
    if (!pend.length) return
    if (!confirm(`همه ${pend.length} ابزار باقیمانده تحویل داده شده‌اند؟`)) return
    pend.forEach(it => { it.returned = true; it.inAt = faNow() })
    save(); toast('همه ابزارها تحویل ثبت شد', 'ok')
  }
  function closeJob(jobId) {
    const j = jobOf(jobId); if (!j) return
    const pend = (j.items || []).filter(i => !i.returned)
    if (pend.length && !confirm(`هنوز ${pend.length} قلم ابزار تحویل نشده. باز هم بسته شود؟`)) return
    j.closed = true; save(); toast('کار بسته شد', 'ok')
  }
  function reopenJob(jobId) {
    const j = jobOf(jobId); if (!j) return
    j.closed = false; save(); toast('کار بازگشایی شد', 'ok')
  }

  /* ---------------- templates / invoice ---------------- */
  function newTemplate() {
    const nt = { id: uid(), name: 'قالب جدید', items: [], discountPercent: 0, taxPercent: 9, notes: '', invTheme: null }
    assignInvoiceNumber(nt.id)
    data.templates.unshift(nt)
    save(); ui.openTemplate = nt.id
    toast('قالب جدید ایجاد شد', 'ok')
    return nt
  }
  function duplicateTemplate(id) {
    const t = templateOf(id); if (!t) return
    const copy = JSON.parse(JSON.stringify(t))
    copy.id = uid(); copy.name = t.name + ' (کپی)'
    data.templates.unshift(copy)
    save(); toast('قالب کپی شد', 'ok')
  }
  function saveItem(tplId, itemId, form) {
    const t = templateOf(tplId); if (!t) return false
    const type = String(form.type || '').trim()
    const label = String(form.label || '').trim()
    const qty = num(form.qty)
    const unit = String(form.unit || '').trim()
    const unitPrice = num(form.unitPrice)
    if (!label) { toast('شرح قلم را وارد کنید', 'warn'); return false }
    if (qty <= 0) { toast('تعداد باید بزرگ‌تر از صفر باشد', 'warn'); return false }
    t.items = t.items || []
    if (itemId) {
      const it = t.items.find(x => x.id === itemId)
      if (it) Object.assign(it, { type, label, qty, unit, unitPrice })
    } else {
      t.items.push({ id: uid(), type, label, qty, unit, unitPrice })
    }
    save()
    toast(itemId ? 'قلم ویرایش شد' : 'قلم اضافه شد', 'ok')
    return true
  }
  function deleteItem(tplId, itemId) {
    const t = templateOf(tplId); if (!t) return
    if (!confirm('حذف این قلم؟')) return
    t.items = (t.items || []).filter(x => x.id !== itemId)
    save(); toast('قلم حذف شد', 'dan')
  }
  function setTemplateField(id, field, value) {
    const t = templateOf(id); if (!t) return
    if (field === 'name') t.name = String(value).trim() || t.name
    else if (field === 'notes') t.notes = value
    else if (field === 'discountPercent') t.discountPercent = num(value)
    else if (field === 'taxPercent') t.taxPercent = num(value)
    save()
  }
  /** BUG-4: شماره فاکتور فقط یک‌بار هنگام باز کردن قالب تخصیص می‌یابد (نه در هر رندر) */
  function ensureInvoiceNumber(id) {
    const t = templateOf(id)
    return t ? invoiceNumberFor(t, ls(), () => persist()) : ''
  }

  /* ---------------- sheet search ---------------- */
  function runSheetSearch(q) {
    ui.sq = { L: num(q.L), W: num(q.W), mode: q.mode, tol: q.tol }
    return searchSheets(data.sheets, ui.sq)
  }

  /* ---------------- data management ---------------- */
  function applyImport(dataIn, mode) {
    if (mode === 'replace') {
      if (!confirm('تمام داده‌های فعلی پاک و جایگزین می‌شوند. مطمئن هستید؟')) return false
      data.tools = Array.isArray(dataIn.tools) ? dataIn.tools : []
      data.sheets = Array.isArray(dataIn.sheets) ? dataIn.sheets : []
      data.hardware = Array.isArray(dataIn.hardware) ? dataIn.hardware : []
      data.templates = Array.isArray(dataIn.templates) ? dataIn.templates : []
      data.jobs = Array.isArray(dataIn.jobs) ? dataIn.jobs : []
      save(); toast('بازیابی کامل انجام شد', 'ok')
      return true
    }
    const m = (cur, inc) => mergeById(cur, Array.isArray(inc) ? inc : [])
    const before = data.tools.length + data.sheets.length + data.hardware.length + data.templates.length + data.jobs.length
    data.tools = m(data.tools, dataIn.tools)
    data.sheets = m(data.sheets, dataIn.sheets)
    data.hardware = m(data.hardware, dataIn.hardware)
    data.templates = m(data.templates, dataIn.templates)
    data.jobs = m(data.jobs, dataIn.jobs)
    const after = data.tools.length + data.sheets.length + data.hardware.length + data.templates.length + data.jobs.length
    save(); toast(`ادغام انجام شد (+${after - before} رکورد جدید)`, 'ok')
    return true
  }
  function wipe() {
    if (!confirm('همه داده‌ها پاک شوند؟')) return false
    data.tools = []; data.sheets = []; data.hardware = []
    data.templates = []; data.jobs = []
    save(); toast('همه داده‌ها پاک شدند', 'dan')
    return true
  }
  function loadDemo() {
    if (!confirm('داده‌های نمونه اضافه شوند؟ (داده‌های فعلی پاک می‌شوند)')) return false
    const d = demoData()
    data.tools = d.tools; data.sheets = d.sheets; data.hardware = d.hardware
    data.templates = d.templates; data.jobs = d.jobs
    save(); toast('داده‌های نمونه بارگذاری شد', 'ok')
    return true
  }

  /* ---------------- create category / sub (لاین 1647-1674 قدیمی) ---------------- */
  function createNewCategory(type) {
    const name = prompt('نام دسته جدید:')
    if (!name || !name.trim()) return
    const n = name.trim()
    if (type === 'tool') { ui.toolCat = n; openModal('tool', { presetCat: n }); return }
    openModal('wizard', { wizard: { type, step: 2, category: n, sub: '', editId: null, data: {} } })
  }
  function createNewSub(type) {
    const cat = type === 'sheet' ? ui.sheetsCat : ui.hardwareCat
    const name = prompt(`نام زیردسته جدید برای «${cat}»:`)
    if (!name || !name.trim()) return
    openModal('wizard', { wizard: { type, step: 3, category: cat, sub: name.trim(), editId: null, data: {} } })
  }

  /* ---------------- چاپ فاکتور (لاین 1834-1907 قدیمی) ---------------- */
  function printInvoice(tplId) {
    const t = templateOf(tplId); if (!t) return
    const html = buildInvoiceHtml(t, { store: ls() })
    const iframe = document.createElement('iframe')
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow.document
    doc.open(); doc.write(html); doc.close()
    setTimeout(() => {
      try { iframe.contentWindow.focus(); iframe.contentWindow.print() } catch (_) {}
      setTimeout(() => iframe.remove(), 1800)
    }, 450)
    toast('در حال آماده‌سازی PDF...', 'ok')
  }

  /* ---------------- getters ---------------- */
  const stats = computed(() => dashboardStats({ ...data }))
  const openJobsCount = computed(() => jobsOpen(data.jobs).length)

  return {
    data, ui, modal, toastState, theme, cloud,
    api, engine, boot, persist, save, loadFromLocalStorage,
    toast, setTheme, toggleTheme, setTab, openModal, closeModal,
    templateOf, toolOf, jobOf, saveTool, deleteRow,
    renameCategory, deleteCategory, renameSub, deleteSub,
    createNewCategory, createNewSub, openStartJob,
    openWizard, saveWizard, printInvoice,
    createJob, toggleReturn, returnAll, closeJob, reopenJob,
    newTemplate, duplicateTemplate, saveItem, deleteItem, setTemplateField, ensureInvoiceNumber,
    runSheetSearch, applyImport, wipe, loadDemo,
    stats, openJobsCount,
    // helpers re-exported for views
    hwTotal, toolOut, toolAvail, templateTotals, jobPendingCount, jobsOpen, jobsClosed,
    uniq, num, getNextInvoiceNumber, getInvoiceNumber
  }
})
