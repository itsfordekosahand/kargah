<template>
  <div class="cd-page">
    <div class="cd-page__header">
      <div>
        <h1 class="cd-page__title">ویرایش قالب — {{ form.name || 'بدون نام' }}</h1>
        <p class="cd-page__desc">اطلاعات پایه، پیش‌فرضها، قطعات و قواعد محاسبه را ویرایش کنید. ذخیره فقط با اعتبارسنجی کامل انجام می‌شود.</p>
      </div>
      <div class="cd-toolbar" style="margin: 0">
        <Button label="بازگشت" icon="pi pi-arrow-right" severity="secondary" text @click="goBack" />
        <Button label="ذخیره قالب" icon="pi pi-save" @click="save" :loading="saving" />
      </div>
    </div>

    <ul v-if="errors.length" class="cd-error-list">
      <li v-for="(e, i) in errors" :key="i">{{ e.path ? `${e.path}: ` : '' }}{{ e.message }}</li>
    </ul>

    <section class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-info-circle"></i> اطلاعات پایه</h2>
      <div class="cd-form-grid">
        <div class="cd-field">
          <label class="cd-field__label">نام قالب</label>
          <InputText v-model="form.name" />
        </div>
        <div class="cd-field">
          <label class="cd-field__label">آیکن</label>
          <Select v-model="form.icon" :options="iconOptions" option-label="label" option-value="key" />
        </div>
        <div class="cd-field" style="grid-column: span 2">
          <label class="cd-field__label">توضیح</label>
          <InputText v-model="form.description" placeholder="توضیح کوتاه برای کارت نوع کابینت" />
        </div>
      </div>
    </section>

    <section class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-sliders-h"></i> پارامترهای پیش‌فرض</h2>
      <div class="cd-form-grid">
        <div class="cd-field">
          <label class="cd-field__label">ارتفاع</label>
          <InputNumber v-model="form.defaults.height" :min="10" :max="400" show-buttons :use-grouping="false" />
        </div>
        <div class="cd-field">
          <label class="cd-field__label">عمق</label>
          <InputNumber v-model="form.defaults.depth" :min="10" :max="200" show-buttons :use-grouping="false" />
        </div>
        <div class="cd-field">
          <label class="cd-field__label">تعداد در</label>
          <InputNumber v-model="form.defaults.doors" :min="1" :max="20" show-buttons :use-grouping="false" />
        </div>
        <div class="cd-field">
          <label class="cd-field__label">تعداد طبقه</label>
          <InputNumber v-model="form.defaults.shelves" :min="0" :max="30" show-buttons :use-grouping="false" />
        </div>
      </div>
      <p class="cd-hint">عرض ورودی در صفحه محاسبه است؛ این مقادیر پیش‌فرض بقیه پارامترها هستند.</p>
    </section>

    <section class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-list"></i> قطعات و قواعد</h2>
      <PartsEditor
        :parts="form.parts"
        :params="previewParams"
        :constants="store.constants"
        @update:parts="(list) => (form.parts = list)"
      />
    </section>

    <section class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-eye"></i> پیش‌نمایش با پارامترهای پیش‌فرض</h2>
      <div class="cd-table-wrap">
        <table class="cd-table">
          <thead>
            <tr><th>نام قطعه</th><th>طول</th><th>عرض</th><th>تعداد</th><th>ضخامت</th><th>جنس</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in preview.parts" :key="p.id" :class="{ 'cd-row--error': p.errors.length }">
              <td class="cd-td--name">{{ p.name }}</td>
              <td class="cd-num">{{ num(p.length) }}</td>
              <td class="cd-num">{{ num(p.width) }}</td>
              <td class="cd-num">{{ fa(p.quantity) }}</td>
              <td class="cd-num">{{ num(p.thickness) }}</td>
              <td>{{ p.materialLabel }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="preview.summary.errorCount" class="cd-error-list">
        {{ fa(preview.summary.errorCount) }} خطا در محاسبه پیش‌نمایش وجود دارد.
      </p>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import PartsEditor from './PartsEditor.vue'
import { useCabinetStore } from '../store/cabinet-store.js'
import { validateTemplate } from '../core/validator.js'
import { calculateCabinet } from '../core/calculator.js'
import { formatNumber, toPersianDigits } from '../utils/formatters.js'

const props = defineProps({
  templateId: { type: String, required: true }
})
const emit = defineEmits(['back'])
const store = useCabinetStore()
const toast = useToast()

const iconOptions = [
  { key: 'pi pi-home', label: 'خانه' },
  { key: 'pi pi-window-maximize', label: 'پنجره' },
  { key: 'pi pi-align-justify', label: 'بلند' },
  { key: 'pi pi-th-large', label: 'شبکه' },
  { key: 'pi pi-folder', label: 'پوشه' },
  { key: 'pi pi-box', label: 'جعبه' }
]

const form = reactive({ name: '', icon: 'pi pi-folder', description: '', defaults: {}, parts: [] })
const errors = ref([])
const saving = ref(false)

function load() {
  const tpl = store.templateById(props.templateId)
  if (!tpl) return
  form.name = tpl.name
  form.icon = tpl.icon
  form.description = tpl.description
  form.defaults = { ...tpl.defaults }
  form.parts = JSON.parse(JSON.stringify(tpl.parts || [])).map((p) => ({
    ...p,
    quantity: p.quantity || { type: 'constant', value: 1 },
    length: p.length || { type: 'constant', value: 0 },
    width: p.width || { type: 'constant', value: 0 }
  }))
  errors.value = []
}

watch(() => props.templateId, load, { immediate: true })

const previewParams = computed(() => ({ width: 100, ...form.defaults }))

const preview = computed(() => {
  const tpl = {
    id: props.templateId, name: form.name, defaults: form.defaults, parts: form.parts
  }
  try {
    return calculateCabinet(tpl, previewParams.value, store.constants, {})
  } catch {
    return { parts: [], summary: { errorCount: 0 } }
  }
})

const num = (v) => (v === null || v === undefined ? '—' : formatNumber(v))
const fa = (v) => toPersianDigits(v)

function save() {
  saving.value = true
  const candidate = {
    ...store.templateById(props.templateId),
    name: form.name,
    icon: form.icon,
    description: form.description,
    defaults: { ...form.defaults },
    parts: form.parts.map((p, i) => ({ ...p, order: i }))
  }
  const check = validateTemplate(candidate, store.constants)
  errors.value = check.errors
  if (!check.valid) {
    saving.value = false
    toast.add({ severity: 'error', summary: 'قالب ذخیره نشد', detail: `${check.errors.length} خطا باید اصلاح شود.`, life: 4000 })
    return
  }
  const res = store.updateTemplate(props.templateId, {
    name: form.name,
    icon: form.icon,
    description: form.description,
    defaults: { ...form.defaults },
    parts: candidate.parts
  })
  saving.value = false
  if (res.ok) {
    toast.add({ severity: 'success', summary: 'ذخیره شد', detail: 'قالب با موفقیت ذخیره و اعتبارسنجی شد.', life: 3000 })
    emit('back')
  } else {
    errors.value = res.errors || []
    toast.add({ severity: 'error', summary: 'خطا', detail: res.errors?.[0]?.message || 'ذخیره انجام نشد.', life: 4000 })
  }
}

function goBack() {
  emit('back')
}
</script>
