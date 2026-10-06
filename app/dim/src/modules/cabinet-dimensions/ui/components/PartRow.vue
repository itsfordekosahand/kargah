<template>
  <tr :class="{ 'cd-row--error': hasError, 'cd-row--overridden': isOverridden }">
    <td class="cd-td--name">
      <span>{{ part.name }}</span>
      <i v-if="isOverridden" class="pi pi-pencil" style="font-size: .7rem; color: var(--cd-warn); margin-inline-start: 6px"></i>
    </td>
    <td class="cd-num" :title="errorText">{{ num(part.length) }}</td>
    <td class="cd-num" :title="errorText">{{ num(part.width) }}</td>
    <td class="cd-num">{{ toPersianDigits(part.quantity) }}</td>
    <td class="cd-num">{{ num(part.thickness) }}</td>
    <td>{{ part.materialLabel }}</td>
    <td>{{ yesNo(part.pvc) }}</td>
    <td>{{ yesNo(part.groove) }}</td>
  </tr>
</template>

<script setup>
import { computed } from 'vue'
import { toPersianDigits, formatNumber } from '../../utils/formatters.js'

const props = defineProps({
  part: { type: Object, required: true }
})

const num = (v) => (v === null || v === undefined ? '—' : formatNumber(v))
const yesNo = (v) => (v ? 'بله' : 'خیر')

const hasError = computed(() => (props.part.errors || []).length > 0)
const isOverridden = computed(() => {
  const o = props.part.overridden || {}
  return o.length || o.width || o.quantity
})
const errorText = computed(() => (props.part.errors || []).join('\n'))
</script>
