<template>
  <div class="cd-cards">
    <button
      v-for="t in templates"
      :key="t.id"
      type="button"
      class="cd-card"
      :class="{ 'cd-card--active': t.id === activeId }"
      @click="$emit('select', t.id)"
    >
      <i class="pi cd-card__icon" :class="t.icon || 'pi-folder'"></i>
      <span class="cd-card__name">{{ t.name }}</span>
      <span class="cd-card__desc">{{ t.description || 'بدون توضیح' }}</span>
    </button>

    <button type="button" class="cd-card cd-card--new" @click="$emit('add')">
      <i class="pi pi-plus cd-card__icon"></i>
      <span class="cd-card__name">افزودن نوع جدید</span>
      <span class="cd-card__desc">ساخت قالب سفارشی با قطعات و فرمولهای دلخواه</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  templates: { type: Array, default: () => [] },
  activeId: { type: String, default: null }
})
defineEmits(['select', 'add'])
</script>
