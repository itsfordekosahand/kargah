/**
 * فروشگاه Pinia ماژول مالی — معادل state کل اپ React در index.html مبدأ
 * (data, currentPage, sidebarOpen, importPreview, showSettings, showReminder).
 * تنها نقطه‌ی نوشتن سند در localStorage همین‌جاست (از طریق core/data.js).
 */
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { loadData, saveData, getDefaultData, normalizeData, mergeData, REMINDER_KEY } from '../core/data.js'
import { syncPaidFromAllocations } from '../core/finance.js'
import { todayISO } from '../config/units.js'
import { notify } from '../utils/notify.js'

export const useMaldiStore = defineStore('maldi', () => {
  const data = ref(getDefaultData())
  const page = ref('dashboard')
  const sidebarOpen = ref(false)
  const importPreview = ref(null)
  const showSettings = ref(false)
  const showReminder = ref(false)
  let started = false

  /** معادل setData(fn) در مبدأ */
  function setData(fn) {
    data.value = typeof fn === 'function' ? fn(data.value) : fn
  }

  /** بازمحاسبه پرداخت‌های هزینه از روی تخصیص‌ها (useEffect [allocations, expenses] در مبدأ) */
  function recalcPaid() {
    setData(d => {
      const newPaid = syncPaidFromAllocations(d)
      let changed = false
      const allKeys = new Set([...Object.keys(d.paidRecord?.expenses || {}), ...Object.keys(newPaid)])
      for (const k of allKeys) { if (!!d.paidRecord?.expenses?.[k] !== !!newPaid[k]) { changed = true; break } }
      if (!changed) return d
      return { ...d, paidRecord: { ...d.paidRecord, expenses: newPaid } }
    })
  }

  function onResize() {
    if (window.innerWidth > 1024) sidebarOpen.value = false
  }

  function init() {
    if (started) return
    started = true
    const loaded = loadData()
    data.value = loaded ? normalizeData(loaded) : getDefaultData()
    showReminder.value = localStorage.getItem(REMINDER_KEY) !== todayISO()
    // پل sync.js → اپ (عیناً window.__ktdSetData در مبدأ)
    window.__ktdSetData = (d) => { data.value = normalizeData(d) }
    // اولین ذخیره مثل اولین useEffect مبدأ؛ بعد از آن watcher روی هر تغییر
    saveData(data.value)
    watch(data, (v) => saveData(v), { deep: true })
    recalcPaid()
    watch(() => data.value.allocations, recalcPaid)
    watch(() => data.value.expenses, recalcPaid)
    window.addEventListener('resize', onResize)
  }

  /* ---------- ناوبری ---------- */
  function setPage(id) { page.value = id; sidebarOpen.value = false }
  function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }

  /* ---------- یادآوری روزانه ---------- */
  function closeReminder() {
    try { localStorage.setItem(REMINDER_KEY, todayISO()) } catch (e) {}
    showReminder.value = false
  }

  /* ---------- پیام‌ها ---------- */
  function toast(message) { notify(message) }

  /* ---------- ورود/خروج داده ---------- */
  function importReplace(parsed) {
    data.value = normalizeData(parsed)
    importPreview.value = null
    notify('داده‌ها جایگزین شد')
  }
  function importMerge(parsed) {
    data.value = mergeData(data.value, parsed)
    importPreview.value = null
    notify('داده‌ها ادغام شد')
  }
  function importCancel() { importPreview.value = null }

  return {
    data, page, sidebarOpen, importPreview, showSettings, showReminder,
    init, setData, recalcPaid, setPage, toggleSidebar, closeReminder,
    toast, importReplace, importMerge, importCancel
  }
})

export default useMaldiStore
