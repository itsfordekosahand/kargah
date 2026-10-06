<template>
  <div class="cd-rule-block" style="gap: 8px">
    <div class="cd-rule-block__head">
      <span class="cd-rule-block__title">
        <i class="pi pi-code" style="margin-inline-end: 6px"></i>{{ label }}
      </span>
      <span class="cd-hint">از متغیرها، عملگرها (+ − * / ^) و توابع استفاده کنید</span>
    </div>

    <input
      ref="inputEl"
      class="p-inputtext"
      type="text"
      dir="ltr"
      style="text-align: left"
      :value="modelValue"
      :placeholder="placeholder"
      @input="onInput($event.target.value)"
      @keydown.tab.prevent="insert('  ')"
    />

    <div class="cd-preview" v-if="modelValue">
      <span class="cd-hint">نتیجه با پارامترهای پیش‌فرض:</span>
      <span v-if="preview.ok" class="cd-preview__value">{{ formatNumber(preview.value) }}</span>
      <span v-else class="cd-preview__error"><i class="pi pi-exclamation-triangle"></i> {{ preview.error }}</span>
      <span v-if="usedVars.length" class="cd-hint">متغیرها: {{ usedVars.join('، ') }}</span>
    </div>

    <details>
      <summary class="cd-hint" style="cursor: pointer">راهنمای متغیرها و توابع</summary>
      <VariablePicker :constants="constants" @pick="insertKey" />
      <ul class="cd-hint" style="margin: 6px 0 0; padding-inline-start: 18px">
        <li v-for="f in FORMULA_HELP" :key="f.name"><code dir="ltr">{{ f.name }}</code> — {{ f.desc }}</li>
        <li>می‌توانید برچسب فارسی متغیر را هم بنویسید (مثلاً <span>عرض کابینت</span>)</li>
        <li>ارقام فارسی هم پذیرفته می‌شود</li>
      </ul>
    </details>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import VariablePicker from './VariablePicker.vue'
import { tryEvaluate, extractVariables, FORMULA_HELP } from '../../core/formula-engine.js'
import { buildVariableMap } from '../../config/variables.js'
import { formatNumber } from '../../utils/formatters.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label: { type: String, default: 'فرمول' },
  placeholder: { type: String, default: 'مثلاً width - 2 * doorSideGap' },
  params: { type: Object, default: () => ({ width: 100, height: 71, depth: 58, doors: 2, shelves: 1 }) },
  constants: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:modelValue'])

const inputEl = ref(null)

function onInput(v) {
  emit('update:modelValue', v)
}

function caret() {
  const el = inputEl.value?.$el || inputEl.value
  return el || null
}

function insert(text) {
  const el = caret()
  if (!el) return
  const start = el.selectionStart ?? props.modelValue.length
  const end = el.selectionEnd ?? start
  const next = props.modelValue.slice(0, start) + text + props.modelValue.slice(end)
  emit('update:modelValue', next)
  requestAnimationFrame(() => {
    el.focus()
    const pos = start + text.length
    try { el.setSelectionRange(pos, pos) } catch { /* ناوبری */ }
  })
}

function insertKey(key) {
  const el = caret()
  const needsSpace = el && el.selectionStart > 0 && !/\s$/.test(props.modelValue.slice(0, el.selectionStart))
  insert((needsSpace ? ' ' : '') + key + ' ')
}

const vars = computed(() => buildVariableMap(props.params, props.constants))
const preview = computed(() => (props.modelValue ? tryEvaluate(props.modelValue, vars.value) : { ok: false, value: null, error: '' }))
const usedVars = computed(() => extractVariables(props.modelValue))
</script>
