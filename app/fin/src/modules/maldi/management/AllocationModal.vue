<template>
  <Modal
    :title="(hasExisting ? 'ویرایش تخصیص — ' : 'تخصیص چک — ') + check.payerName"
    wide
    @close="$emit('close')"
  >
    <div class="alloc-check-head">
      <h4>{{ check.payerName }}</h4>
      <p>
        مبلغ: <strong style="color:var(--accent)">{{ displayMoney(check.amount, unit) }}</strong>
        • سررسید: {{ JalaliDate.formatGregorian(check.dueDate) }}
      </p>
      <div class="words">{{ moneyWords(check.amount, unit) }}</div>
    </div>
    <div class="alloc-summary">
      <div class="alloc-summary-box">
        <div class="alloc-summary-label">مبلغ چک</div>
        <div class="alloc-summary-value" style="color:var(--accent)">{{ formatMoney(check.amount) }}</div>
        <div class="alloc-summary-words">{{ moneyWords(check.amount, unit) }}</div>
      </div>
      <div class="alloc-summary-box">
        <div class="alloc-summary-label">جمع تخصیص</div>
        <div class="alloc-summary-value" style="color:var(--info)">{{ formatMoney(totalAlloc) }}</div>
        <div class="alloc-summary-words">{{ moneyWords(totalAlloc, unit) }}</div>
      </div>
      <div class="alloc-summary-box">
        <div class="alloc-summary-label">باقیمانده</div>
        <div class="alloc-summary-value" :style="{ color: overAllocated ? 'var(--danger)' : remainingOnCheck > 0 ? 'var(--warning)' : 'var(--success)' }">{{ formatMoney(Math.abs(remainingOnCheck)) }}</div>
        <div class="alloc-summary-words">{{ moneyWords(Math.abs(remainingOnCheck), unit) }}{{ overAllocated ? ' (بیش از چک)' : '' }}</div>
      </div>
    </div>

    <div v-if="expenseRows.length === 0" class="empty-state" style="padding:30px 20px">
      <p>هزینه‌ای با مانده‌ی قابل تخصیص وجود ندارد</p>
    </div>
    <template v-else>
      <div v-if="overAllocated" class="alloc-note">⚠ مجموع تخصیص از مبلغ چک بیشتر است.</div>
      <div class="alloc-toolbar" style="margin-bottom:12px;margin-top:0">
        <button type="button" class="btn btn-sm" :class="mode === 'auto' ? 'btn-accent' : 'btn-outline'" @click="handleAuto">
          <AppIcon name="check" /> تخصیص خودکار
        </button>
        <button type="button" class="btn btn-outline btn-sm" @click="handleClear">پاک کردن همه</button>
      </div>
      <div class="alloc-list">
        <div v-for="e in expenseRows" :key="e.id" class="alloc-row">
          <div class="alloc-row-info">
            <div class="alloc-row-name">
              <span style="display:inline-block;width:8px;height:8px;border-radius:50%" :style="{ background: getCategoryColor(e.category) }"></span>{{ e.name }}
            </div>
            <div class="alloc-row-meta">
              <span>کل: <strong style="color:#fff">{{ formatMoney(e.amount) }}</strong></span>
              <span v-if="e.paidByOthers > 0">پرداخت‌شده: <strong style="color:var(--info)">{{ formatMoney(e.paidByOthers) }}</strong></span>
              <span>مانده: <strong style="color:var(--warning)">{{ formatMoney(e.remaining) }}</strong></span>
              <span>روز: {{ e.dueDay }}</span>
            </div>
          </div>
          <div>
            <input
              type="number"
              class="alloc-row-input"
              :class="{ warn: invalid(e) }"
              :value="allocMap[e.id] || 0"
              min="0"
              :max="e.remaining"
              @input="setAmount(e.id, $event.target.value)"
            />
            <div class="alloc-row-max">حداکثر {{ formatMoney(e.remaining) }}</div>
          </div>
        </div>
      </div>
    </template>

    <div class="modal-actions">
      <button type="button" class="btn btn-accent" :disabled="overAllocated" @click="handleSave">
        <AppIcon name="check" /> ذخیره تخصیص
      </button>
      <button type="button" class="btn btn-outline" @click="$emit('close')">انصراف</button>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../ui/components/Modal.vue'
import AppIcon from '../ui/components/AppIcon.vue'
import { JalaliDate } from '../core/jalali.js'
import { formatMoney, moneyWords, displayMoney, getCategoryColor } from '../config/units.js'

const props = defineProps({ check: { type: Object, required: true }, data: { type: Object, required: true } })
const emit = defineEmits(['save', 'close'])

const unit = computed(() => props.data.settings?.unit || 'toman')

const otherAllocs = computed(() => props.data.allocations.filter(a => a.checkId !== props.check.id))
const currentAllocs = computed(() => props.data.allocations.filter(a => a.checkId === props.check.id))
const expenseRows = computed(() => props.data.expenses
  .map(e => {
    const paidByOthers = otherAllocs.value.filter(a => a.expenseId === e.id).reduce((s, a) => s + a.amount, 0)
    const remaining = Math.max(0, e.amount - paidByOthers)
    return { ...e, paidByOthers, remaining }
  })
  .filter(e => e.remaining > 0)
  .sort((a, b) => a.dueDay - b.dueDay))

function buildInitialMap() {
  const init = {}
  expenseRows.value.forEach(e => {
    const existing = currentAllocs.value.find(a => a.expenseId === e.id)
    init[e.id] = existing ? Math.min(existing.amount, e.remaining) : 0
  })
  return init
}
function buildAutoMap() {
  const init = {}
  let rem = props.check.amount
  expenseRows.value.forEach(e => {
    if (rem <= 0) { init[e.id] = 0; return }
    const pay = Math.min(rem, e.remaining)
    init[e.id] = pay
    rem -= pay
  })
  return init
}

const hasExisting = computed(() => currentAllocs.value.length > 0)
const allocMap = ref(buildInitialMap())
const mode = ref(hasExisting.value ? 'editing' : 'new')
const totalAlloc = computed(() => expenseRows.value.reduce((s, e) => s + (allocMap.value[e.id] || 0), 0))
const remainingOnCheck = computed(() => props.check.amount - totalAlloc.value)
const overAllocated = computed(() => remainingOnCheck.value < 0)

function handleAuto() { allocMap.value = buildAutoMap(); mode.value = 'auto' }
function handleClear() {
  const empty = {}
  expenseRows.value.forEach(e => { empty[e.id] = 0 })
  allocMap.value = empty
  mode.value = 'manual'
}
function setAmount(expenseId, val) {
  const row = expenseRows.value.find(e => e.id === expenseId)
  let n = parseInt(val) || 0
  if (n < 0) n = 0
  if (n > row.remaining) n = row.remaining
  allocMap.value = { ...allocMap.value, [expenseId]: n }
  mode.value = 'manual'
}
function invalid(e) { return (allocMap.value[e.id] || 0) > e.remaining }
function handleSave() {
  if (overAllocated.value) { alert('جمع تخصیص از مبلغ چک بیشتر است'); return }
  const arr = expenseRows.value
    .filter(e => (allocMap.value[e.id] || 0) > 0)
    .map(e => ({ expenseId: e.id, amount: allocMap.value[e.id] }))
  emit('save', arr)
}
</script>
