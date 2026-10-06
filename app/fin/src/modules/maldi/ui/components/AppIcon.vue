<template>
  <span class="ico" aria-hidden="true" v-html="svg"></span>
</template>

<script setup>
import { computed } from 'vue'
import { ICONS } from '../../utils/icons.js'

const props = defineProps({ name: { type: String, required: true } })
const svg = computed(() => ICONS[props.name] || '')
</script>
