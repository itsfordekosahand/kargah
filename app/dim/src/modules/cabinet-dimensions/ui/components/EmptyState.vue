<template>
  <div class="cd-empty">
    <i class="pi cd-empty__icon" :class="icon"></i>
    <div class="cd-empty__title">{{ title }}</div>
    <div v-if="description" class="cd-empty__desc">{{ description }}</div>
    <slot />
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: 'pi-inbox' },
  title: { type: String, required: true },
  description: { type: String, default: '' }
})
</script>
