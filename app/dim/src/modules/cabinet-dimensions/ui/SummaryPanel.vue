<template>
  <div class="cd-summary">
    <div class="cd-stat">
      <span class="cd-stat__label">تعداد کل قطعات</span>
      <span class="cd-stat__value">{{ toPersianDigits(summary.totalPieces ?? 0) }}</span>
    </div>
    <div class="cd-stat">
      <span class="cd-stat__label">متراژ کل PVC (متر نوار)</span>
      <span class="cd-stat__value">{{ formatNumberGrouped(summary.pvcMeters ?? 0, 2) }}</span>
    </div>
    <div class="cd-stat">
      <span class="cd-stat__label">متراژ کل شیار (متر)</span>
      <span class="cd-stat__value">{{ formatNumberGrouped(summary.grooveMeters ?? 0, 2) }}</span>
    </div>
    <div class="cd-stat">
      <span class="cd-stat__label">مساحت کل MDF مصرفی (مترمربع)</span>
      <span class="cd-stat__value">{{ formatNumberGrouped(summary.mdfArea ?? 0, 3) }}</span>
    </div>
  </div>
</template>

<script setup>
import { toPersianDigits, formatNumberGrouped } from '../utils/formatters.js'

defineProps({
  summary: { type: Object, required: true }
})
</script>
