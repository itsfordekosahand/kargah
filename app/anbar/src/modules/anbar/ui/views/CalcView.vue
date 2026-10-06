<script setup>
import { computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt, fmtInt } from '../../utils/format.js'
import SecHead from '../components/SecHead.vue'
import EmptyBox from '../components/EmptyBox.vue'
import TemplateView from './TemplateView.vue'

const store = useAnbarStore()
const ui = store.ui
const activeTpl = computed(() => (ui.openTemplate ? store.templateOf(ui.openTemplate) : null))
</script>

<template>
  <TemplateView v-if="activeTpl" :tpl="activeTpl" />

  <div v-else class="card" style="--d:0">
    <SecHead icon="calc" title="قالب‌های محاسبه و فاکتور" :count="store.data.templates.length">
      <button class="btn amber sm" data-act="new-template">
        <span v-html="ico('plus', 14)"></span> قالب جدید
      </button>
    </SecHead>

    <div v-if="store.data.templates.length" class="template-grid">
      <div v-for="(t, i) in store.data.templates" :key="t.id" class="template-card" :style="{ '--i': i }">
        <div class="tc-head" data-act="open-template" :data-id="t.id" style="cursor:pointer">
          <span class="tc-name"><span v-html="ico('folder', 16)"></span> {{ t.name }}</span>
          <span class="badge mut">{{ fmt((t.items || []).length) }} قلم</span>
        </div>
        <div class="tc-total" data-act="open-template" :data-id="t.id" style="cursor:pointer">
          {{ fmtInt(store.templateTotals(t).total) }} <span>تومان</span>
        </div>
        <div class="tc-actions no-print">
          <button class="btn sm pri" data-act="open-template" :data-id="t.id"><span v-html="ico('pencil', 13)"></span> ویرایش</button>
          <button class="btn sm" data-act="dup-template" :data-id="t.id"><span v-html="ico('copy', 13)"></span> کپی</button>
          <button class="btn sm dan" data-act="del" data-type="template" :data-id="t.id"><span v-html="ico('trash', 13)"></span> حذف</button>
        </div>
      </div>
    </div>
    <EmptyBox v-else msg="قالبی ثبت نشده. با دکمه «قالب جدید» بسازید." />
  </div>
</template>
