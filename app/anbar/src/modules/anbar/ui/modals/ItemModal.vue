<script setup>
import { ref, computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import AmountField from '../components/AmountField.vue'
import { numToWords, thousands } from '../../core/amount-format.js'

const store = useAnbarStore()
const m = store.modal
const item = computed(() => m.item || {})
const tpl = computed(() => store.templateOf(item.value.tplId))
const existing = computed(() => {
  const t = tpl.value
  return t && item.value.itemId ? (t.items || []).find(x => x.id === item.value.itemId) : null
})

const type = ref(existing.value ? (existing.value.type || '') : '')
const qty = ref(existing.value ? existing.value.qty : 1)
const label = ref(existing.value ? existing.value.label : '')
const unit = ref(existing.value ? (existing.value.unit || '') : '')
const unitPrice = ref(existing.value ? existing.value.unitPrice : 0)

function submit() {
  const ok = store.saveItem(item.value.tplId, item.value.itemId, {
    type: type.value, label: label.value, qty: qty.value, unit: unit.value, unitPrice: unitPrice.value
  })
  if (ok) store.closeModal()
}

/* معادل حروفِ قیمت واحد و جمعِ همان قلم — زیر فیلد قیمت نمایش داده می‌شود */
const unitPriceWords = computed(() => numToWords(unitPrice.value, 'تومان'))
const lineTotal = computed(() => Number(qty.value || 0) * Number(unitPrice.value || 0))
const lineTotalWords = computed(() => numToWords(lineTotal.value, 'تومان'))
</script>

<template>
  <form id="itemForm" class="modal-body grid" @submit.prevent="submit">
    <div>
      <label>نوع قلم</label>
      <input id="itType" v-model="type" placeholder="مثلا ورق / یراق / خدمت">
    </div>
    <div>
      <label>تعداد *</label>
      <input id="itQty" v-model="qty" type="number" min="0" step="0.01">
    </div>
    <div style="grid-column:1/-1">
      <label>شرح قلم *</label>
      <input id="itLabel" v-model="label" required placeholder="مثلا ورق MDF روکش‌دار ۱۸۳×۲۴۴">
    </div>
    <div>
      <label>واحد</label>
      <input id="itUnit" v-model="unit" placeholder="عدد / تخته / متر">
    </div>
    <div>
      <AmountField id="itPrice" v-model="unitPrice" label="قیمت واحد (تومان) *" required />
    </div>
  </form>

  <div v-if="unitPrice" class="amount-line-total">
    جمع این قلم:
    <b>{{ thousands(lineTotal) }} تومان</b>
    <span v-if="lineTotalWords" class="amount-words">{{ lineTotalWords }}</span>
  </div>

  <div class="modal-foot">
    <button class="btn pri" type="submit" form="itemForm"><span v-html="ico('check', 15)"></span> ذخیره</button>
    <button class="btn" @click="store.closeModal()">انصراف</button>
  </div>
</template>
