<template>
  <div class="cd-page">
    <div class="cd-page__header">
      <div>
        <h1 class="cd-page__title">ثابتهای کارگاه</h1>
        <p class="cd-page__desc">تغییر هر ثابت، بلافاصله همه قالبها و کابینتهای ذخیره‌شده را به‌روزرسانی می‌کند.</p>
      </div>
      <div class="cd-toolbar" style="margin: 0">
        <Button label="اجرای تست‌های فرمول" icon="pi pi-verified" size="small" severity="secondary" outlined @click="runTests" />
        <Button label="بازگشت به پیش‌فرضها" icon="pi pi-replay" size="small" severity="secondary" text @click="resetAll" />
      </div>
    </div>

    <ul v-if="validation.length" class="cd-error-list">
      <li v-for="(e, i) in validation" :key="i">{{ e.message }}</li>
    </ul>

    <section class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-sliders-h"></i> فهرست ثابتها</h2>
      <div class="cd-table-wrap">
        <table class="cd-table">
          <thead>
            <tr><th>نام</th><th>مقدار</th><th>واحد</th><th>توضیح</th><th class="no-print"></th></tr>
          </thead>
          <tbody>
            <tr v-for="c in store.constantArray" :key="c.id">
              <td>
                <input v-model="c.label" class="p-inputtext" style="min-width: 150px" @change="touch(c)" />
              </td>
              <td>
                <InputNumber
                  :model-value="c.value"
                  :step="0.1" :min-fraction-digits="0" :max-fraction-digits="2"
                  show-buttons :use-grouping="false" style="width: 140px"
                  @update:model-value="(v) => change(c.id, v)"
                />
              </td>
              <td>{{ c.unit }}</td>
              <td style="text-align: right; white-space: normal">
                <input v-model="c.description" class="p-inputtext" style="min-width: 220px" @change="touch(c)" />
              </td>
              <td class="no-print">
                <Button icon="pi pi-trash" size="small" severity="danger" text @click="store.deleteConstant(c.id)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-plus-circle"></i> افزودن ثابت جدید</h2>
      <div class="cd-form-grid">
        <div class="cd-field">
          <label class="cd-field__label">کلید (لاتین، برای فرمولها)</label>
          <input v-model="draft.key" class="p-inputtext" dir="ltr" placeholder="مثلاً gapSide" />
        </div>
        <div class="cd-field">
          <label class="cd-field__label">نام فارسی</label>
          <input v-model="draft.label" class="p-inputtext" placeholder="مثلاً فاصله کناری" />
        </div>
        <div class="cd-field">
          <label class="cd-field__label">مقدار</label>
          <InputNumber v-model="draft.value" :step="0.1" show-buttons :use-grouping="false" />
        </div>
        <div class="cd-field">
          <label class="cd-field__label">واحد</label>
          <input v-model="draft.unit" class="p-inputtext" />
        </div>
        <div class="cd-field" style="grid-column: 1 / -1">
          <label class="cd-field__label">توضیح فارسی</label>
          <input v-model="draft.description" class="p-inputtext" />
        </div>
      </div>
      <div class="cd-toolbar cd-toolbar--end">
        <Button label="افزودن" icon="pi pi-plus" size="small" :disabled="!draft.key || !draft.label" @click="addConstant" />
      </div>
    </section>

    <section v-if="tests" class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-verified"></i> نتیجه تست‌ها</h2>
      <p class="cd-hint">{{ fa(tests.passed) }} از {{ fa(tests.total) }} تست پاس شد.</p>
      <div class="cd-tests">
        <div
          v-for="(r, i) in tests.results"
          :key="i"
          class="cd-test-row"
          :class="r.pass ? 'cd-test-row--pass' : 'cd-test-row--fail'"
        >
          <span>{{ r.name }}</span>
          <code dir="ltr" style="font-size: .78rem; color: var(--cd-muted)">{{ r.formula }}</code>
          <span style="color: var(--cd-muted)">→ {{ r.pass ? `${formatNumber(r.expected)}` : `${formatLatin(r.actual)} (انتظار: ${formatLatin(r.expected)})` }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import { useCabinetStore } from '../store/cabinet-store.js'
import { validateConstants } from '../core/constants.js'
import { runSelfTests } from '../core/self-test.js'
import { formatNumber, formatLatin, toPersianDigits } from '../utils/formatters.js'

const store = useCabinetStore()
const toast = useToast()

const draft = reactive({ key: '', label: '', value: 0, unit: 'سانتی‌متر', description: '' })
const tests = ref(null)

const validation = computed(() => validateConstants(store.constants))

const fa = (v) => toPersianDigits(v)

function change(key, value) {
  if (!Number.isFinite(Number(value))) {
    toast.add({ severity: 'error', summary: 'مقدار نامعتبر', detail: 'ثابت باید عدد باشد.', life: 3000 })
    return
  }
  store.updateConstant(key, Number(value))
}

function touch(c) {
  // نام/توضیح ویرایششده را در state اعمال کن
  store.$patch((state) => {
    if (state.constants[c.id]) state.constants[c.id] = { ...state.constants[c.id], label: c.label, description: c.description, updatedAt: Date.now() }
  })
  store.persist()
}

function addConstant() {
  store.addNewConstant({ id: draft.key.trim(), label: draft.label.trim(), value: Number(draft.value) || 0, unit: draft.unit, description: draft.description })
  toast.add({ severity: 'success', summary: 'ثابت افزوده شد', detail: 'حالا می‌توانید از آن در فرمولها استفاده کنید.', life: 3000 })
  draft.key = ''
  draft.label = ''
  draft.value = 0
  draft.description = ''
}

function runTests() {
  tests.value = runSelfTests()
  const failed = tests.value.failed
  toast.add({
    severity: failed ? 'error' : 'success',
    summary: failed ? `${fa(failed)} تست ناموفق` : 'همه تست‌ها پاس شدند',
    detail: `${fa(tests.value.passed)} از ${fa(tests.value.total)}`,
    life: 3500
  })
}

function resetAll() {
  store.resetToDefaults()
  toast.add({ severity: 'info', summary: 'بازگشت به پیش‌فرضها', detail: 'ثابتها و قالبها بازنشانی شدند.', life: 3500 })
}
</script>
