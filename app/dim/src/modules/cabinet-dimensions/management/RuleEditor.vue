<template>
  <div class="cd-rule-block">
    <div class="cd-rule-block__head">
      <span class="cd-rule-block__title">
        <i class="pi pi-wrench" style="margin-inline-end: 6px"></i>{{ title }}
      </span>
      <RuleBadge :rule-type="local.type" />
    </div>

    <div class="cd-field">
      <label class="cd-field__label">نوع قاعده</label>
      <Select v-model="local.type" :options="typeOptions" option-label="label" option-value="key" @change="onTypeChange" />
      <span class="cd-field__hint">{{ currentType?.hint }}</span>
    </div>

    <!-- ۱) ثابت -->
    <div v-if="local.type === 'constant'" class="cd-field">
      <label class="cd-field__label">مقدار (سانتی‌متر)</label>
      <InputNumber v-model="local.value" :step="0.1" :use-grouping="false" show-buttons @update:model-value="emitRule" />
    </div>

    <!-- ۲) مساوی -->
    <div v-else-if="local.type === 'equal'" class="cd-field">
      <label class="cd-field__label">مساوی چه چیزی؟</label>
      <Select v-model="local.source" :options="sourceOptions" option-label="label" option-value="key" @update:model-value="emitRule" />
    </div>

    <!-- ۳) کمشونده/افزایشی -->
    <div v-else-if="local.type === 'offset'" class="cd-form-grid">
      <div class="cd-field">
        <label class="cd-field__label">نسبت به</label>
        <Select v-model="local.source" :options="sourceOptions" option-label="label" option-value="key" @update:model-value="emitRule" />
      </div>
      <div class="cd-field">
        <label class="cd-field__label">مقدار اختلاف (منهای/به‌علاوه)</label>
        <InputNumber v-model="local.offset" :step="0.1" :use-grouping="false" show-buttons @update:model-value="emitRule" />
        <span class="cd-field__hint">عدد منفی = کمشونده (مثلاً ۳٫۲− برای قید)</span>
      </div>
    </div>

    <!-- ۴) تقسیمی -->
    <div v-else-if="local.type === 'divide'" class="cd-form-grid">
      <div class="cd-field">
        <label class="cd-field__label">صورت (مثلاً width - 2 * doorSideGap)</label>
        <input v-model="local.numerator" class="p-inputtext" dir="ltr" style="text-align: left" @input="emitRule" />
      </div>
      <div class="cd-field">
        <label class="cd-field__label">مخرج (متغیر یا عدد، مثلاً doors)</label>
        <input v-model="local.denominator" class="p-inputtext" dir="ltr" style="text-align: left" @input="emitRule" />
      </div>
    </div>

    <!-- ۵) فرمول آزاد -->
    <FormulaInput
      v-else-if="local.type === 'formula'"
      v-model="local.expression"
      label="فرمول آزاد"
      :params="previewParams"
      :constants="constants"
      @update:model-value="emitRule"
    />

    <div class="cd-field">
      <label class="cd-field__label">پیشنهاد سریع (درج در فرمول)</label>
      <div class="cd-number-buttons">
        <Button v-for="s in quickInserts" :key="s.label" :label="s.label" size="small" severity="secondary" outlined @click="applyQuick(s)" />
      </div>
    </div>

    <RulePreview :rule="local" :params="previewParams" :constants="constants" />
  </div>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Button from 'primevue/button'
import RuleBadge from '../ui/components/RuleBadge.vue'
import RulePreview from './components/RulePreview.vue'
import FormulaInput from './components/FormulaInput.vue'
import { RULE_TYPES } from '../core/calculator.js'
import { variableOptions } from '../config/variables.js'

const props = defineProps({
  rule: { type: Object, default: () => ({ type: 'constant', value: 0 }) },
  title: { type: String, default: 'قاعده' },
  params: { type: Object, default: () => ({ width: 100, height: 71, depth: 58, doors: 2, shelves: 1 }) },
  constants: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:rule'])

const local = reactive(normalize(props.rule))

function normalize(rule) {
  const base = { type: rule?.type || 'constant', value: 0, source: 'width', offset: 0, numerator: 'width', denominator: '2', expression: 'width - 3.2' }
  return { ...base, ...(rule || {}) }
}

watch(() => props.rule, (r) => {
  Object.assign(local, normalize(r))
}, { deep: true })

const typeOptions = RULE_TYPES
const currentType = computed(() => RULE_TYPES.find((t) => t.key === local.type))

const sourceOptions = computed(() =>
  variableOptions(props.constants).map((v) => ({
    key: v.key,
    label: `${v.label}${v.value !== undefined && v.value !== null ? ` (${v.value})` : ''}`
  }))
)

const previewParams = computed(() => ({ width: 100, ...props.params }))

const quickInserts = [
  { label: 'عرض کابینت', apply: { type: 'equal', source: 'width' } },
  { label: 'عرض − ۳٫۲', apply: { type: 'offset', source: 'width', offset: -3.2 } },
  { label: 'ارتفاع', apply: { type: 'equal', source: 'height' } },
  { label: 'عمق', apply: { type: 'equal', source: 'depth' } }
]

function applyQuick(s) {
  Object.assign(local, s.apply)
  emitRule()
}

function onTypeChange() {
  emitRule()
}

function emitRule() {
  const payload = JSON.parse(JSON.stringify(local))
  delete payload.edited
  emit('update:rule', payload)
}
</script>
