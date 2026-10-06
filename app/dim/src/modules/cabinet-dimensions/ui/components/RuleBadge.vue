<template>
  <span class="cd-badge" :class="`cd-badge--${ruleType}`">
    <i class="pi" :class="meta.icon"></i>
    <span>{{ label || meta.label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { RULE_TYPES } from '../../core/calculator.js'

const props = defineProps({
  ruleType: { type: String, default: 'none' },
  label: { type: String, default: '' }
})

const meta = computed(() => RULE_TYPES.find((t) => t.key === props.ruleType) || {
  key: 'none', label: 'نامشخص', icon: 'pi-question-circle'
})
</script>
