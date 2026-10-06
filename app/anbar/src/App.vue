<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useAnbarStore } from './modules/anbar/store/anbar.js'
import { handleAction } from './modules/anbar/ui/actions.js'
import { ico } from './modules/anbar/utils/icons.js'
import { readBackupFile } from './modules/anbar/management/backup.js'

import DashView from './modules/anbar/ui/views/DashView.vue'
import ToolsView from './modules/anbar/ui/views/ToolsView.vue'
import JobsView from './modules/anbar/ui/views/JobsView.vue'
import SheetsView from './modules/anbar/ui/views/SheetsView.vue'
import HardwareView from './modules/anbar/ui/views/HardwareView.vue'
import CalcView from './modules/anbar/ui/views/CalcView.vue'
import SettingsView from './modules/anbar/ui/views/SettingsView.vue'
import ModalShell from './modules/anbar/ui/modals/ModalShell.vue'

const store = useAnbarStore()
const ui = store.ui
const drawerOpen = ref(false)

const NAV = [
  { tab: 'dash', label: 'داشبورد', icon: 'dash' },
  { tab: 'tools', label: 'ابزار', icon: 'tool' },
  { tab: 'jobs', label: 'کارها', icon: 'jobs', badge: true },
  { tab: 'sheets', label: 'ورق', icon: 'file' },
  { tab: 'hardware', label: 'یراق', icon: 'bolt' },
  { tab: 'calc', label: 'محاسبه و فاکتور', icon: 'calc' },
  { tab: 'settings', label: 'پشتیبان‌گیری', icon: 'save' }
]
/**
 * آیکون ناوبری. خروجی باید یک <svg> کامل باشد (نه فقط فرزندهایش) تا
 * stroke/fill از خودِ <svg> اعمال شود؛ اگر پوستهٔ <svg> حذف شود، فرزندها
 * به‌صورت گره‌های بی‌معنی در DOM می‌مانند و هیچ چیز رسم نمی‌شود.
 */
function navIcon(name) {
  return ico(name, 20)
}

function onViewClick(e) {
  const el = e.target && e.target.closest ? e.target.closest('[data-act]') : null
  if (!el) return
  handleAction(store, el.dataset.act, el.dataset)
}
function goTab(tab) {
  store.setTab(tab)
  drawerOpen.value = false
}

const showFab = computed(() => {
  const t = ui.tab
  return (t === 'tools' && ui.toolCat) ||
    (t === 'jobs' && !ui.openJob) ||
    (t === 'sheets' && ui.sheetsCat && ui.sheetsSub) ||
    (t === 'hardware' && ui.hardwareCat && ui.hardwareSub) ||
    (t === 'calc' && !ui.openTemplate)
})

function onFab() {
  const t = ui.tab
  if (t === 'tools' && ui.toolCat) store.openModal('tool', { presetCat: ui.toolCat })
  else if (t === 'jobs') store.openStartJob()
  else if (t === 'sheets' && ui.sheetsCat && ui.sheetsSub) store.openWizard('sheet', null, ui.sheetsCat, ui.sheetsSub)
  else if (t === 'hardware' && ui.hardwareCat && ui.hardwareSub) store.openWizard('hardware', null, ui.hardwareCat, ui.hardwareSub)
  else if (t === 'calc') store.newTemplate()
}

const themeIcon = computed(() => store.theme.current === 'dark' ? 'moon' : 'sun')

/* toast — ساختار و زمان‌بندی عین لاین 506-521 قدیمی */
const toastMounted = ref(false)
const toastShown = ref(false)
let toastTimer = null
watch(() => store.toastState.id, () => {
  if (toastTimer) clearTimeout(toastTimer)
  toastShown.value = false
  toastMounted.value = true
  nextTick(() => { toastShown.value = true })
  toastTimer = setTimeout(() => { toastShown.value = false; toastMounted.value = false }, 2400)
})

/* اسکرول به بالا هنگام تغییر نما — لاین 686-688 */
watch(() => [ui.tab, ui.toolCat, ui.sheetsCat, ui.sheetsSub, ui.hardwareCat, ui.hardwareSub, ui.openJob, ui.openTemplate], () => {
  const hdr = document.querySelector('header')
  const offset = hdr ? hdr.offsetHeight + 4 : 4
  window.scrollTo({ top: offset, behavior: 'instant' })
}, { deep: true })

function onFileChange(e) {
  const f = e.target.files && e.target.files[0]
  if (f) readBackupFile(store, f)
  e.target.value = ''
}
</script>

<template>
  <header>
    <div class="header-inner">
      <button class="hamburger" aria-label="باز کردن منو" @click="drawerOpen = true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
      <div class="brand">
        <span class="brand-ico"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></span>
        <span class="brand-txt">انبارگردانی کارگاه</span>
      </div>
      <button class="theme-btn" aria-label="تغییر تم" @click="store.toggleTheme()" v-html="navIcon(themeIcon)"></button>
    </div>
  </header>

  <div class="drawer-backdrop" :class="{ show: drawerOpen }" @click="drawerOpen = false"></div>
  <aside class="drawer" :class="{ show: drawerOpen }">
    <div class="drawer-head">
      <span>منوی اصلی</span>
      <button class="x" aria-label="بستن" @click="drawerOpen = false">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <nav id="drawerNav">
      <button v-for="(n, i) in NAV" :key="n.tab" :data-tab="n.tab" :style="{ '--i': i }"
              :class="{ active: ui.tab === n.tab }" @click="goTab(n.tab)">
        <span class="ico" v-html="navIcon(n.icon)"></span>
        <span>{{ n.label }}</span>
        <span v-if="n.badge" class="badge-n" id="navJobsBadge"
              :style="store.openJobsCount > 0 ? { display: '' } : { display: 'none' }">
          {{ store.openJobsCount > 0 ? store.openJobsCount : '' }}
        </span>
      </button>

      <button data-decor-admin :style="{ '--i': 7 }"><span class="ico">🔐</span><span>مدیریت کاربران</span></button>
      <button data-decor-logout :style="{ '--i': 8 }"><span class="ico">🚪</span><span>خروج از حساب</span></button>
    </nav>
  </aside>

  <main id="view" @click="onViewClick">
    <div class="view-enter">
      <DashView v-if="ui.tab === 'dash'" />
      <ToolsView v-else-if="ui.tab === 'tools'" />
      <JobsView v-else-if="ui.tab === 'jobs'" />
      <SheetsView v-else-if="ui.tab === 'sheets'" />
      <HardwareView v-else-if="ui.tab === 'hardware'" />
      <CalcView v-else-if="ui.tab === 'calc'" />
      <SettingsView v-else-if="ui.tab === 'settings'" />
    </div>
  </main>

  <button id="fab" class="fab" :class="{ show: showFab }" aria-label="افزودن" @click="onFab">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
  </button>

  <ModalShell />

  <input type="file" id="fileIn" accept="application/json" hidden @change="onFileChange">

  <div class="toast" :class="[store.toastState.type, { show: toastShown }]" v-if="toastMounted" :key="store.toastState.id">
    <span v-html="ico(store.toastState.type === 'ok' ? 'check' : (store.toastState.type === 'dan' || store.toastState.type === 'warn') ? 'alert' : 'info', 16)"></span>
    <span>{{ store.toastState.msg }}</span>
  </div>
</template>
