<template>
  <div class="cd-page">
    <div class="cd-page__header">
      <div>
        <h1 class="cd-page__title">مدیریت قالبها</h1>
        <p class="cd-page__desc">قالبها را ویرایش، کپی یا حذف کنید و از هر قالب نمونه بسازید.</p>
      </div>
      <div class="cd-toolbar" style="margin: 0">
        <Button label="ساخت قالب جدید" icon="pi pi-plus" size="small" @click="create" />
      </div>
    </div>

    <div class="cd-cards">
      <div v-for="t in store.templateList" :key="t.id" class="cd-card" style="cursor: default">
        <i class="pi cd-card__icon" :class="t.icon || 'pi-folder'"></i>
        <span class="cd-card__name">{{ t.name }}</span>
        <span class="cd-card__desc">{{ t.description || 'بدون توضیح' }}</span>
        <span class="cd-card__desc">
          {{ toPersianDigits(t.parts.length) }} قطعه — پیش‌فرض: عرض {{ formatNumber(t.defaults.width || 100) }}، ارتفاع {{ formatNumber(t.defaults.height) }}
        </span>
        <div class="cd-toolbar" style="margin: 6px 0 0">
          <Button label="ویرایش" icon="pi pi-pencil" size="small" @click="edit(t.id)" />
          <Button label="کپی" icon="pi pi-copy" size="small" severity="secondary" outlined @click="copy(t.id)" />
          <Button label="ساخت نمونه" icon="pi pi-calculator" size="small" severity="secondary" outlined @click="makeSample(t.id)" />
          <Button icon="pi pi-trash" size="small" severity="danger" text @click="remove(t.id)" />
        </div>
      </div>
    </div>

    <section v-if="deleted.length" class="cd-section">
      <h2 class="cd-section__title"><i class="pi pi-trash"></i> قالبهای حذف‌شده</h2>
      <div class="cd-toolbar">
        <div v-for="t in deleted" :key="t.id" class="cd-part-card" style="flex: 1; min-width: 220px">
          <span class="cd-part-card__name">{{ t.name }}</span>
          <div class="cd-part-card__actions">
            <Button label="بازیابی" icon="pi pi-undo" size="small" severity="secondary" outlined @click="restore(t.id)" />
          </div>
        </div>
      </div>
    </section>

    <EmptyState v-if="!store.templateList.length" icon="pi-folder" title="قالبی وجود ندارد" description="اولین قالب خود را بسازید تا شروع کنید.">
      <Button label="ساخت قالب" icon="pi pi-plus" @click="create" />
    </EmptyState>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import EmptyState from '../ui/components/EmptyState.vue'
import { useCabinetStore } from '../store/cabinet-store.js'
import { toPersianDigits, formatNumber } from '../utils/formatters.js'

const store = useCabinetStore()
const toast = useToast()

const deleted = computed(() =>
  Object.values(store.templates).filter((t) => t && t.deletedAt).sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0))
)

function edit(id) {
  window.dispatchEvent(new CustomEvent('cd-edit-template', { detail: id }))
}

function create() {
  const res = store.addTemplate({ name: 'قالب جدید', type: 'base', description: '' })
  if (res.ok) {
    toast.add({ severity: 'success', summary: 'قالب ساخته شد', life: 2500 })
    edit(res.template.id)
  } else {
    toast.add({ severity: 'error', summary: 'خطا', detail: res.errors?.[0]?.message, life: 4000 })
  }
}

function copy(id) {
  const res = store.duplicateTemplate(id)
  if (res.ok) toast.add({ severity: 'success', summary: 'کپی شد', detail: `«${res.template.name}» ساخته شد.`, life: 3000 })
}

function remove(id) {
  store.deleteTemplate(id)
  toast.add({ severity: 'info', summary: 'قالب حذف شد', detail: 'حذف نرم است و از بخش «حذف‌شده‌ها» قابل بازیابی است.', life: 3500 })
}

function restore(id) {
  store.restoreTemplate(id)
  toast.add({ severity: 'success', summary: 'بازیابی شد', life: 2500 })
}

function makeSample(id) {
  store.setActiveTemplate(id)
  window.dispatchEvent(new CustomEvent('cd-goto', { detail: 'calculator' }))
}
</script>
