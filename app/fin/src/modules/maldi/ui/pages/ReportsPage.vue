<template>
  <div>
    <div class="page-header"><h2>گزارش و تقویم</h2><p>خلاصه مالی و تقویم شمسی ({{ getUnitLabel(unit) }})</p></div>

    <div class="month-selector">
      <button type="button" @click="prevMonth"><AppIcon name="arrowLeft" /></button>
      <span>{{ monthNames[viewJM - 1] }} {{ viewJY }}</span>
      <button type="button" @click="nextMonth"><AppIcon name="arrowRight" /></button>
    </div>

    <div class="stats-grid cols-5">
      <div class="stat-card green"><div class="stat-label">دریافتی</div><div class="stat-value" style="color:var(--success);font-size:18px">{{ formatMoney(income) }}</div></div>
      <div class="stat-card teal"><div class="stat-label">منتقل شده</div><div class="stat-value" style="color:#14B8A6;font-size:18px">{{ formatMoney(transferred) }}</div></div>
      <div class="stat-card gold"><div class="stat-label">منتظر پاس</div><div class="stat-value" style="color:var(--accent);font-size:18px">{{ formatMoney(pending) }}</div></div>
      <div class="stat-card red"><div class="stat-label">برگشتی</div><div class="stat-value" style="color:var(--danger);font-size:18px">{{ formatMoney(bounced) }}</div></div>
      <div class="stat-card purple"><div class="stat-label">بدهی معوق</div><div class="stat-value" style="color:var(--purple);font-size:18px">{{ formatMoney(totalDebtAll) }}</div></div>
    </div>

    <div class="chart-box">
      <h3>مقایسه هزینه و پرداخت</h3>
      <div class="chart-container"><canvas ref="chartRef"></canvas></div>
    </div>

    <ShamsiCalendar :data="data" />

    <div class="card" style="marginTop:20px">
      <div class="card-header"><span class="card-title">جزئیات هزینه‌ها</span></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>هزینه</th><th>مبلغ</th><th>روز</th><th>پرداخت</th><th>مانده</th><th>وضعیت</th></tr></thead>
          <tbody>
            <tr v-for="ex in sortedExpenses" :key="ex.id">
              <td style="fontWeight:600">{{ ex.name }}</td>
              <td style="color:var(--accent)">{{ formatMoney(ex.amount) }}</td>
              <td>روز {{ ex.dueDay }}</td>
              <td :style="{ color: isPaid(ex) ? 'var(--success)' : 'var(--text-muted)' }">{{ isPaid(ex) ? formatMoney(ex.amount) : '۰' }}</td>
              <td :style="{ color: isPaid(ex) ? 'var(--success)' : 'var(--danger)' }">{{ isPaid(ex) ? '۰' : formatMoney(ex.amount) }}</td>
              <td><span class="badge" :class="isPaid(ex) ? 'paid' : 'unpaid'">{{ isPaid(ex) ? 'پرداخت شده' : 'پرداخت نشده' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import ShamsiCalendar from '../components/ShamsiCalendar.vue'
import { JalaliDate, jalaliMonthRange, effectiveDueDay } from '../../core/jalali.js'
import { formatMoney, formatMoneyTick, getUnitLabel } from '../../config/units.js'
import { useMaldiStore } from '../../store/maldi-store.js'

const store = useMaldiStore()
const data = computed(() => store.data)
const unit = computed(() => data.value.settings?.unit || 'toman')

const jToday = JalaliDate.today()
const viewJM = ref(jToday.jm)
const viewJY = ref(jToday.jy)
const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

function nextMonth() { if (viewJM.value === 12) { viewJM.value = 1; viewJY.value = viewJY.value + 1 } else viewJM.value = viewJM.value + 1 }
function prevMonth() { if (viewJM.value === 1) { viewJM.value = 12; viewJY.value = viewJY.value - 1 } else viewJM.value = viewJM.value - 1 }

const range = computed(() => jalaliMonthRange(viewJY.value, viewJM.value))

const monthChecks = computed(() => data.value.checks.filter(c => {
  const t = new Date(c.dueDate).getTime()
  return t >= range.value.startT && t <= range.value.endT
}))
const monthAllocs = computed(() => data.value.allocations.filter(a => {
  const ch = data.value.checks.find(c => c.id === a.checkId)
  if (!ch) return false
  const t = new Date(ch.dueDate).getTime()
  return t >= range.value.startT && t <= range.value.endT
}))

const income = computed(() => monthChecks.value.filter(c => c.status === 'cashed').reduce((s, c) => s + c.amount, 0))
const transferred = computed(() => monthChecks.value.filter(c => c.status === 'transferred').reduce((s, c) => s + c.amount, 0))
const pending = computed(() => monthChecks.value.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0))
const bounced = computed(() => monthChecks.value.filter(c => c.status === 'bounced').reduce((s, c) => s + c.amount, 0))
const totalPaid = computed(() => monthAllocs.value.reduce((s, a) => s + a.amount, 0))
const totalDebtAll = computed(() => data.value.debts.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0))

