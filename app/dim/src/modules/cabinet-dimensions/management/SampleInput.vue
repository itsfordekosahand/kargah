<template>
  <div class="cd-page">
    <div class="cd-page__header">
      <div>
        <h1 class="cd-page__title">ورود نمونه‌ها (یادگیری)</h1>
        <p class="cd-page__desc">
          نمونه کابینتها را با عرضهای مختلف و ابعاد واقعی قطعات وارد کنید. حداقل دو نمونه با عرض متفاوت لازم است.
        </p>
      </div>
      <div class="cd-toolbar" style="margin: 0">
        <Button label="افزودن نمونه" icon="pi pi-plus" size="small" @click="addSample" />
        <Button
          label="افزودن از کابینت ذخیره‌شده"
          icon="pi pi-download"
          size="small"
          severity="secondary"
          outlined
          :disabled="!instancesOfTemplate.length"
          @click="instanceDialog = true"
        />
        <Button label="استخراج قواعد" icon="pi pi-bolt" size="small" :disabled="store.sampleList.length < 2" @click="extract" />
        <Button label="پاک‌کردن همه" icon="pi pi-trash" size="small" severity="danger" text @click="clearAll" />
      </div>
    </div>

    <section class="cd-section">
      <h2 class="cd-section__title">
        <i class="pi pi-table"></i> نمونه‌ها
        <span class="cd-hint">— قالب فعال: {{ activeTemplate?.name || '—' }}</span>
      </h2>

      <div v-if="!activeTemplate" class="cd-empty">
        <span class="cd-empty__desc">ابتدا از بخش «محاسبه» یک نوع کابینت انتخاب کنید.</span>
      </div>

      <div v-else-if="!store.sampleList.length" class="cd-empty">
        <i class="pi pi-inbox cd-empty__icon"></i>
        <div class="cd-empty__title">هنوز نمونه‌ای وارد نشده</div>
        <div class="cd-empty__desc">دستی اضافه کنید یا از کابینتهای ذخیره‌شده بارگذاری کنید.</div>
      </div>

      <div v-else class="cd-table-wrap">
        <table class="cd-table cd-table--wide">
          <thead>
            <tr>
              <th>نام</th>
              <th v-for="k in paramKeys" :key="k.key">{{ k.label }}</th>
              <template v-for="p in activeTemplate.parts" :key="p.id">
                <th>{{ p.name }} — طول</th>
                <th>{{ p.name }} — عرض</th>
              </template>
              <th class="no-print"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in store.sampleList" :key="s.id">
              <td><input v-model="s.name" class="p-inputtext" style="min-width: 110px" @change="touch(s)" /></td>
              <td v-for="k in paramKeys" :key="k.key">
                <InputNumber
                  :model-value="s.params[k.key]"
                  :min="0" :step="1" show-buttons :use-grouping="false" style="width: 110px"
                  @update:model-value="(v) => setParam(s, k.key, v)"
                />
              </td>
              <template v-for="p in activeTemplate.parts" :key="p.id">
                <td>
                  <InputNumber
                    :model-value="s.parts[p.id]?.length"
                    :step="0.1" :use-grouping="false" show-buttons style="width: 120px"
                    @update:model-value="(v) => setDim(s, p.id, 'length', v)"
                  />
                </td>
                <td>
                  <InputNumber
                    :model-value="s.parts[p.id]?.width"
                    :step="0.1" :use-grouping="false" show-buttons style="width: 120px"
                    @update:model-value="(v) => setDim(s, p.id, 'width', v)"
                  />
                </td>
              </template>
              <td class="no-print">
                <Button icon="pi pi-trash" size="small" severity="danger" text @click="store.deleteSample(s.id)" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p class="cd-hint">
        راهنما: عرض را حتماً در نمونه‌ها متفاوت وارد کنید؛ ابعادی که وارد نکنید در استخراج نادیده گرفته می‌شوند.
      </p>
    </section>

    <Dialog v-model:visible="instanceDialog" header="افزودن از کابینت ذخیره‌شده" :style="{ width: '460px' }" modal>
      <div class="cd-field">
        <Select v-model="pickedInstance" :options="instanceOptions" option-label="label" option-value="id" placeholder="انتخاب کنید" show-clear class="w-full" />
      </div>
      <template #footer>
        <Button label="انصراف" severity="secondary" text @click="instanceDialog = false" />
        <Button label="افزودن" icon="pi pi-plus" :disabled="!pickedInstance" @click="addFromInstance" />
      </template>
    </Dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import { useCabinetStore } from '../store/cabinet-store.js'
import { extractRules } from '../core/rule-extractor.js'
import { formatNumber } from '../utils/formatters.js'

const store = useCabinetStore()
const toast = useToast()

const instanceDialog = ref(false)
const pickedInstance = ref(null)

const activeTemplate = computed(() => store.activeTemplate)

const paramKeys = [
  { key: 'width', label: 'عرض' },
  { key: 'height', label: 'ارتفاع' },
  { key: 'depth', label: 'عمق' },
  { key: 'doors', label: 'تعداد در' },
  { key: 'shelves', label: 'تعداد طبقه' }
]

const instancesOfTemplate = computed(() => store.instanceList.filter((i) => i.templateId === store.activeTemplateId))

const instanceOptions = computed(() =>
  instancesOfTemplate.value.map((i) => ({ id: i.id, label: `${i.name} — عرض ${formatNumber(i.params?.width || 0)}` }))
)

function emptyParts() {
  const parts = {}
  for (const p of activeTemplate.value?.parts || []) parts[p.id] = { length: null, width: null }
  return parts
}

function addSample() {
  if (!activeTemplate.value) return
  const d = activeTemplate.value.defaults
  store.addSample({
    name: `نمونه ${store.sampleList.length + 1}`,
    params: { width: 100, height: d.height, depth: d.depth, doors: d.doors, shelves: d.shelves },
    parts: emptyParts()
  })
}

function setParam(sample, key, value) {
  store.updateSample(sample.id, { params: { [key]: Number(value) } })
}

function setDim(sample, partId, dim, value) {
  const parts = JSON.parse(JSON.stringify(sample.parts || {}))
  parts[partId] = { ...(parts[partId] || {}), [dim]: value === null ? null : Number(value) }
  store.updateSample(sample.id, { parts })
}

function touch(sample) {
  store.updateSample(sample.id, { name: sample.name })
}

function addFromInstance() {
  const s = store.sampleFromInstance(pickedInstance.value)
  instanceDialog.value = false
  pickedInstance.value = null
  if (s) toast.add({ severity: 'success', summary: 'نمونه افزوده شد', detail: `«${s.name}» به جدول نمونه‌ها اضافه شد.`, life: 3000 })
}

function extract() {
  const out = store.extractRulesFromSamples(store.activeTemplateId)
  if (out.errors?.length) {
    toast.add({ severity: 'error', summary: 'استخراج انجام نشد', detail: out.errors[0], life: 4500 })
    return
  }
  toast.add({
    severity: 'success',
    summary: 'قواعد استخراج شد',
    detail: `${out.results.length} قطعه بررسی شد؛ نتیجه در صفحه «قواعد استخراجشده» آماده تأیید است.`,
    life: 4000
  })
  window.dispatchEvent(new CustomEvent('cd-goto', { detail: 'extractor' }))
}

function clearAll() {
  store.clearSamples()
  toast.add({ severity: 'info', summary: 'نمونه‌ها پاک شدند', life: 2500 })
}
</script>
