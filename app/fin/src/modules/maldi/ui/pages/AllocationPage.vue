<template>
  <div>
    <div class="page-header"><h2>تخصیص خودکار</h2><p>تخصیص مبلغ چک‌های نقد شده یا موجودی صندوق به هزینه‌ها</p></div>

    <div class="cash-card">
      <div class="cash-card-head">
        <div style="minWidth:0;flex:1">
          <div class="cash-card-title">💰 صندوق نقدی</div>
          <div class="cash-card-sub">موجودی قابل استفاده از چک‌های نقد شده</div>
          <div style="fontSize:10.5px;color:var(--text-muted);marginTop:4px">جمع دریافتی: {{ formatMoney(cashIn) }} — جمع پرداختی: {{ formatMoney(cashOut) }} {{ getUnitLabel(unit) }}</div>
        </div>
        <div style="display:flex;gap:8px;alignItems:center;flexWrap:wrap">
          <div style="textAlign:left">
            <div class="cash-card-balance">{{ formatMoney(cashBalance) }} {{ getUnitLabel(unit) }}</div>
            <div class="cash-card-words">{{ numberToPersianWords(cashBalance) }} {{ getUnitLabel(unit) }}</div>
          </div>
          <button class="btn btn-accent btn-sm" @click="showCashModal = true" :disabled="cashBalance <= 0"><AppIcon name="cash" /> پرداخت از صندوق</button>
        </div>
      </div>
    </div>

    <div v-if="availableChecks.length === 0" class="card">
      <div class="empty-state"><p>هنوز چک نقد شده‌ای نیست</p></div>
    </div>

    <div v-for="ch in availableChecks" :key="ch.id" class="allocation-card">
      <div class="allocation-header">
        <div style="minWidth:0;flex:1">
          <div style="fontWeight:700;fontSize:15px;color:#fff">{{ ch.payerName }}</div>
          <div style="fontSize:12px;color:var(--text-secondary);marginTop:2px">مبلغ: <span style="color:var(--accent);fontWeight:600">{{ formatMoney(ch.amount) }}</span> {{ getUnitLabel(unit) }} — سررسید: {{ JalaliDate.formatGregorian(ch.dueDate) }}</div>
          <div v-if="ch.notes" style="fontSize:11px;color:var(--text-muted);marginTop:4px">📝 {{ ch.notes }}</div>
        </div>
        <div style="display:flex;gap:8px;alignItems:center;flexWrap:wrap">
          <span style="fontSize:12px;fontWeight:600" :style="{ color: rem(ch) > 0 ? 'var(--warning)' : 'var(--success)' }">{{ rem(ch) > 0 ? 'باقیمانده: ' + formatMoney(rem(ch)) : 'کامل تخصیص شد' }}</span>
          <button class="btn btn-accent btn-sm" @click="selectedCheck = ch"><AppIcon name="allocate" /> {{ totalAlloc(ch) > 0 ? 'ویرایش' : 'تخصیص' }}</button>
        </div>
      </div>
      <div class="allocation-bar"><div class="allocation-fill" :style="{ width: pct(ch) + '%', background: pct(ch) >= 100 ? 'var(--success)' : pct(ch) > 0 ? 'var(--accent)' : 'var(--surface-3)' }"></div></div>
      <div v-if="allocsFor(ch).length > 0" class="allocation-items">
        <div v-for="a in allocsFor(ch)" :key="a.id" class="allocation-item">
          <div style="display:flex;alignItems:center;gap:8px;minWidth:0">
            <span style="width:8px;height:8px;borderRadius:50%" :style="{ background: getCategoryColor(expenseOf(a)?.category || 'misc') }"></span>
            <span style="overflow:hidden;textOverflow:ellipsis;whiteSpace:nowrap">{{ expenseName(a.expenseId) }}</span>
          </div>
          <span style="fontWeight:600;whiteSpace:nowrap;color:var(--accent)">{{ formatMoney(a.amount) }} {{ getUnitLabel(unit) }}</span>
        </div>
      </div>
    </div>

    <AllocationModal v-if="selectedCheck" :check="selectedCheck" :data="data" @save="allocs => handleSaveAlloc(selectedCheck, allocs)" @close="selectedCheck = null" />
    <CashAllocationModal v-if="showCashModal" :data="data" @save="onCashSave" @close="showCashModal = false" />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from '../components/AppIcon.vue'
import AllocationModal from '../../management/AllocationModal.vue'
import CashAllocationModal from '../../management/CashAllocationModal.vue'
import { JalaliDate } from '../../core/jalali.js'
import { recordTx, syncPaidFromAllocations, calcCashBalance } from '../../core/finance.js'
import { genId, todayISO, formatMoney, getUnitLabel, numberToPersianWords, getCategoryColor } from '../../config/units.js'
import { useMaldiStore } from '../../store/maldi-store.js'

const store = useMaldiStore()
const data = computed(() => store.data)
const unit = computed(() => data.value.settings?.unit || 'toman')

const availableChecks = computed(() => data.value.checks.filter(c => c.status === 'cashed'))
const selectedCheck = ref(null)
const showCashModal = ref(false)
const cashBalance = computed(() => calcCashBalance(data.value))
const cashIn = computed(() => availableChecks.value.reduce((s, c) => s + c.amount, 0))
const cashOut = computed(() => cashIn.value - cashBalance.value)

const allocsFor = ch => data.value.allocations.filter(a => a.checkId === ch.id)
const totalAlloc = ch => allocsFor(ch).reduce((s, a) => s + a.amount, 0)
const rem = ch => ch.amount - totalAlloc(ch)
const pct = ch => Math.min(100, Math.round((totalAlloc(ch) / ch.amount) * 100))
const expenseOf = a => data.value.expenses.find(e => e.id === a.expenseId)
const expenseName = id => { const ex = data.value.expenses.find(e => e.id === id); return ex ? ex.name : 'حذف شده' }

function onCashSave() {
  store.toast('ثبت شد')
  showCashModal.value = false
}

function handleSaveAlloc(check, newAllocs) {
  store.setData(d => {
    const others = d.allocations.filter(a => a.checkId !== check.id)
    const fresh = newAllocs.filter(a => a.amount > 0).map(a => ({ id: genId(), checkId: check.id, expenseId: a.expenseId, amount: a.amount, date: todayISO() }))
    const newData = { ...d, allocations: [...others, ...fresh] }
    newData.paidRecord = { ...newData.paidRecord, expenses: syncPaidFromAllocations(newData) }
    const sum = newAllocs.reduce((s, a) => s + a.amount, 0)
    return recordTx(newData, { type: 'alloc', title: 'تخصیص چک ' + check.payerName, amount: sum, meta: { count: newAllocs.length } })
  })
  store.toast('تخصیص ذخیره شد')
  selectedCheck.value = null
}
</script>