const sortedExpenses = computed(() => data.value.expenses.slice().sort((a, b) => a.dueDay - b.dueDay))
function isPaid(ex) { return !!data.value.paidRecord.expenses[ex.id + '_' + viewJY.value + '_' + viewJM.value] }

const chartRef = ref(null)
let chartInst = null

function renderChart() {
  if (!chartRef.value || typeof Chart === 'undefined') return
  if (chartInst) chartInst.destroy()
  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const expByDay = days.map(d => data.value.expenses.filter(e => effectiveDueDay(e.dueDay, viewJY.value, viewJM.value) === d).reduce((s, e) => s + e.amount, 0))
  const allocByDay = days.map(d => data.value.allocations.filter(a => {
    const ex = data.value.expenses.find(e => e.id === a.expenseId)
    return ex && effectiveDueDay(ex.dueDay, viewJY.value, viewJM.value) === d
  }).reduce((s, a) => s + a.amount, 0))
  const hasData = expByDay.some(v => v > 0) || allocByDay.some(v => v > 0)
  const yScale = hasData
    ? { beginAtZero: true, grid: { color: '#2A2A2A' }, ticks: { color: '#A0A0A0', font: { family: 'Vazirmatn', size: 10 }, precision: 0, callback: v => formatMoneyTick(v, unit.value) } }
    : { beginAtZero: true, max: (unit.value === 'toman' ? 1000000 : 10), grid: { color: '#2A2A2A' }, ticks: { color: '#A0A0A0', font: { family: 'Vazirmatn', size: 10 }, precision: 0, callback: v => formatMoneyTick(v, unit.value) } }
  chartInst = new Chart(chartRef.value, {
    type: 'bar',
    data: {
      labels: days.map(d => d.toString()),
      datasets: [
        { label: 'هزینه', data: expByDay, backgroundColor: 'rgba(96,165,250,0.45)', borderColor: '#60A5FA', borderWidth: 1, borderRadius: 4 },
        { label: 'پرداخت شده', data: allocByDay, backgroundColor: 'rgba(34,197,94,0.45)', borderColor: '#22C55E', borderWidth: 1, borderRadius: 4 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: '#FFFFFF', font: { family: 'Vazirmatn', size: 11 }, usePointStyle: true } } },
      scales: { x: { grid: { display: false }, ticks: { color: '#A0A0A0', font: { family: 'Vazirmatn', size: 9 } } }, y: yScale }
    }
  })
}

onMounted(renderChart)
onBeforeUnmount(() => { if (chartInst) { chartInst.destroy(); chartInst = null } })
watch([viewJM, viewJY, () => data.value.expenses, () => data.value.allocations, unit], renderChart)
</script>
