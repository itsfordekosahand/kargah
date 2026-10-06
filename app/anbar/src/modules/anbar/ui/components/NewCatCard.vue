<script setup>
import { ico } from '../../utils/icons.js'
defineProps({
  act: { type: String, default: 'new-cat' },
  type: { type: String, default: '' },
  label: { type: String, default: 'دسته جدید' },
  i: { type: Number, default: 0 }
})
</script>

<template>
  <div class="cat-card-wrap" :style="{ '--i': i }">
    <button type="button" class="cat-card new" :data-act="act" :data-type="type">
      <span class="cat-name"><span v-html="ico('plus', 18)"></span> {{ label }}</span>
    </button>
  </div>
</template>
