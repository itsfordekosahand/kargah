<template>
  <div class="cd-page">
    <div class="cd-page__header no-print">
      <div>
        <h1 class="cd-page__title">محاسبه ابعاد کابینت</h1>
        <p class="cd-page__desc">نوع کابینت را انتخاب کنید، پارامترها را وارد کنید و لیست کامل قطعات را ببینید. همه‌چیز آفلاین محاسبه می‌شود.</p>
      </div>
      <span class="cd-hint"><i class="pi pi-save"></i> ذخیره خودکار: {{ storageOk ? 'فعال' : 'غیرفعال' }}</span>
    </div>

    <!-- بخش اول: انتخاب نوع -->
    <section class="cd-section no-print">
      <h2 class="cd-section__title"><i class="pi pi-th-large"></i> نوع کابینت</h2>
      <CabinetTypeSelector :templates="store.templateList" :active-id="store.activeTemplateId" @select="onSelectTemplate" @add="onAddType" />
    </section>

    <!-- بخش دوم: پارامترها -->
    <section v-if="activeTemplate" class="cd-section no-print">
      <h2 class="cd-section__title">
        <i class="pi pi-sliders-h"></i> پارامترهای ورودی
        <span class="cd-hint">— {{ activeTemplate.name }}</span>
      </h2>
      <ParametersForm
        :params="params"
        :options="options"
        :defaults="activeTemplate.defaults"
        :mdf-thickness="mdfThickness"
        @update:params="onParams"
        @update:options="onOptions"
        @update-constant="onConstant"
      />
    </section>

    <!-- بخش سوم: جدول قطعات -->
    <PartsTable v-if="activeTemplate" :parts="result.parts">
      <template #actions>
        <Button class="no-print" label="ذخیره کابینت" icon="pi pi-save" size="small" @click="saveDialog = true" :disabled="!result.parts.length" />
        <Button class="no-print" label="کپی از کابینت قبلی" icon="pi pi-copy" size="small" severity="secondary" outlined @click="copyDialog = true" :disabled="!store.instanceList.length" />
        <Button class="no-print" label="چاپ لیست قطعات" icon="pi pi-print" size="small" severity="secondary" outlined @click="printList" :disabled="!result.parts.length" />
      </template>

      <template #footer>
        <SummaryPanel :summary="result.summary" />
      </template>
    </PartsTable>

    <EmptyState
      v-else
      icon="pi-exclamation-circle"
      title="قالبی فعال نیست"
      description="از بخش بالا یک نوع کابینت انتخاب کنید یا نوع جدیدی بسازید."
      class="no-print"
    />

    <!-- ذخیره -->
    <Dialog v-model:visible="saveDialog" header="ذخیره کابینت" :style="{ width: '420px' }" modal>
      <div class="cd-field">
        <label class="cd-field__label">نام کابینت</label>
        <InputText v-model="instanceName" placeholder="مثلاً زمینی زیر سینک" class="w-full" @keyup.enter="doSave" />
        <span class="cd-field__hint">
          عرض {{ formatNumber(params.width) }} × ارتفاع {{ formatNumber(params.height) }} × عمق {{ formatNumber(params.depth) }}
          — {{ toPersianDigits(result.summary.totalPieces) }} قطعه
        </span>
      </div>
      <template #footer>
        <Button label="انصراف" severity="secondary" text @click="saveDialog = false" />
        <Button label="ذخیره" icon="pi pi-check" @click="doSave" />
      </template>
    </Dialog>

    <!-- کپی -->
    <Dialog v-model:visible="copyDialog" header="کپی از کابینت قبلی" :style="{ width: '460px' }" modal>
      <div class="cd-field">
        <label class="cd-field__label">کابینت ذخیره‌شده</label>
        <Select
          v-model="copySource"
          :options="copyOptions"
          option-label="label"
          option-value="id"
          placeholder="انتخاب کنید"
          show-clear
          class="w-full"
        />
        <span class="cd-field__hint">پارامترها و بازنویسیهای کابینت انتخابی روی فرم فعلی اعمال می‌شود.</span>
      </div>
      <template #footer>
        <Button label="انصراف" severity="secondary" text @click="copyDialog = false" />
        <Button label="اعمال" icon="pi pi-copy" :disabled="!copySource" @click="doCopy" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import CabinetTypeSelector from './CabinetTypeSelector.vue'
