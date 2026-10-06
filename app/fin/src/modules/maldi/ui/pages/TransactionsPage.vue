<template>
  <div>
    <div class="page-header"><h2>تراکنش‌ها</h2><p>تاریخچه‌ی کامل تمام فعالیت‌ها ({{ getUnitLabel(unit) }})</p></div>

    <div class="stats-grid cols-3">
      <div class="stat-card blue"><div class="stat-label">کل تراکنش‌ها</div><div class="stat-value" style="color:var(--info);font-size:22px">{{ formatMoney(filtered.length) }} مورد</div></div>
      <div class="stat-card green"><div class="stat-label">مجموع ورودی‌ها</div><div class="stat-value" style="color:var(--success);font-size:22px">{{ formatMoney(totalIn) }} {{ getUnitLabel(unit) }}</div><div class="stat-words">{{ moneyWords(totalIn, unit) }}</div></div>
      <div class="stat-card red"><div class="stat-label">مجموع خروجی‌ها</div><div class="stat-value" style="color:var(--danger);font-size:22px">{{ formatMoney(totalOut) }} {{ getUnitLabel(unit) }}</div><div class="stat-words">{{ moneyWords(totalOut, unit) }}</div></div>
    </div>

    <div class="card">
      <div class="filter-grid">
        <div class="form-group"><label class="form-label">از تاریخ</label><JalaliDatePicker :value="startDate" @update:value="v => { startDate = v; page = 1 }" /></div>
        <div class="form-group"><label class="form-label">تا تاریخ</label><JalaliDatePicker :value="endDate" @update:value="v => { endDate = v; page = 1 }" /></div>
        <div class="form-group"><label class="form-label">نوع</label>
          <select class="form-input" :value="typeFilter" @change="typeFilter = $event.target.value; page = 1">
            <option value="all">همه</option>
            <option v-for="k in uniqueTypes" :key="k" :value="k">{{ TX_TYPES[k].label }}</option>
          </select>
        </div>
        <div class="filter-actions"><button class="btn btn-outline btn-sm" @click="clearFilters">پاک کردن فیلتر</button></div>
      </div>

      <div v-if="pageItems.length === 0" class="empty-state"><p>تراکنشی یافت نشد</p></div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>تاریخ</th><th>نوع</th><th>عنوان</th><th>مبلغ</th></tr></thead>
          <tbody>
            <tr v-for="tx in pageItems" :key="tx.id">
              <td style="fontWeight:500;whiteSpace:nowrap">{{ JalaliDate.formatGregorian(tx.date) }}</td>
              <td><span class="tx-badge" :class="(TX_TYPES[tx.type] || { label: tx.type, kind: 'info' }).kind">{{ (TX_TYPES[tx.type] || { label: tx.type }).label }}</span></td>
              <td>
                <div>{{ tx.title }}</div>
                <div v-if="tx.meta && tx.meta.recipient" class="tx-detail">👤 {{ tx.meta.recipient }}</div>
                <div v-if="tx.meta && tx.meta.note" class="tx-detail">📝 {{ tx.meta.note }}</div>
              </td>
              <td style="fontWeight:600;color:var(--accent);whiteSpace:nowrap">{{ tx.amount ? formatMoney(tx.amount) + ' ' + getUnitLabel(unit) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-if="filtered.length > 0" class="pagination">
        <div class="pagination-info">نمایش {{ formatMoney((currentPage - 1) * PER_PAGE + 1) }} تا {{ formatMoney(Math.min(currentPage * PER_PAGE, filtered.length)) }} از {{ formatMoney(filtered.length) }} مورد</div>
        <div class="pagination-controls">
          <button class="page-btn" @click="page = 1" :disabled="currentPage === 1">اول</button>
          <button class="page-btn" @click="page = Math.max(1, currentPage - 1)" :disabled="currentPage === 1">قبلی</button>
          <button v-for="p in pageNumbers" :key="p" class="page-btn" :class="{ active: p === currentPage }" @click="page = p">{{ formatMoney(p) }}</button>
          <button class="page-btn" @click="page = Math.min(totalPages, currentPage + 1)" :disabled="currentPage === totalPages">بعدی</button>
          <button class="page-btn" @click="page = totalPages" :disabled="currentPage === totalPages">آخر</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from '../components/AppIcon.vue' // eslint-disable-line
import JalaliDatePicker from '../components/JalaliDatePicker.vue'
import { JalaliDate } from '../../core/jalali.js'
import { TX_TYPES } from '../../core/finance.js'
import { formatMoney, moneyWords, getUnitLabel } from '../../config/units.js'
import { useMaldiStore } from '../../store/maldi-store.js'

const store = useMaldiStore()
const data = computed(() => store.data)
const unit = computed(() => data.value.settings?.unit || 'toman')

const startDate = ref('')
const endDate = ref('')
const typeFilter = ref('all')
const page = ref(1)
const PER_PAGE = 10

const allTx = computed(() => {
  const arr = [...(data.value.transactions || [])]
  arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  return arr
})
const filtered = computed(() => allTx.value.filter(tx => {
  if (typeFilter.value !== 'all' && tx.type !== typeFilter.value) return false
  if (startDate.value && tx.date < startDate.value) return false
  if (endDate.value && tx.date > endDate.value) return false
  return true
}))
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PER_PAGE)))
const currentPage = computed(() => Math.min(page.value, totalPages.value))
const pageItems = computed(() => filtered.value.slice((currentPage.value - 1) * PER_PAGE, currentPage.value * PER_PAGE))
const totalIn = computed(() => filtered.value.filter(tx => (TX_TYPES[tx.type] || {}).kind === 'in').reduce((s, tx) => s + (tx.amount || 0), 0))
const totalOut = computed(() => filtered.value.filter(tx => (TX_TYPES[tx.type] || {}).kind === 'out').reduce((s, tx) => s + (tx.amount || 0), 0))

const pageNumbers = computed(() => Array.from({ length: Math.min(5, totalPages.value) }, (_, i) => {
  let p
  if (totalPages.value <= 5) p = i + 1
  else if (currentPage.value <= 3) p = i + 1
  else if (currentPage.value >= totalPages.value - 2) p = totalPages.value - 4 + i
  else p = currentPage.value - 2 + i
  return p
}))

function clearFilters() { startDate.value = ''; endDate.value = ''; typeFilter.value = 'all'; page.value = 1 }
const uniqueTypes = Object.keys(TX_TYPES)
</script>
