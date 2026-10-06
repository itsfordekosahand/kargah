<template>
  <div>
    <div class="page-header"><h2>داشبورد</h2><p>نمای کلی وضعیت مالی — واحد: {{ getUnitLabel(unit) }}</p></div>

    <div class="month-selector">
      <button @click="prevMonth" type="button"><AppIcon name="arrowLeft" /></button>
      <span>{{ monthNames[viewJM - 1] }} {{ viewJY }}</span>
      <button @click="nextMonth" type="button"><AppIcon name="arrowRight" /></button>
    </div>

    <div class="stats-grid">
      <div class="stat-card gold">
        <div class="stat-label">چک‌های {{ monthNames[viewJM - 1] }}</div>
        <div class="stat-value" style="color:var(--accent)">{{ formatMoney(monthChecksTotal) }}</div>
        <div class="stat-words">{{ moneyWords(monthChecksTotal, unit) }}</div>
        <div class="stat-sub"><span>{{ monthChecks.length }} فقره</span><span v-if="monthChecksPending > 0">{{ formatMoney(monthChecksPending) }} منتظر</span></div>
      </div>
      <div class="stat-card teal">
        <div class="stat-label">منتقل شده (کل دوره)</div>
        <div class="stat-value" style="color:#14B8A6">{{ formatMoney(allTimeTransferred) }}</div>
        <div class="stat-words">{{ moneyWords(allTimeTransferred, unit) }}</div>
        <div class="stat-sub"><span>{{ transferredCount }} فقره</span><span v-if="monthChecksTransferred > 0">این ماه: {{ formatMoney(monthChecksTransferred) }}</span></div>
      </div>
      <div class="stat-card gold" style="borderColor:rgba(255,153,0,0.4)">
        <div class="stat-label">همه‌ی منتظرها</div>
        <div class="stat-value" style="color:var(--accent)">{{ formatMoney(allPendingTotal) }}</div>
        <div class="stat-words">{{ moneyWords(allPendingTotal, unit) }}</div>
        <div class="stat-sub"><span>{{ allPendingChecks.length }} فقره</span><span v-if="overduePending.length > 0" style="color:var(--danger)">{{ overduePending.length }} سررسید</span></div>
      </div>
      <div class="stat-card green">
        <div class="stat-label">نقد شده {{ monthNames[viewJM - 1] }}</div>
        <div class="stat-value" style="color:var(--success)">{{ formatMoney(monthChecksCashed) }}</div>
        <div class="stat-words">{{ moneyWords(monthChecksCashed, unit) }}</div>
        <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: checkCashedPct + '%', background: 'var(--success)' }"></div></div>
        <div class="stat-sub"><span>از {{ formatMoney(monthChecksTotal) }}</span><span>{{ checkCashedPct }}٪</span></div>
      </div>
      <div class="stat-card blue">
        <div class="stat-label">هزینه‌های {{ monthNames[viewJM - 1] }}</div>
        <div class="stat-value" style="color:var(--info)">{{ formatMoney(monthExpensesTotal) }}</div>
        <div class="stat-words">{{ moneyWords(monthExpensesTotal, unit) }}</div>
        <div class="stat-bar"><div class="stat-bar-fill" :style="{ width: expensePaidPct + '%', background: 'var(--success)' }"></div></div>
        <div class="stat-sub"><span>پرداخت‌شده: {{ formatMoney(monthExpensesPaid) }}</span><span>{{ expensePaidPct }}٪</span></div>
      </div>
    </div>

    <div class="stats-grid" style="gridTemplateColumns:1fr 1fr;marginBottom:20px">
      <div class="stat-card green">
        <div class="stat-label">مجموع دریافتی (نقد شده — کل دوره)</div>
        <div class="stat-value" style="color:var(--success);font-size:22px">{{ formatMoney(allTimeCashed) }}</div>
        <div class="stat-words">{{ moneyWords(allTimeCashed, unit) }}</div>
        <div class="stat-sub"><span style="color:var(--text-muted)">منتقل شده (خارج از صندوق): {{ formatMoney(allTimeTransferred) }}</span></div>
      </div>
      <div class="stat-card red">
        <div class="stat-label">مجموع پرداختی (کل دوره)</div>
        <div class="stat-value" style="color:var(--danger);font-size:22px">{{ formatMoney(allTimePaid) }}</div>
        <div class="stat-words">{{ moneyWords(allTimePaid, unit) }}</div>
        <div class="stat-sub"><span>{{ paidCount }} مورد</span></div>
      </div>
    </div>

    <div class="balance-card" :class="currentPositive ? 'positive' : 'negative'">
      <div class="balance-title">💰 موجودی فعلی صندوق</div>
      <div class="balance-value" :class="currentPositive ? 'positive' : 'negative'">
        <AppIcon v-if="currentPositive" name="up" /><AppIcon v-else name="down" />
        <span>{{ currentBalance >= 0 ? '+' : '-' }} {{ displayMoney(Math.abs(currentBalance), unit) }}</span>
      </div>
      <div class="balance-words">{{ moneyWords(Math.abs(currentBalance), unit) }}</div>
      <span class="balance-status" :class="currentPositive ? 'positive' : 'negative'">{{ currentPositive ? '✓ مثبت' : '✗ منفی' }}</span>
      <div class="balance-projection">
        <div style="marginBottom:6px">📊 <strong>پیش‌بینی پس از تسویه‌ی هزینه‌های {{ monthNames[viewJM - 1] }}:</strong></div>
        <div>اگر {{ displayMoney(monthExpensesRemaining, unit) }} باقیمانده پرداخت شود:</div>
        <div style="marginTop:6px;fontSize:14px">موجودی نهایی = <span :class="projectedPositive ? 'pos' : 'neg'">{{ projectedPositive ? '+' : '-' }} {{ displayMoney(Math.abs(projectedBalance), unit) }}</span> ({{ projectedPositive ? 'مثبت ✓' : 'کسری ✗' }})</div>
      </div>
    </div>

    <div class="chart-grid">
      <div class="chart-box"><h3>وضعیت کلی</h3><div class="chart-container"><canvas ref="chartRef1"></canvas></div></div>
      <div class="chart-box"><h3>توزیع هزینه‌ها</h3><div class="chart-container"><canvas ref="chartRef2"></canvas></div></div>
    </div>

    <div style="marginTop:20px">
      <div class="card">
        <div class="card-header">
          <span class="card-title">آخرین تراکنش‌ها</span>
          <button class="btn btn-outline btn-sm" @click="store.setPage('transactions')">مشاهده همه</button>
        </div>
        <div v-if="(data.transactions || []).length === 0" class="empty-state"><p>هنوز تراکنشی ثبت نشده</p></div>
        <div v-else class="table-wrap">
          <table>
            <thead><tr><th>تاریخ</th><th>نوع</th><th>عنوان</th><th>مبلغ</th></tr></thead>
            <tbody>
              <tr v-for="tx in lastTx" :key="tx.id">
                <td>{{ JalaliDate.formatGregorian(tx.date) }}</td>
                <td><span class="tx-badge" :class="(TX_TYPES[tx.type] || { label: tx.type, kind: 'info' }).kind">{{ (TX_TYPES[tx.type] || { label: tx.type }).label }}</span></td>
                <td>{{ tx.title }}</td>
                <td><div style="fontWeight:600;color:var(--accent)">{{ formatMoney(tx.amount || 0) }} {{ getUnitLabel(unit) }}</div></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import { JalaliDate, jalaliMonthRange } from '../../core/jalali.js'
