<template>
  <div class="modal-overlay" @click="$emit('close')">
    <div class="modal" :style="wide ? { maxWidth: '720px' } : {}" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button type="button" class="modal-close" @click="$emit('close')"><AppIcon name="x" /></button>
      </div>
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import AppIcon from './AppIcon.vue'

defineProps({ title: { type: String, required: true }, wide: Boolean })
defineEmits(['close'])
</script>
