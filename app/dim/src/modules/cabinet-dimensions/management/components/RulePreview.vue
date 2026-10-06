<template>
  <div class="cd-preview">
    <RuleBadge :rule-type="rule?.type" />
    <span class="cd-hint">{{ ruleTypeLabel(rule?.type) }}:</span>
    <code>{{ describeRule(rule) }}</code>
    <span style="flex: 1"></span>
    <span v-if="error" class="cd-preview__error">
      <i class="pi pi-exclamation-circle"></i> {{ error }}
    </span>
    <span v-else class="cd-preview__value">{{ formatNumber(value) }} سانت</span>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import RuleBadge from '../../ui/components/RuleBadge.vue'
import { resolveRule, createContext, ruleTypeLabel, describeRule } from '../../core/calculator.js'
import { formatNumber } from '../../utils/formatters.js'

const props = defineProps({
  rule: { type: Object, default: null },
  params: { type: Object, default: () => ({}) },
  constants: { type: Object, default: () => ({}) }
})

const ctx = computed(() => createContext(props.params, props.constants))
const result = computed(() => (props.rule ? resolveRule(props.rule, ctx.value) : { ok: false, value: null, error: 'قاعده‌ای انتخاب نشده' }))
const value = computed(() => result.value.value)
const error = computed(() => result.error)
</script>
