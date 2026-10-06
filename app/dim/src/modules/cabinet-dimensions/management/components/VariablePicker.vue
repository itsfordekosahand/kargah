<template>
  <div class="cd-rule-block" style="padding: 8px; gap: 6px">
    <div class="cd-rule-block__head">
      <span class="cd-rule-block__title">
        <i class="pi pi-variable" style="margin-inline-end: 6px"></i>متغیرهای قابل استفاده
      </span>
      <span class="cd-hint">برای درج در فرمول کلیک کنید</span>
    </div>
    <div class="cd-var-list">
      <button
        v-for="v in normalized"
        :key="v.key"
        type="button"
        class="cd-var-chip"
        :title="v.description"
        @click="$emit('pick', v.insert)"
      >
        <span>{{ v.label }}</span>
        <span class="cd-var-chip__group">{{ v.value !== undefined && v.value !== null ? formatNumber(v.value) : (v.group === 'param' ? 'پارامتر' : 'ثابت') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { variableOptions } from '../../config/variables.js'
import { formatNumber } from '../../utils/formatters.js'

const props = defineProps({
  constants: { type: Object, default: () => ({}) },
  /** برچسب فارسی درج شود یا کلید لاتین */
  persianKeys: { type: Boolean, default: false }
})
defineEmits(['pick'])

const normalized = computed(() =>
  variableOptions(props.constants).map((v) => ({
    ...v,
    insert: props.persianKeys ? v.label : v.key
  }))
)
</script>
