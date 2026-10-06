<template>
  <div class="cd-page">
    <div class="cd-page__header">
      <div>
        <h1 class="cd-page__title">قواعد استخراج‌شده</h1>
        <p class="cd-page__desc">برای هر بُعد هر قطعه، قاعده پیشنهادی را بررسی و در صورت نیاز اصلاح کنید و بعد روی قالب اعمال کنید.</p>
      </div>
      <div class="cd-toolbar" style="margin: 0">
        <Button label="استخراج از نمونه‌ها" icon="pi pi-database" size="small" severity="secondary" outlined :disabled="store.sampleList.length < 2" @click="run('samples')" />
        <Button label="استخراج از ذخیره‌شده‌ها" icon="pi pi-save" size="small" severity="secondary" outlined :disabled="!instances.length" @click="run('instances')" />
        <Button v-if="extraction" label="تأیید و اعمال روی قالب" icon="pi pi-check" size="small" :loading="applying" @click="confirm" />
        <Button v-if="extraction" label="انصراف" icon="pi pi-times" size="small" severity="secondary" text @click="store.clearExtraction()" />
      </div>
    </div>

    <ul v-if="extraction?.errors?.length" class="cd-error-list">
      <li v-for="(e, i) in extraction.errors" :key="i">{{ e }}</li>
    </ul>

    <section class="cd-section">
      <h2 class="cd-section__title">
        <i class="pi pi-sitemap"></i> جدول قواعد
        <span v-if="extraction" class="cd-hint">
          — {{ fa(extraction.sampleCount) }} نمونه، {{ fa(extraction.results.length) }} قطعه، منبع: {{ extraction.source === 'instances' ? 'کابینتهای ذخیره‌شده' : 'نمونه‌های دستی' }}
        </span>
      </h2>

      <div v-if="!extraction" class="cd-empty">
        <i class="pi pi-bolt cd-empty__icon"></i>
        <div class="cd-empty__title">هنوز قاعده‌ای استخراج نشده</div>
        <div class="cd-empty__desc">از نمونه‌های واردشده یا کابینتهای ذخیره‌شده قاعده استخراج کنید. حداقل دو نمونه با عرض متفاوت لازم است.</div>
        <Button label="رفتن به ورود نمونه‌ها" icon="pi pi-arrow-left" size="small" severity="secondary" outlined @click="goto('samples')" />
      </div>

      <div v-else class="cd-table-wrap">
        <table class="cd-table cd-table--wide">
          <thead>
            <tr>
              <th>قطعه</th>
              <th>بُعد</th>
              <th>نوع قاعده</th>
              <th>مقدار یا فرمول</th>
              <th>دلیل</th>
              <th>اطمینان</th>
              <th class="no-print">عملیات</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="r in extraction.results" :key="r.partId">
              <template v-for="dim in dims" :key="r.partId + '-' + dim">
                <tr>
                  <td class="cd-td--name">{{ r.partName }}</td>
                  <td>{{ dimLabel(dim) }}</td>
                  <td><RuleBadge :rule-type="r.dims[dim].rule?.type" /></td>
                  <td><code dir="ltr">{{ describeRule(r.dims[dim].rule) }}</code></td>
                  <td style="white-space: normal; text-align: right">{{ r.dims[dim].note }}</td>
                  <td>{{ confidenceLabel(r.dims[dim].confidence) }}</td>
                  <td class="no-print">
                    <Button
                      :label="editing === r.partId + dim ? 'بستن' : 'ویرایش'"
                      icon="pi pi-pencil"
                      size="small"
                      severity="secondary"
                      text
                      @click="toggleEdit(r, dim)"
                    />
                  </td>
                </tr>
                <tr v-if="editing === r.partId + dim">
                  <td colspan="7" style="white-space: normal; padding: 14px">
                    <RuleEditor
                      :rule="r.dims[dim].rule"
                      :title="`${r.partName} — قاعده ${dimLabel(dim)}`"
                      :params="previewParams"
                      :constants="store.constants"
                      @update:rule="(rule) => store.updateExtractionRule(r.partId, dim, rule)"
                    />
                  </td>
                </tr>
              </template>
            </template>
          </tbody>
        </table>
      </div>
    </section>

    <section class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-verified"></i> تست فرمولها</h2>
      <div class="cd-toolbar">
        <Button label="اجرای تست‌ها" icon="pi pi-play" size="small" severity="secondary" outlined @click="runTests" />
        <span v-if="tests" class="cd-hint">{{ fa(tests.passed) }} از {{ fa(tests.total) }} پاس شد.</span>
      </div>
      <div v-if="tests" class="cd-tests">
        <div
          v-for="(t, i) in tests.results"
          :key="i"
          class="cd-test-row"
          :class="t.pass ? 'cd-test-row--pass' : 'cd-test-row--fail'"
        >
          <span>{{ t.name }}</span>
          <code dir="ltr" style="font-size: .78rem; color: var(--cd-muted)">{{ t.formula }}</code>
          <span style="color: var(--cd-muted)">→ {{ t.pass ? formatNumber(t.expected) : `نتیجه: ${t.actual}` }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import RuleBadge from '../ui/components/RuleBadge.vue'
import RuleEditor from './RuleEditor.vue'
import { useCabinetStore } from '../store/cabinet-store.js'
import { describeRule } from '../core/calculator.js'
import { DIM_LABELS } from '../core/rule-extractor.js'
import { runSelfTests } from '../core/self-test.js'
import { toPersianDigits, formatNumber } from '../utils/formatters.js'

const store = useCabinetStore()
const toast = useToast()

const editing = ref(null)
const dims = ['length', 'width']
const applying = ref(false)
const tests = ref(null)

const extraction = computed(() => store.extraction)
const instances = computed(() => store.instanceList.filter((i) => i.templateId === store.activeTemplateId))
const previewParams = computed(() => {
  const tpl = store.activeTemplate
  return { width: 100, ...(tpl?.defaults || {}) }
})

const fa = (v) => toPersianDigits(v)
const dimLabel = (dim) => DIM_LABELS[dim] || dim

const CONFIDENCE = {
  exact: 'قطعی',
  good: 'خوب',
  approx: 'نیازمند بررسی',
  low: 'احتیاط — ویرایش کنید',
  none: 'ندارد'
}
const confidenceLabel = (c) => CONFIDENCE[c] || '—'

function toggleEdit(r, dim) {
  const key = r.partId + dim
  editing.value = editing.value === key ? null : key
}

function run(source) {
  editing.value = null
  const out = source === 'instances'
    ? store.extractRulesFromInstances(store.activeTemplateId)
    : store.extractRulesFromSamples(store.activeTemplateId)
  if (out.errors?.length) {
    toast.add({ severity: 'error', summary: 'استخراج انجام نشد', detail: out.errors[0], life: 4500 })
    return
  }
  toast.add({
    severity: 'success',
    summary: 'استخراج انجام شد',
    detail: `${fa(out.results.length)} قطعه از روی ${fa(out.sampleCount)} نمونه بررسی شد.`,
    life: 3500
  })
}

function confirm() {
  applying.value = true
  const res = store.confirmExtraction()
  applying.value = false
  if (res.ok) {
    toast.add({
      severity: 'success',
      summary: 'قواعد اعمال شد',
      detail: 'قالب به‌روزرسانی و اعتبارسنجی شد؛ نتیجه را در صفحه محاسبه ببینید.',
      life: 4000
    })
    goto('calculator')
  } else {
    toast.add({ severity: 'error', summary: 'اعمال انجام نشد', detail: res.errors?.[0]?.message || res.errors?.[0] || 'خطای ناشناخته', life: 5000 })
  }
}

function runTests() {
  tests.value = runSelfTests()
}

function goto(view) {
  window.dispatchEvent(new CustomEvent('cd-goto', { detail: view }))
}
</script>
