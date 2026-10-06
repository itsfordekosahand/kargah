<script setup>
import { computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt } from '../../utils/format.js'
import SecHead from '../components/SecHead.vue'
import Crumbs from '../components/Crumbs.vue'
import CatCard from '../components/CatCard.vue'
import NewCatCard from '../components/NewCatCard.vue'
import EmptyBox from '../components/EmptyBox.vue'

const store = useAnbarStore()
const ui = store.ui

const cats = computed(() => store.uniq(store.data.tools.map(t => t.category)).sort((a, b) => a.localeCompare(b, 'fa')))
const list = computed(() => store.data.tools.filter(t => t.category === ui.toolCat))
</script>

<template>
  <!-- دسته‌ها -->
  <div v-if="!ui.toolCat" class="card" style="--d:0">
    <SecHead icon="tool" title="دسته‌های ابزار" :count="cats.length">
      <button class="btn amber sm" data-act="new-cat" data-type="tool">
        <span v-html="ico('plus', 14)"></span> دسته جدید
      </button>
    </SecHead>
    <div class="card-grid">
      <CatCard v-for="(c, i) in cats" :key="c" :name="c" :count="store.data.tools.filter(t => t.category === c).length"
               unit-label="ابزار" :i="i" act="pick-tool-cat" type="tool" />
      <NewCatCard act="new-cat" type="tool" label="دسته جدید" :i="cats.length" />
    </div>
    <div class="hint" style="margin-top:16px;display:flex;gap:8px;align-items:flex-start">
      <span style="flex:0 0 auto;color:var(--pri);margin-top:2px" v-html="ico('info', 16)"></span>
      <span>یک دسته را انتخاب کنید تا ابزارهای آن را ببینید و ابزار جدید اضافه کنید. مجموع {{ fmt(store.data.tools.length) }} ابزار در {{ fmt(cats.length) }} دسته.</span>
    </div>
  </div>

  <!-- لیست ابزارها -->
  <div v-else class="card" style="--d:0">
    <Crumbs :list="[{ label: 'همه دسته‌ها', act: 'back-tools', icon: 'home' }, { label: ui.toolCat, current: true }]" />
    <SecHead icon="tool" :title="`ابزارهای «${ui.toolCat}»`" :count="list.length">
      <button class="btn amber sm" data-act="new-tool-in-cat" :data-cat="ui.toolCat">
        <span v-html="ico('plus', 14)"></span> ابزار جدید
      </button>
    </SecHead>

    <div v-if="list.length" class="item-list">
      <div v-for="(t, i) in list" :key="t.id" class="item-row" :style="{ '--i': i }">
        <div class="item-row-name">
          {{ t.name }}
          <small v-if="store.toolOut(store.data.jobs, t.id)">
            <span v-html="ico('clock', 11)"></span>
            {{ fmt(store.toolOut(store.data.jobs, t.id)) }} عدد در امانت • موجود {{ fmt(store.toolAvail(store.data.jobs, t)) }}
          </small>
        </div>
        <div class="item-row-qty">{{ fmt(t.total) }} عدد</div>
        <div class="item-row-actions no-print">
          <button class="btn sm" data-act="tool-edit" :data-id="t.id" title="ویرایش" v-html="ico('pencil', 14)"></button>
          <button class="btn sm dan" data-act="del" data-type="tool" :data-id="t.id" title="حذف" v-html="ico('trash', 14)"></button>
        </div>
      </div>
    </div>
    <EmptyBox v-else msg="ابزاری در این دسته ثبت نشده. با دکمه «ابزار جدید» شروع کنید." />
  </div>
</template>
