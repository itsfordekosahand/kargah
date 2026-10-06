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
import SheetSearchBox from '../components/SheetSearchBox.vue'

const store = useAnbarStore()
const ui = store.ui

const cats = computed(() => store.uniq(store.data.sheets.map(s => s.category)).sort((a, b) => a.localeCompare(b, 'fa')))
const subs = computed(() => store.uniq(store.data.sheets.filter(s => s.category === ui.sheetsCat).map(s => s.sub)).sort((a, b) => a.localeCompare(b, 'fa')))
const list = computed(() => store.data.sheets.filter(s => s.category === ui.sheetsCat && s.sub === ui.sheetsSub))
</script>

<template>
  <!-- دسته‌ها -->
  <div v-if="!ui.sheetsCat" class="card" style="--d:0">
    <SecHead icon="file" title="دسته‌های ورق" :count="cats.length">
      <button class="btn icon" data-act="toggle-sheet-search" title="جستجو" v-html="ico('search', 18)"></button>
      <button class="btn amber sm" data-act="new-cat" data-type="sheet">
        <span v-html="ico('plus', 14)"></span> دسته جدید
      </button>
    </SecHead>
    <SheetSearchBox v-if="ui.showSheetSearch" />
    <div class="card-grid">
      <CatCard v-for="(c, i) in cats" :key="c" :name="c" :count="store.data.sheets.filter(s => s.category === c).length"
               unit-label="ردیف" :i="i" act="pick-sheets-cat" type="sheet" />
      <NewCatCard act="new-cat" type="sheet" label="دسته جدید" :i="cats.length" />
    </div>
  </div>

  <!-- زیردسته‌ها -->
  <div v-else-if="!ui.sheetsSub" class="card" style="--d:0">
    <Crumbs :list="[{ label: 'همه دسته‌ها', act: 'back-sheets-cat', icon: 'home' }, { label: ui.sheetsCat, current: true }]" />
    <SecHead icon="layers" :title="`زیردسته‌های «${ui.sheetsCat}»`" :count="subs.length">
      <button class="btn icon" data-act="toggle-sheet-search" title="جستجو" v-html="ico('search', 18)"></button>
      <button class="btn amber sm" data-act="new-sub" data-type="sheet">
        <span v-html="ico('plus', 14)"></span> زیردسته جدید
      </button>
    </SecHead>
    <SheetSearchBox v-if="ui.showSheetSearch" />
    <div class="card-grid">
      <CatCard v-for="(s, i) in subs" :key="s" :name="s" sub
               :count="store.data.sheets.filter(x => x.category === ui.sheetsCat && x.sub === s).length"
               unit-label="ردیف" :i="i" act="pick-sheets-sub" type="sheet" :cat="ui.sheetsCat" />
      <NewCatCard act="new-sub" type="sheet" label="زیردسته جدید" :i="subs.length" />
    </div>
  </div>

  <!-- لیست ورق -->
  <div v-else class="card" style="--d:0">
    <Crumbs :list="[
      { label: 'همه دسته‌ها', act: 'back-sheets-cat', icon: 'home' },
      { label: ui.sheetsCat, act: 'back-sheets-sub' },
      { label: ui.sheetsSub, current: true }
    ]" />
    <SecHead icon="file" :title="`ورق‌های «${ui.sheetsSub}»`" :count="list.length">
      <button class="btn icon" data-act="toggle-sheet-search" title="جستجو" v-html="ico('search', 18)"></button>
      <button class="btn amber sm" data-act="new-sheet-in-sub" :data-cat="ui.sheetsCat" :data-sub="ui.sheetsSub">
        <span v-html="ico('plus', 14)"></span> ورق جدید
      </button>
    </SecHead>
    <SheetSearchBox v-if="ui.showSheetSearch" />

    <div v-if="list.length" class="item-list">
      <div v-for="(s, i) in list" :key="s.id" class="item-row" :style="{ '--i': i }">
        <div class="item-row-name">
          عرض {{ fmt(s.width) }} × طول {{ fmt(s.length) }} سانتی‌متر
          <small v-if="s.note">{{ s.note }}</small>
        </div>
        <div class="item-row-qty">{{ fmt(s.qty) }} تخته</div>
        <div class="item-row-actions no-print">
          <button class="btn sm" data-act="sheet-edit" :data-id="s.id" title="ویرایش" v-html="ico('pencil', 14)"></button>
          <button class="btn sm dan" data-act="del" data-type="sheet" :data-id="s.id" title="حذف" v-html="ico('trash', 14)"></button>
        </div>
      </div>
    </div>
    <EmptyBox v-else msg="ورقی در این زیردسته ثبت نشده." />
  </div>
</template>
