<script setup>
import { ico } from '../../utils/icons.js'
defineProps({ list: { type: Array, default: () => [] } })
</script>

<template>
  <div class="crumb">
    <template v-for="(c, i) in list" :key="i">
      <span v-if="i > 0" class="crumb-sep">›</span>
      <span v-if="c.current" class="crumb-item current">{{ c.label }}</span>
      <button v-else class="crumb-item" :data-act="c.act" :data-type="c.type || undefined">
        <span v-if="c.icon" v-html="ico(c.icon, 12)"></span> {{ c.label }}
      </button>
    </template>
  </div>
</template>