import { TX_TYPES } from '../../core/finance.js'
import { formatMoney, moneyWords, displayMoney, formatMoneyTick, getUnitLabel, getCategoryLabel, getCategoryColor, todayISO } from '../../config/units.js'
import { useMaldiStore } from '../../store/maldi-store.js'

const store = useMaldiStore()
const data = computed(() => store.data)
const unit = computed(() => data.value.settings?.unit || 'toman')

const jToday = JalaliDate.today()
const viewJY = ref(jToday.jy)
const viewJM = ref(jToday.jm)

const range = computed(() => jalaliMonthRange(viewJY.value, viewJM.value))

const monthChecks = computed(() => data.value.checks.filter(c => {
  const t = new Date(c.dueDate).getTime()
  return t >= range.value.startT && t <= range.value.endT
}))
const monthChecksTotal = computed(() => monthChecks.value.reduce((s, c) => s + c.amount, 0))
const monthChecksCashed = computed(() => monthChecks.value.filter(c => c.status === 'cashed').reduce((s, c) => s + c.amount, 0))
const monthChecksPending = computed(() => monthChecks.value.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0))
const monthChecksTransferred = computed(() => monthChecks.value.filter(c => c.status === 'transferred').reduce((s, c) => s + c.amount, 0))

const allPendingChecks = computed(() => data.value.checks.filter(c => c.status === 'pending'))
const allPendingTotal = computed(() => allPendingChecks.value.reduce((s, c) => s + c.amount, 0))
const overduePending = computed(() => {
  const todayT = new Date(todayISO()).getTime()
  return allPendingChecks.value.filter(c => new Date(c.dueDate).getTime() < todayT)
})

const allTimeCashed = computed(() => data.value.checks.filter(c => c.status === 'cashed').reduce((s, c) => s + c.amount, 0))
const allTimeTransferred = computed(() => data.value.checks.filter(c => c.status === 'transferred').reduce((s, c) => s + c.amount, 0))
const transferredCount = computed(() => data.value.checks.filter(c => c.status === 'transferred').length)

const monthExpensesTotal = computed(() => data.value.expenses.reduce((s, e) => s + e.amount, 0))
const monthExpensesPaid = computed(() => data.value.expenses.reduce((s, e) => {
  const k = e.id + '_' + viewJY.value + '_' + viewJM.value
  return data.value.paidRecord.expenses[k] ? s + e.amount : s
}, 0))
const monthExpensesRemaining = computed(() => monthExpensesTotal.value - monthExpensesPaid.value)

