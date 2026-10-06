<template>
  <Modal title="بازیابی از فایل پشتیبان" wide @close="$emit('cancel')">
    <div class="import-info">
      <div style="font-weight:600;margin-bottom:8px;font-size:13px;color:#fff">محتوای فایل:</div>
      <div class="import-info-row"><span>چک‌ها</span><strong>{{ formatMoney(stats.checks) }} مورد</strong></div>
      <div class="import-info-row"><span>هزینه‌ها</span><strong>{{ formatMoney(stats.expenses) }} مورد</strong></div>
      <div class="import-info-row"><span>بدهی‌ها</span><strong>{{ formatMoney(stats.debts) }} مورد</strong></div>
      <div class="import-info-row"><span>تخصیص‌ها</span><strong>{{ formatMoney(stats.allocations) }} مورد</strong></div>
      <div class="import-info-row"><span>تراکنش‌ها</span><strong>{{ formatMoney(stats.transactions) }} مورد</strong></div>
      <div class="import-info-row" style="border-top:1px solid var(--border);margin-top:6px;padding-top:8px">
        <span>تاریخ ذخیره</span><strong>{{ importedDate }}</strong>
      </div>
    </div>
    <div style="font-weight:600;margin-bottom:8px;font-size:13px;color:#fff">روش بازیابی:</div>
    <div class="import-option" :class="{ selected: mode === 'merge' }" @click="mode = 'merge'">
      <div class="import-option-radio"></div>
      <div style="flex:1">
        <div class="import-option-title">ادغام (پیشنهادی)</div>
        <div class="import-option-desc">داده‌های جدید اضافه می‌شوند.</div>
      </div>
    </div>
    <div class="import-option" :class="{ selected: mode === 'replace' }" @click="mode = 'replace'">
      <div class="import-option-radio"></div>
      <div style="flex:1">
        <div class="import-option-title" style="color:var(--danger)">جایگزینی کامل</div>
        <div class="import-option-desc">داده‌های فعلی پاک می‌شوند.</div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn" :class="mode === 'replace' ? 'btn-danger' : 'btn-accent'" @click="mode === 'merge' ? $emit('merge') : $emit('replace')">
        <AppIcon name="check" /> {{ mode === 'merge' ? 'ادغام' : 'جایگزین' }}
      </button>
      <button class="btn btn-outline" @click="$emit('cancel')">انصراف</button>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../ui/components/Modal.vue'
import AppIcon from '../ui/components/AppIcon.vue'
import { countImportItems } from '../core/data.js'
import { formatMoney } from '../config/units.js'

const props = defineProps({
  importedData: { type: Object, required: true },
  currentData: { type: Object, required: true }
})
defineEmits(['replace', 'merge', 'cancel'])

const mode = ref('merge')
const stats = computed(() => countImportItems(props.importedData))
const importedDate = computed(() =>
  props.importedData._savedAt ? new Date(props.importedData._savedAt).toLocaleString('fa-IR') : '—'
)
</script>