import ParametersForm from './ParametersForm.vue'
import PartsTable from './PartsTable.vue'
import SummaryPanel from './SummaryPanel.vue'
import EmptyState from './components/EmptyState.vue'
import { useCabinetStore } from '../store/cabinet-store.js'
import { calculateCabinet, applyCalculationOptions, OPTION_GROUPS } from '../core/calculator.js'
import { createTemplate } from '../core/templates.js'
import { constantValue } from '../core/constants.js'
import { toPersianDigits, formatNumber } from '../utils/formatters.js'

const store = useCabinetStore()
const toast = useToast()

onMounted(() => store.init())

const activeTemplate = computed(() => store.activeTemplate)

const params = ref({ width: 100, height: 71, depth: 58, doors: 2, shelves: 1 })
const options = ref({ pvcDoor: true, pvcBody: true, pvcShelf: false, grooveBack: true })

function optionsFromTemplate(tpl) {
  if (!tpl) return { pvcDoor: true, pvcBody: true, pvcShelf: false, grooveBack: true }
  const byId = (id) => tpl.parts.find((p) => p.id === id)
  return {
    pvcDoor: byId('door')?.pvc ?? true,
    pvcBody: byId('bottom')?.pvc ?? true,
    pvcShelf: byId('shelf')?.pvc ?? false,
    grooveBack: byId('back')?.groove ?? true
  }
}

// با تعویض قالب: پارامترهای پیش‌فرض قالب + گزینه‌ها
watch(() => store.activeTemplateId, () => {
  const tpl = activeTemplate.value
  if (!tpl) return
  params.value = { width: params.value.width || 100, ...tpl.defaults }
  options.value = optionsFromTemplate(tpl)
}, { immediate: true })

const mdfThickness = computed(() => constantValue(store.constants, 'mdfThickness', 1.6))

const result = computed(() => {
  const tpl = activeTemplate.value
  if (!tpl) return { parts: [], summary: { totalPieces: 0, pvcMeters: 0, grooveMeters: 0, mdfArea: 0, errorCount: 0 } }
  const readyTpl = applyCalculationOptions(tpl, options.value)
  return calculateCabinet(readyTpl, params.value, store.constants, {})
})

function onParams(next) {
  params.value = { ...next }
}

function onOptions(next) {
  options.value = { ...next }
}

function onConstant({ key, value }) {
  if (!Number.isFinite(Number(value))) return
  store.updateConstant(key, Number(value))
}

function onSelectTemplate(id) {
  store.setActiveTemplate(id)
}

function onAddType() {
  const res = store.addTemplate({ name: 'نوع جدید', type: 'base', description: 'قالب سفارشی — قطعات و فرمولها را ویرایش کنید.' })
  if (res.ok) {
    toast.add({ severity: 'success', summary: 'قالب ساخته شد', detail: 'حالا می‌توانید قطعات و قواعد آن را ویرایش کنید.', life: 3000 })
    window.dispatchEvent(new CustomEvent('cd-open-editor', { detail: res.template.id }))
  } else {
    toast.add({ severity: 'error', summary: 'خطا', detail: res.errors?.[0]?.message || 'قالب ساخته نشد.', life: 4000 })
  }
}

const saveDialog = ref(false)
const instanceName = ref('')

function doSave() {
  const name = instanceName.value.trim() || `کابینت ${formatNumber(params.width)} عرض`
  const res = store.saveInstance({ name, templateId: store.activeTemplateId, params: params.value })
  if (res.ok) {
    saveDialog.value = false
    instanceName.value = ''
    toast.add({ severity: 'success', summary: 'ذخیره شد', detail: `«${name}» در لیست نمونه‌ها ذخیره شد.`, life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: 'خطا در ذخیره', detail: store.error || 'ذخیره‌سازی انجام نشد.', life: 4000 })
  }
}

const copyDialog = ref(false)
const copySource = ref(null)

const copyOptions = computed(() =>
  store.instanceList.map((i) => ({ id: i.id, label: `${i.name} — ${i.templateName} (${formatNumber(i.params?.width || 0)} عرض)` }))
)

function doCopy() {
  const inst = store.instanceList.find((i) => i.id === copySource.value)
  if (!inst) return
  if (inst.templateId !== store.activeTemplateId && store.templateById(inst.templateId)) {
    store.setActiveTemplate(inst.templateId)
  }
  params.value = { ...params.value, ...inst.params }
  copyDialog.value = false
  copySource.value = null
  toast.add({ severity: 'info', summary: 'کپی شد', detail: `پارامترهای «${inst.name}» روی فرم اعمال شد.`, life: 3000 })
}

function printList() {
  window.print()
}

const storageOk = computed(() => store.storageOk)
</script>
