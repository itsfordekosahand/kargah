<script setup>
import { ico } from '../../utils/icons.js'
import { fmt } from '../../utils/format.js'
defineProps({ icon: { type: String, default: 'info' }, title: { type: String, default: '' }, count: { default: null } })
</script>

<template>
  <div class="sec-head">
    <div class="sec-title-main">
      <span v-html="ico(icon, 18)"></span>
      <span>{{ title }}</span>
      <span v-if="count != null" class="sec-count">({{ fmt(count) }})</span>
    </div>
    <div class="sec-actions"><slot /></div>
  </div>
</template>
