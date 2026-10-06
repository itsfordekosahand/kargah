<template>
  <Modal title="پرداخت هزینه از صندوق نقدی" wide @close="$emit('close')">
    <div class="alloc-check-head">
      <h4>💰 صندوق نقدی</h4>
      <p>موجودی قابل استفاده: <strong style="color:var(--accent)">{{ displayMoney(cashBalance, unit) }}</strong></p>
      <div class="words">{{ moneyWords(cashBalance, unit) }}</div>
    </div>
    <div class="alloc-summary">
      <div class="alloc-summary-box">
        <div class="alloc-summary-label">موجودی صندوق</div>
        <div class="alloc-summary-value" style="color:var(--accent)">{{ formatMoney(cashBalance) }}</div>
        <div class="alloc-summary-words">{{ moneyWords(cashBalance, unit) }}</div>
      </div>
      <div class="alloc-summary-box">
        <div class="alloc-summary-label">جمع انتخاب</div>
        <div class="alloc-summary-value" style="color:var(--info)">{{ formatMoney(totalSelected) }}</div>
        <div class="alloc-summary-words">{{ moneyWords(totalSelected, unit) }}</div>
      </div>
      <div class="alloc-summary-box">
        <div class="alloc-summary-label">باقیمانده</div>
        <div class="alloc-summary-value" :style="{ color: overBudget ? 'var(--danger)' : remaining > 0 ? 'var(--warning)' : 'var(--success)' }">{{ formatMoney(Math.abs(remaining)) }}</div>
        <div class="alloc-summary-words">{{ moneyWords(Math.abs(remaining), unit) }}{{ overBudget ? ' (بیش از موجودی)' : '' }}</div>
      </div>
    </div>

    <div class="month-selector" style="margin-bottom:12px;margin-top:0">
      <button type="button" @click="prevMonth"><AppIcon name="arrowLeft" /></button>
      <span>{{ monthNames[viewJM - 1] }} {{ viewJY }}</span>
      <button type="button" @click="nextMonth"><AppIcon name="arrowRight" /></button>
    </div>

    <div v-if="overBudget" class="alloc-note">⚠ جمع انتخاب از موجودی صندوق بیشتر است.</div>

    <div v-if="unpaidExpenses.length === 0" class="empty-state" style="padding:30px 20px">
      <p>هزینه‌ی پرداخت‌نشده‌ای برای این ماه وجود ندارد</p>
    </div>
    <div v-else class="alloc-list">
      <div
        v-for="e in unpaidExpenses"
        :key="e.id"
        class="alloc-row clickable"
        @click="canAfford(e) && toggle(e)"
      >
        <div class="alloc-row-info">
          <div class="alloc-row-name">
            <span class="alloc-checkbox" :class="{ on: isSelected(e), disabled: !canAfford(e) }">{{ isSelected(e) ? '✓' : '' }}</span>
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-left:6px" :style="{ background: getCategoryColor(e.category) }"></span>{{ e.name }}
          </div>
          <div class="alloc-row-meta">
            <span>مبلغ: <strong style="color:#fff">{{ formatMoney(e.amount) }}</strong></span>
            <span>روز: {{ e.dueDay }}</span>
            <span>{{ getCategoryLabel(e.category) }}</span>
          </div>
        </div>
        <div style="text-align:left;min-width:110px">
          <div style="font-weight:600;font-size:13px" :style="{ color: isSelected(e) ? 'var(--accent)' : 'var(--text-muted)' }">{{ displayMoney(e.amount, unit) }}</div>
          <div style="font-size:10px;color:var(--text-muted);margin-top:2px">{{ moneyWords(e.amount, unit) }}</div>
        </div>
      </div>
    </div>

    <div class="modal-actions">
      <button type="button" class="btn btn-accent" :disabled="overBudget || totalSelected === 0" @click="handleSave">
        <AppIcon name="check" /> پرداخت {{ totalSelected > 0 ? '(' + formatMoney(totalSelected) + ')' : '' }}
      </button>
      <button type="button" class="btn btn-outline" @click="$emit('close')">انصراف</button>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '../ui/components/Modal.vue'
import AppIcon from '../ui/components/AppIcon.vue'
import { JalaliDate } from '../core/jalali.js'
import { calcCashBalance, recordTx } from '../core/finance.js'
import { formatMoney, moneyWords, displayMoney, getCategoryColor, getCategoryLabel } from '../config/units.js'
import { useMaldiStore } from '../store/maldi-store.js'

const props = defineProps({ data: { type: Object, required: true } })
const emit = defineEmits(['save', 'close'])

const store = useMaldiStore()
const unit = computed(() => props.data.settings?.unit || 'toman')
const jToday = JalaliDate.today()
const viewJY = ref(jToday.jy)
const viewJM = ref(jToday.jm)
const cashBalance = computed(() => calcCashBalance(props.data))
const unpaidExpenses = computed(() => props.data.expenses
  .filter(e => {
    const k = e.id + '_' + viewJY.value + '_' + viewJM.value
    return !props.data.paidRecord.expenses[k]
  })
  .sort((a, b) => a.dueDay - b.dueDay))

const selected = ref({})
watch([viewJY, viewJM], () => { selected.value = {} })

const totalSelected = computed(() => unpaidExpenses.value.reduce((s, e) => selected.value[e.id] ? s + e.amount : s, 0))
const remaining = computed(() => cashBalance.value - totalSelected.value)
const overBudget = computed(() => remaining.value < 0)

function isSelected(e) { return !!selected.value[e.id] }
function canAfford(e) { return isSelected(e) || (totalSelected.value + e.amount <= cashBalance.value) }
function toggle(ex) {
  if (!selected.value[ex.id] && totalSelected.value + ex.amount > cashBalance.value) return
  selected.value = { ...selected.value, [ex.id]: !selected.value[ex.id] }
}
function handleSave() {
  if (overBudget.value) return
  if (totalSelected.value === 0) { emit('close'); return }
  store.setData(d => {
    const newPaid = { ...d.paidRecord.expenses }
    const paidNames = []
    unpaidExpenses.value.forEach(e => {
      if (selected.value[e.id]) {
        newPaid[e.id + '_' + viewJY.value + '_' + viewJM.value] = true
        paidNames.push(e.name)
      }
    })
    const newData = { ...d, paidRecord: { ...d.paidRecord, expenses: newPaid } }
    return recordTx(newData, { type: 'cash_pay', title: 'پرداخت از صندوق برای ' + paidNames.length + ' هزینه', amount: totalSelected.value, meta: { names: paidNames } })
  })
  emit('save')
}

const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
function prevMonth() {
  if (viewJM.value === 1) { viewJM.value = 12; viewJY.value = viewJY.value - 1 } else viewJM.value = viewJM.value - 1
}
function nextMonth() {
  if (viewJM.value === 12) { viewJM.value = 1; viewJY.value = viewJY.value + 1 } else viewJM.value = viewJM.value + 1
}
</script>
