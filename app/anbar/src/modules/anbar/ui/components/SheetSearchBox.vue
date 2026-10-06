<script setup>
import { computed, reactive } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt, num } from '../../utils/format.js'
import { searchSheets } from '../../core/sheet-search.js'

const store = useAnbarStore()
const ui = store.ui
const results = computed(() => (ui.sq ? searchSheets(store.data.sheets, ui.sq) : []))

const form = reactive({ W: '', L: '', mode: 'near', tol: '25' })
if (ui.sq) {
  form.W = ui.sq.W; form.L = ui.sq.L
  form.mode = ui.sq.mode || 'near'; form.tol = ui.sq.tol
}
function onSubmit() {
  store.runSheetSearch({ W: form.W, L: form.L, mode: form.mode, tol: form.tol })
}
</script>

<template>
  <div class="srch-box">
    <form data-form="sheet-search" @submit.prevent="onSubmit">
      <div class="grid">
        <div><label>عرض مورد نیاز (cm) *</label><input v-model="form.W" name="W" type="number" step="0.1" required></div>
        <div><label>طول مورد نیاز (cm) *</label><input v-model="form.L" name="L" type="number" step="0.1" required></div>
        <div>
          <label>حالت</label>
          <select v-model="form.mode" name="mode">
            <option value="near">نزدیک‌ترین ابعاد</option>
            <option value="exact">فقط دقیق</option>
          </select>
        </div>
        <div><label>حد تحمل (%)</label><input v-model="form.tol" name="tol" type="number" min="1" max="100"></div>
      </div>
      <div class="row" style="margin-top:12px">
        <button class="btn pri sm" type="submit"><span v-html="ico('search', 14)"></span> جستجو</button>
        <button v-if="ui.sq" type="button" class="btn sm" data-act="clear-sheet-search"><span v-html="ico('x', 14)"></span> پاک</button>
        <button type="button" class="btn sm" data-act="toggle-sheet-search">بستن</button>
      </div>
    </form>

    <div id="sheetResults">
      <template v-if="ui.sq">
        <div v-if="!results.length" class="empty">
          <span v-html="ico('inbox', 42)"></span><div>موردی یافت نشد. حد تحمل را بیشتر کنید.</div>
        </div>
        <template v-else>
          <div class="sec-title">{{ results.length }} پیشنهاد</div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>وضعیت</th><th>دسته</th><th>زیردسته</th><th>ابعاد</th><th>موجودی</th></tr></thead>
              <tbody>
                <tr v-for="(r, i) in results" :key="r.id" :style="{ '--i': i }">
                  <td>
                    <span v-if="r.exact" class="badge ok">دقیق</span>
                    <span v-else-if="r.fits" class="badge warn">قابل برش</span>
                    <span v-else class="badge mut">نزدیک</span>
                  </td>
                  <td class="wrap"><b>{{ r.category }}</b></td>
                  <td class="wrap">{{ r.sub || '—' }}</td>
                  <td>{{ fmt(r.width) }} × {{ fmt(r.length) }}</td>
                  <td><span class="badge" :class="num(r.qty) <= 2 ? 'warn' : 'ok'">{{ fmt(r.qty) }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>
