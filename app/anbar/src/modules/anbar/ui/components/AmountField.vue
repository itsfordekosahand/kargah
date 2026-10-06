<script setup>
/**
 * فیلد مبلغ — نمایش «به حروف» زیر ورودی و گروه‌بندی هزارگان در خودِ ورودی.
 * از core/amount-format.js استفاده می‌کند (numToWords + thousands).
 *
 * استفاده:
 *   <AmountField id="itPrice" v-model="unitPrice" label="قیمت واحد (تومان)" />
 */
import { nextTick, ref, computed } from 'vue'
import { numToWords, liveThousands, liveCaret, sanitizeNumber, toLatin } from '../../core/amount-format.js'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  id: { type: String, default: undefined },
  unit: { type: String, default: 'تومان' },
  placeholder: { type: String, default: '' },
  min: { type: [String, Number], default: 0 },
  step: { type: [String, Number], default: 1 },
  required: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue'])

const el = ref(null)

/** مقدار خام است تا ورودی زنده و بدون پرش مکان‌نما بماند */
const display = computed(() => liveThousands(props.modelValue))

/** معادل حروف — همان چیزی که زیر فیلد نمایش داده می‌شود */
const words = computed(() => numToWords(sanitizeNumber(props.modelValue), props.unit))

function onInput(e) {
  const input = e.target
  // کاربر ممکن است ارقام فارسی را تایپ یا paste کند؛ به لاتین تبدیل می‌شوند تا
    // مقدار مدل همیشه عددِ تمیز لاتین بماند (به‌کمک toLatin در amount-format.js).
  const raw = toLatin(input.value)
  emit('update:modelValue', sanitizeNumber(raw))
  // مکان‌نما را دستی نگه می‌داریم چون رشتهٔ نمایشی چند کاراکتر بلندتر است
  const want = liveCaret(raw, input.selectionStart ?? raw.length, display.value)
  nextTick(() => {
    if (!el.value) return
    try { el.value.setSelectionRange(want, want) } catch (_) {}
  })
}
</script>

<template>
  <div class="amount-field">
    <label v-if="label">{{ label }}</label>
    <input :id="id" ref="el" type="text" inputmode="numeric" autocomplete="off"
           :value="display" :placeholder="placeholder || '۰'"
           :min="min" :step="step" :required="required"
           class="amount-input" @input="onInput">
    <div class="amount-hint" :data-words-for="id">
      <span v-if="words" class="amount-words">{{ words }}</span>
      <span v-else class="amount-words amount-words--idle">مبلغ را وارد کنید</span>
    </div>
  </div>
</template>