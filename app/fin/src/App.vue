<template>
  <div class="app">
    <button class="menu-toggle" @click="store.sidebarOpen = !store.sidebarOpen"><AppIcon name="menu" /></button>
    <div class="sidebar-backdrop" :class="{ show: store.sidebarOpen }" @click="store.sidebarOpen = false"></div>

    <aside class="sidebar" :class="{ open: store.sidebarOpen }">
      <div class="sidebar-header"><h1><span>کابینت </span>سهند</h1><p>مدیریت جریان نقدینگی</p></div>
      <nav class="sidebar-nav">
        <div
          v-for="p in pages"
          :key="p.id"
          class="nav-item"
          :class="{ active: store.page === p.id }"
          @click="goto(p.id)"
        ><AppIcon :name="p.icon" /><span>{{ p.label }}</span></div>
        <div class="nav-item" @click="openSettings"><AppIcon name="settings" /><span>تنظیمات</span></div>
      </nav>
      <div class="sidebar-footer">
        <div class="backup-grid">
          <button class="bk-btn primary" @click="handleExportHtml">💾 ذخیره در فایل HTML</button>
          <div class="backup-row">
            <button class="bk-btn" @click="handleExportJson">⬇ خروجی</button>
            <button class="bk-btn" @click="handleImportClick">⬆ ورودی</button>
          </div>
        </div>
        <input ref="fileInputRef" type="file" accept="application/json" style="display:none" @change="handleImportFile" />
        <div class="meta">نسخه ۶.۲ — فیکس باگ تاریخ شمسی</div>
      </div>
    </aside>

    <main class="main">
      <Dashboard v-if="store.page === 'dashboard'" />
      <ChecksPage v-else-if="store.page === 'checks'" />
      <ExpensesPage v-else-if="store.page === 'expenses'" />
      <DebtsPage v-else-if="store.page === 'debts'" />
      <AllocationPage v-else-if="store.page === 'allocations'" />
      <ReportsPage v-else-if="store.page === 'reports'" />
      <TransactionsPage v-else-if="store.page === 'transactions'" />
      <Dashboard v-else />
    </main>

    <Toast position="bottom-left" />

    <ReminderPopup v-if="store.showReminder" :data="store.data" @close="closeReminder" />
    <ImportModal
      v-if="store.importPreview"
      :imported-data="store.importPreview"
      :current-data="store.data"
      @replace="handleImportReplace"
      @merge="handleImportMerge"
      @cancel="store.importPreview = null"
    />
    <SettingsModal v-if="store.showSettings" :data="store.data" @close="store.showSettings = false" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import Toast from 'primevue/toast'
import { useToast } from 'primevue/usetoast'

import AppIcon from './modules/maldi/ui/components/AppIcon.vue'
import ReminderPopup from './modules/maldi/management/ReminderPopup.vue'
import ImportModal from './modules/maldi/management/ImportModal.vue'
import SettingsModal from './modules/maldi/management/SettingsModal.vue'

import Dashboard from './modules/maldi/ui/pages/Dashboard.vue'
import ChecksPage from './modules/maldi/ui/pages/ChecksPage.vue'
import ExpensesPage from './modules/maldi/ui/pages/ExpensesPage.vue'
import DebtsPage from './modules/maldi/ui/pages/DebtsPage.vue'
import AllocationPage from './modules/maldi/ui/pages/AllocationPage.vue'
import ReportsPage from './modules/maldi/ui/pages/ReportsPage.vue'
import TransactionsPage from './modules/maldi/ui/pages/TransactionsPage.vue'

import { useMaldiStore } from './modules/maldi/store/maldi-store.js'
import { normalizeData, mergeData, REMINDER_KEY } from './modules/maldi/core/data.js'
import { todayISO } from './modules/maldi/config/units.js'
import { exportJson, exportHtml, parseImportFile } from './modules/maldi/utils/backup.js'
import { setToastHandler } from './modules/maldi/utils/notify.js'

const store = useMaldiStore()
const toast = useToast()

// پل Toast (معادل setToast در مبدأ)
setToastHandler(msg => toast.add({ severity: 'info', summary: msg, life: 3000, closable: true }))

// وضعیت اولیه — مثل useState در App مبدأ
store.init()

const fileInputRef = ref(null)

const pages = [
  { id: 'dashboard', label: 'داشبورد', icon: 'dashboard' },
  { id: 'checks', label: 'چک‌ها', icon: 'checks' },
  { id: 'expenses', label: 'هزینه‌ها', icon: 'expenses' },
  { id: 'debts', label: 'بدهی‌ها', icon: 'debt' },
  { id: 'allocations', label: 'تخصیص', icon: 'allocate' },
  { id: 'reports', label: 'گزارش و تقویم', icon: 'report' },
  { id: 'transactions', label: 'تراکنش‌ها', icon: 'list' }
]

function goto(id) { store.page = id; store.sidebarOpen = false }
function openSettings() { store.showSettings = true; store.sidebarOpen = false }

function closeReminder() { localStorage.setItem(REMINDER_KEY, todayISO()); store.showReminder = false }

function handleExportHtml() {
  try { exportHtml(store.data); store.toast('فایل HTML ذخیره شد') } catch (e) { store.toast('خطا: ' + e.message) }
}
function handleExportJson() { exportJson(store.data); store.toast('فایل JSON دانلود شد') }
function handleImportClick() { fileInputRef.value && fileInputRef.value.click() }
function handleImportFile(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  parseImportFile(f, (parsed) => { store.importPreview = parsed })
  e.target.value = ''
}
function handleImportReplace() {
  store.setData(() => normalizeData(store.importPreview))
  store.importPreview = null
  store.toast('داده‌ها جایگزین شد')
}
function handleImportMerge() {
  store.setData(prev => mergeData(prev, store.importPreview))
  store.importPreview = null
  store.toast('داده‌ها ادغام شد')
}
</script>
