<script setup>
import { computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt, fmtInt, num } from '../../utils/format.js'
import SecHead from '../components/SecHead.vue'

const store = useAnbarStore()
const s = computed(() => store.stats)
</script>

<template>
  <div class="kpis">
    <button type="button" class="kpi" style="--d:0;cursor:pointer" data-act="nav-tools">
      <div class="kpi-head"><span v-html="ico('tool', 14)"></span><span>ابزار ثبتشده</span></div>
      <b>{{ fmt(store.data.tools.length) }}</b><small>در انبار کارگاه</small>
    </button>
    <button type="button" class="kpi" style="--d:1;cursor:pointer" data-act="nav-jobs">
      <div class="kpi-head"><span v-html="ico('playCircle', 14)"></span><span>کارهای باز</span></div>
      <b>{{ fmt(s.open.length) }}</b><small>{{ fmt(s.totalPending) }} ابزار در امانت</small>
    </button>
    <button type="button" class="kpi" style="--d:2;cursor:pointer" data-act="nav-sheets">
      <div class="kpi-head"><span v-html="ico('file', 14)"></span><span>انواع ورق</span></div>
      <b>{{ fmt(store.data.sheets.length) }}</b><small>{{ fmt(s.sheetQty) }} تخته موجود</small>
    </button>
    <button type="button" class="kpi" style="--d:3;cursor:pointer" data-act="nav-hardware">
      <div class="kpi-head"><span v-html="ico('bolt', 14)"></span><span>یراق و پیچ</span></div>
      <b>{{ fmt(store.data.hardware.length) }}</b><small>موجودی یراق‌آلات</small>
    </button>
    <button type="button" class="kpi" style="--d:4;cursor:pointer" data-act="nav-calc">
      <div class="kpi-head"><span v-html="ico('calc', 14)"></span><span>قالبهای محاسبه</span></div>
      <b>{{ fmt(store.data.templates.length) }}</b><small>جمع {{ fmtInt(s.tplTotal) }} تومان</small>
    </button>
  </div>

  <div v-if="s.open.length" class="card" style="--d:0">
    <SecHead icon="playCircle" title="کارهای در جریان" :count="s.open.length" />
    <div v-for="(j, i) in s.open.slice(0, 4)" :key="j.id" class="job-card" :style="{ '--i': i }">
      <div class="job-head">
        <div style="min-width:0;flex:1">
          <div class="job-title"><span v-html="ico('tool', 16)"></span> {{ j.name }}</div>
          <div class="job-meta">
            <span><span v-html="ico('clock', 13)"></span> {{ j.date }}</span>
            <span><span v-html="ico('tool', 13)"></span> {{ fmt(store.jobPendingCount(j)) }} ابزار تحویل‌نشده</span>
          </div>
        </div>
        <button class="btn sm pri no-print" data-act="open-job" :data-id="j.id">مشاهده</button>
      </div>
    </div>
  </div>

  <div v-if="s.lowSheets.length || s.outSheets.length" class="card" style="--d:1">
    <SecHead icon="alert" title="هشدار موجودی ورق" />
    <div class="table-wrap">
      <table>
        <thead><tr><th>دسته</th><th>زیردسته</th><th>ابعاد</th><th>تعداد</th></tr></thead>
        <tbody>
          <tr v-for="(sh, i) in [...s.outSheets, ...s.lowSheets]" :key="sh.id" :style="{ '--i': i }">
            <td class="wrap"><b>{{ sh.category }}</b></td>
            <td class="wrap">{{ sh.sub || '—' }}</td>
            <td>{{ fmt(sh.width) }} × {{ fmt(sh.length) }}</td>
            <td>
              <span v-if="num(sh.qty) <= 0" class="badge dan">تمام شد</span>
              <span v-else class="badge warn">{{ fmt(sh.qty) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
