<script setup>
import { ico } from '../../utils/icons.js'
defineProps({ msg: { type: String, default: '' } })
</script>

<template>
  <div class="empty">
    <span v-html="ico('inbox', 42)"></span>
    <div>{{ msg }}</div>
  </div>
</template>
