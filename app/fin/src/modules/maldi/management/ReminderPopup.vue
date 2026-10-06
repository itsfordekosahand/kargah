<template>
  <Modal v-if="items.length > 0" :title="'یادآوری امروز — ' + jToday.jy + '/' + jToday.jm + '/' + jToday.jd" wide @close="$emit('close')">
    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">
      {{ unpaidCount > 0 ? unpaidCount + ' مورد پرداخت نشده:' : 'همه پرداخت شده' }}
    </p>
    <div
      v-for="(it, idx) in items"
      :key="idx"
      class="reminder-item"
      :class="[it.type + '-due', { 'paid-item': it.isPaid }]"
    >
      <div class="reminder-info">
        <div class="reminder-name">{{ it.name }}</div>
        <div class="reminder-detail">{{ it.detail }}</div>
      </div>
      <div class="reminder-actions">
        <span v-if="it.isPaid" class="badge paid"><AppIcon name="check" /> پرداخت شده</span>
        <button v-else class="btn btn-success btn-sm" @click="markPaid(it)">تایید پرداخت</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" @click="$emit('close')">بستن</button>
    </div>
  </Modal>
</template>

<script setup>
import { computed } from 'vue'
import Modal from '../ui/components/Modal.vue'
import AppIcon from '../ui/components/AppIcon.vue'
import { JalaliDate, effectiveDueDay } from '../core/jalali.js'
import { displayMoney, todayISO } from '../config/units.js'
import { useMaldiStore } from '../store/maldi-store.js'

const props = defineProps({ data: { type: Object, required: true } })
const emit = defineEmits(['close'])

const store = useMaldiStore()
const unit = computed(() => props.data.settings?.unit || 'toman')
const todayStr = todayISO()
const jToday = JalaliDate.today()

const items = computed(() => {
  const list = []
  props.data.checks.filter(c => c.status === 'pending' && c.dueDate === todayStr).forEach(ch => {
    list.push({ type: 'check', id: ch.id, name: ch.payerName, detail: 'مبلغ: ' + displayMoney(ch.amount, unit.value), isPaid: props.data.paidRecord.checks[ch.id] })
  })
  props.data.expenses
    .filter(e => e.isRecurring && effectiveDueDay(e.dueDay, jToday.jy, jToday.jm) === jToday.jd)
    .forEach(ex => {
      const k = ex.id + '_' + jToday.jy + '_' + jToday.jm
      list.push({ type: 'expense', id: ex.id, key: k, name: ex.name, detail: 'مبلغ: ' + displayMoney(ex.amount, unit.value), isPaid: props.data.paidRecord.expenses[k] })
    })
  return list
})

function markPaid(it) {
  if (it.type === 'check') {
    store.setData(d => ({ ...d, paidRecord: { ...d.paidRecord, checks: { ...d.paidRecord.checks, [it.id]: true } } }))
  } else if (it.type === 'expense') {
    store.setData(d => ({ ...d, paidRecord: { ...d.paidRecord, expenses: { ...d.paidRecord.expenses, [it.key]: true } } }))
  }
  store.toast('تایید شد')
}

const unpaidCount = computed(() => items.value.filter(i => !i.isPaid).length)

// مثل return null در مبدأ: اگر آیتمی نباشد چیزی رندر نمی‌شود (وضعیت showReminder دست‌نخورده می‌ماند)
</script>