const allTimePaid = computed(() => {
  let sum = 0
  Object.keys(data.value.paidRecord.expenses).forEach(k => {
    if (!data.value.paidRecord.expenses[k]) return
    const expId = k.split('_')[0]
    const ex = data.value.expenses.find(e => e.id === expId)
    if (ex) sum += ex.amount
  })
  return sum
})
const paidCount = computed(() => Object.keys(data.value.paidRecord.expenses).filter(k => data.value.paidRecord.expenses[k]).length)

const checkCashedPct = computed(() => monthChecksTotal.value > 0 ? Math.round((monthChecksCashed.value / monthChecksTotal.value) * 100) : 0)
const expensePaidPct = computed(() => monthExpensesTotal.value > 0 ? Math.round((monthExpensesPaid.value / monthExpensesTotal.value) * 100) : 0)
const currentBalance = computed(() => allTimeCashed.value - allTimePaid.value)
const projectedBalance = computed(() => allTimeCashed.value - (allTimePaid.value + monthExpensesRemaining.value))
const projectedPositive = computed(() => projectedBalance.value >= 0)
const currentPositive = computed(() => currentBalance.value >= 0)
const totalDebt = computed(() => data.value.debts.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0))

const lastTx = computed(() => (data.value.transactions || []).slice(-5).reverse())

const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
function prevMonth() { if (viewJM.value === 1) { viewJM.value = 12; viewJY.value = viewJY.value - 1 } else viewJM.value = viewJM.value - 1 }
function nextMonth() { if (viewJM.value === 12) { viewJM.value = 1; viewJY.value = viewJY.value + 1 } else viewJM.value = viewJM.value + 1 }

/* ---------- نمودارها (Chart.js بارگذاری‌شده به‌صورت /vendor/chart.umd.js) ---------- */
const chartRef1 = ref(null)
const chartRef2 = ref(null)
let ci1 = null
let ci2 = null

function renderChart1() {
  if (!chartRef1.value || typeof Chart === 'undefined') return
  if (ci1) ci1.destroy()
  ci1 = new Chart(chartRef1.value, {
    type: 'doughnut',
    data: {
      labels: ['دریافتی', 'منتقل شده', 'منتظر پاس', 'بدهی'],
      datasets: [{ data: [allTimeCashed.value, allTimeTransferred.value, allPendingTotal.value, totalDebt.value], backgroundColor: ['#22C55E', '#14B8A6', '#F59E0B', '#A855F7'], borderColor: '#1A1A1A', borderWidth: 2, borderRadius: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#FFFFFF', font: { family: 'Vazirmatn', size: 11 }, padding: 14, usePointStyle: true, pointStyleWidth: 8 } },
        tooltip: { callbacks: { label: (ctx) => ctx.label + ': ' + displayMoney(ctx.parsed, unit.value) } }
      }
    }
  })
}

function renderChart2() {
  if (!chartRef2.value || typeof Chart === 'undefined') return
  if (ci2) ci2.destroy()
  const cats = {}
  data.value.expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount })
  const labels = Object.keys(cats).map(getCategoryLabel)
  const vals = Object.values(cats)
  const hasData = vals.some(v => v > 0)
  const xScale = hasData
    ? { beginAtZero: true, grid: { display: false }, ticks: { color: '#A0A0A0', font: { family: 'Vazirmatn', size: 10 }, precision: 0, callback: v => formatMoneyTick(v, unit.value) } }
    : { beginAtZero: true, max: (unit.value === 'toman' ? 1000000 : 10), grid: { display: false }, ticks: { color: '#A0A0A0', font: { family: 'Vazirmatn', size: 10 }, precision: 0, callback: v => formatMoneyTick(v, unit.value) } }
  ci2 = new Chart(chartRef2.value, {
    type: 'bar',
    data: {
      labels: labels.length ? labels : ['بدون داده'],
      datasets: [{ data: labels.length ? vals : [0], backgroundColor: labels.length ? Object.keys(cats).map(getCategoryColor) : ['#2A2A2A'], borderWidth: 0, borderRadius: 6, barThickness: 32 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => displayMoney(ctx.parsed.x, unit.value) } } },
      scales: { x: xScale, y: { grid: { display: false }, ticks: { color: '#FFFFFF', font: { family: 'Vazirmatn', size: 12 } } } }
    }
  })
}

function destroyCharts() { if (ci1) { ci1.destroy(); ci1 = null } if (ci2) { ci2.destroy(); ci2 = null } }

onMounted(() => { renderChart1(); renderChart2() })
onBeforeUnmount(destroyCharts)

watch([allTimeCashed, allTimeTransferred, allPendingTotal, totalDebt, unit], renderChart1)
watch([() => data.value.expenses, unit], renderChart2)

</script>
