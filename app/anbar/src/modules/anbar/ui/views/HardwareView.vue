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

const cats = computed(() => store.uniq(store.data.hardware.map(h => h.category)).sort((a, b) => a.localeCompare(b, 'fa')))
const subs = computed(() => store.uniq(store.data.hardware.filter(h => h.category === ui.hardwareCat).map(h => h.sub)).sort((a, b) => a.localeCompare(b, 'fa')))
const list = computed(() => store.data.hardware.filter(h => h.category === ui.hardwareCat && h.sub === ui.hardwareSub))
</script>

<template>
  <!-- دسته‌ها -->
  <div v-if="!ui.hardwareCat" class="card" style="--d:0">
    <SecHead icon="bolt" title="دسته‌های یراق" :count="cats.length">
      <button class="btn amber sm" data-act="new-cat" data-type="hardware">
        <span v-html="ico('plus', 14)"></span> دسته جدید
      </button>
    </SecHead>
    <div class="card-grid">
      <CatCard v-for="(c, i) in cats" :key="c" :name="c" :count="store.data.hardware.filter(h => h.category === c).length"
               unit-label="ردیف" :i="i" act="pick-hardware-cat" type="hardware" />
      <NewCatCard act="new-cat" type="hardware" label="دسته جدید" :i="cats.length" />
    </div>
  </div>

  <!-- زیردسته‌ها -->
  <div v-else-if="!ui.hardwareSub" class="card" style="--d:0">
    <Crumbs :list="[{ label: 'همه دسته‌ها', act: 'back-hardware-cat', icon: 'home' }, { label: ui.hardwareCat, current: true }]" />
    <SecHead icon="layers" :title="`زیردسته‌های «${ui.hardwareCat}»`" :count="subs.length">
      <button class="btn amber sm" data-act="new-sub" data-type="hardware">
        <span v-html="ico('plus', 14)"></span> زیردسته جدید
      </button>
    </SecHead>
    <div class="card-grid">
      <CatCard v-for="(s, i) in subs" :key="s" :name="s" sub
               :count="store.data.hardware.filter(x => x.category === ui.hardwareCat && x.sub === s).length"
               unit-label="ردیف" :i="i" act="pick-hardware-sub" type="hardware" :cat="ui.hardwareCat" />
      <NewCatCard act="new-sub" type="hardware" label="زیردسته جدید" :i="subs.length" />
    </div>
  </div>

  <!-- لیست یراق -->
  <div v-else class="card" style="--d:0">
    <Crumbs :list="[
      { label: 'همه دسته‌ها', act: 'back-hardware-cat', icon: 'home' },
      { label: ui.hardwareCat, act: 'back-hardware-sub' },
      { label: ui.hardwareSub, current: true }
    ]" />
    <SecHead icon="bolt" :title="`اقلام «${ui.hardwareSub}»`" :count="list.length">
      <button class="btn amber sm" data-act="new-hw-in-sub" :data-cat="ui.hardwareCat" :data-sub="ui.hardwareSub">
        <span v-html="ico('plus', 14)"></span> یراق جدید
      </button>
    </SecHead>

    <div v-if="list.length" class="item-list">
      <div v-for="(h, i) in list" :key="h.id" class="item-row" :style="{ '--i': i }">
        <div class="item-row-name">
          {{ h.sub }}
          <small v-if="h.note">{{ h.note }}</small>
        </div>
        <div class="item-row-qty">{{ fmt(h.qty) }} {{ h.unit === 'pack' ? 'بسته' : 'عدد' }}</div>
        <div class="item-row-actions no-print">
          <button class="btn sm" data-act="hw-edit" :data-id="h.id" title="ویرایش" v-html="ico('pencil', 14)"></button>
          <button class="btn sm dan" data-act="del" data-type="hardware" :data-id="h.id" title="حذف" v-html="ico('trash', 14)"></button>
        </div>
      </div>
    </div>
    <EmptyBox v-else msg="یراقی در این زیردسته ثبت نشده." />
  </div>
</template>
