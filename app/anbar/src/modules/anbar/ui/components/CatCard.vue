<script setup>
import { ico } from '../../utils/icons.js'
import { fmt } from '../../utils/format.js'
defineProps({
  name: { type: String, default: '' },
  count: { type: Number, default: 0 },
  unitLabel: { type: String, default: '' },
  i: { type: Number, default: 0 },
  act: { type: String, default: '' },
  type: { type: String, default: '' },
  sub: { type: Boolean, default: false },
  cat: { type: String, default: '' }
})
</script>

<template>
  <div class="cat-card-wrap" :style="{ '--i': i }">
    <button type="button" class="cat-card" :data-act="act" :data-val="name">
      <span class="cat-name">
        <span v-html="ico(sub ? 'layers' : 'folder', 15)"></span> {{ name }}
      </span>
      <span class="cat-count">{{ fmt(count) }} {{ unitLabel }}</span>
    </button>
    <div class="cat-tools">
      <button type="button" class="mini" :data-act="sub ? 'rename-sub' : 'rename-cat'"
              :data-type="type" :data-cat="sub ? cat : undefined" :data-val="name" title="تغییر نام"
              v-html="ico('pencil', 12)"></button>
      <button type="button" class="mini dan" :data-act="sub ? 'del-sub' : 'del-cat'"
              :data-type="type" :data-cat="sub ? cat : undefined" :data-val="name" title="حذف"
              v-html="ico('trash', 12)"></button>
    </div>
  </div>
</template>
