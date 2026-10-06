<template>
  <div class="cd-section cd-print-area">
    <div class="cd-page__header no-print">
      <h2 class="cd-section__title" style="margin: 0">
        <i class="pi pi-list"></i> لیست قطعات
        <span class="cd-hint">({{ toPersianDigits(parts.length) }} ردیف)</span>
      </h2>
      <div class="cd-toolbar" style="margin: 0">
        <slot name="actions" />
      </div>
    </div>

    <div v-if="parts.length" class="cd-table-wrap">
      <table class="cd-table">
        <thead>
          <tr>
            <th>نام قطعه</th>
            <th>طول</th>
            <th>عرض</th>
            <th>تعداد</th>
            <th>ضخامت</th>
            <th>جنس</th>
            <th>PVC</th>
            <th>شیار</th>
          </tr>
        </thead>
        <tbody>
          <PartRow v-for="p in parts" :key="p.id" :part="p" />
        </tbody>
      </table>
    </div>

    <EmptyState
      v-else
      icon="pi-table"
      title="هنوز قطعه‌ای محاسبه نشده"
      description="یک نوع کابینت انتخاب کنید و عرض را وارد کنید تا لیست قطعات ساخته شود."
    />

    <ul v-if="errorCount" class="cd-error-list no-print" style="margin-top: 10px">
      <li v-for="(e, i) in errors" :key="i">{{ e }}</li>
    </ul>

    <slot name="footer" />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import PartRow from './components/PartRow.vue'
import EmptyState from './components/EmptyState.vue'
import { toPersianDigits } from '../utils/formatters.js'

const props = defineProps({
  parts: { type: Array, default: () => [] }
})

const errorList = computed(() => props.parts.flatMap((p) => (p.errors || []).map((e) => `${p.name}: ${e}`)))
const errorCount = computed(() => errorList.value.length)
</script>
