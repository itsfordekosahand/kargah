<template>
  <Modal :title="'انتقال چک — ' + check.payerName" @close="$emit('close')">
    <div class="alloc-check-head">
      <h4>{{ check.payerName }}</h4>
      <p>
        مبلغ: <strong style="color:var(--accent)">{{ displayMoney(check.amount, unit) }}</strong>
        • سررسید: {{ JalaliDate.formatGregorian(check.dueDate) }}
      </p>
      <div v-if="check.notes" style="font-size:11px;color:var(--text-muted);margin-top:4px">📝 {{ check.notes }}</div>
    </div>
    <div class="form-grid">
      <div class="form-group full">
        <label class="form-label">به چه کسی منتقل شد؟ *</label>
        <input class="form-input" v-model="recipient" placeholder="نام شخص یا شرکت" />
      </div>
      <div class="form-group full">
        <label class="form-label">تاریخ انتقال</label>
        <JalaliDatePicker :value="date" @change="date = $event" />
      </div>
      <div class="form-group full">
        <label class="form-label">بابت چه؟ / توضیحات</label>
        <textarea class="form-textarea" v-model="note" placeholder="مثال: بابت خرید جنس، تسویه بدهی، ..."></textarea>
      </div>
    </div>
    <div style="margin-top:14px;padding:12px;background:var(--info-bg);border:1px solid rgba(96,165,250,0.3);border-radius:8px;font-size:11.5px;color:var(--info);line-height:1.7">
      ℹ️ با انتقال چک، از صندوق شما خارج می‌شود و قابل تخصیص نخواهد بود.
    </div>
    <div class="modal-actions">
      <button class="btn btn-accent" @click="handleSave"><AppIcon name="check" /> تایید انتقال</button>
      <button class="btn btn-outline" @click="$emit('close')">انصراف</button>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../ui/components/Modal.vue'
import AppIcon from '../ui/components/AppIcon.vue'
import JalaliDatePicker from '../ui/components/JalaliDatePicker.vue'
import { JalaliDate } from '../core/jalali.js'
import { displayMoney, todayISO } from '../config/units.js'

const props = defineProps({ check: { type: Object, required: true }, data: { type: Object, required: true } })
const emit = defineEmits(['save', 'close'])

const unit = computed(() => props.data.settings?.unit || 'toman')
const recipient = ref('')
const note = ref('')
const date = ref(todayISO())

function handleSave() {
  if (!recipient.value.trim()) { alert('نام دریافت‌کننده را وارد کنید'); return }
  emit('save', {
    transferredTo: recipient.value.trim(),
    transferNote: note.value.trim(),
    transferDate: date.value
  })
}
</script>
