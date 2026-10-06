<template>
  <div class="cd-app">
    <div class="cd-appbar no-print">
      <div class="cd-nav">
        <span class="cd-appbar__brand"><i class="pi pi-box"></i> ابعاد کابینت</span>
        <Button
          v-for="n in navItems"
          :key="n.key"
          :label="n.label"
          :icon="n.icon"
          size="small"
          text
          :severity="view === n.key ? 'primary' : 'secondary'"
          @click="go(n.key)"
        />
      </div>
      <div class="cd-nav">
        <span class="cd-hint">{{ storageLabel }}</span>
        <Button
          :icon="dark ? 'pi pi-sun' : 'pi pi-moon'"
          size="small"
          text
          severity="secondary"
          :title="dark ? 'حالت روشن' : 'حالت تاریک'"
          @click="toggleDark"
        />
      </div>
    </div>

    <CabinetCalculator v-if="view === 'calculator'" />
    <TemplatesManager v-else-if="view === 'templates'" />
    <TemplateEditor v-else-if="view === 'editor' && editorId" :key="editorId" :template-id="editorId" @back="go('templates')" />
    <SampleInput v-else-if="view === 'samples'" />
    <RuleExtractor v-else-if="view === 'extractor'" />
    <ConstantsManager v-else-if="view === 'constants'" />

    <Toast position="top left" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import CabinetCalculator from './modules/cabinet-dimensions/ui/CabinetCalculator.vue'
import TemplatesManager from './modules/cabinet-dimensions/management/TemplatesManager.vue'
import TemplateEditor from './modules/cabinet-dimensions/management/TemplateEditor.vue'
import SampleInput from './modules/cabinet-dimensions/management/SampleInput.vue'
import RuleExtractor from './modules/cabinet-dimensions/management/RuleExtractor.vue'
import ConstantsManager from './modules/cabinet-dimensions/management/ConstantsManager.vue'
import { useCabinetStore } from './modules/cabinet-dimensions/store/cabinet-store.js'

const store = useCabinetStore()

const view = ref('calculator')
const editorId = ref(null)
const dark = ref(false)

const navItems = [
  { key: 'calculator', label: 'محاسبه', icon: 'pi pi-calculator' },
  { key: 'templates', label: 'قالبها', icon: 'pi pi-th-large' },
  { key: 'samples', label: 'نمونه‌ها', icon: 'pi pi-database' },
  { key: 'extractor', label: 'قواعد', icon: 'pi pi-sitemap' },
  { key: 'constants', label: 'ثابتها', icon: 'pi pi-sliders-h' }
]

const storageLabel = computed(() =>
  store.ready ? (store.storageOk ? 'ذخیره‌سازی محلی فعال' : 'حافظه محلی در دسترس نیست') : 'در حال بارگذاری…'
)

function go(key) {
  if (key === 'editor' && !editorId.value) return
  view.value = key
  window.scrollTo({ top: 0 })
}

function toggleDark() {
  dark.value = !dark.value
  document.documentElement.classList.toggle('cd-dark', dark.value)
}

function onGoto(e) {
  const target = e.detail
  if (target === 'calculator' || target === 'samples' || target === 'extractor' || target === 'templates' || target === 'constants') {
    view.value = target
  }
}

function onEdit(e) {
  editorId.value = e.detail
  view.value = 'editor'
}

onMounted(() => {
  store.init()
  window.addEventListener('cd-goto', onGoto)
  window.addEventListener('cd-edit-template', onEdit)
  window.addEventListener('cd-open-editor', onEdit)
})

onUnmounted(() => {
  window.removeEventListener('cd-goto', onGoto)
  window.removeEventListener('cd-edit-template', onEdit)
  window.removeEventListener('cd-open-editor', onEdit)
})
</script>
