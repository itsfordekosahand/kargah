<script setup>
import { computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt } from '../../utils/format.js'
import SecHead from '../components/SecHead.vue'
import EmptyBox from '../components/EmptyBox.vue'

const props = defineProps({ job: { type: Object, required: true } })
const store = useAnbarStore()

const items = computed(() => props.job.items || [])
const pending = computed(() => items.value.filter(i => !i.returned))
const done = computed(() => items.value.filter(i => i.returned))
const progress = computed(() => items.value.length ? Math.round((done.value.length / items.value.length) * 100) : 0)

function onToggle(e, it) {
  store.toggleReturn(props.job.id, it.id, e.target.checked)
}
function printJob() { window.print() }
</script>

<template>
  <div class="row no-print" style="margin-bottom:12px">
    <button class="btn" data-act="close-job-view"><span v-html="ico('arrowR', 15)"></span> بازگشت</button>
    <button class="btn" @click="printJob"><span v-html="ico('print', 15)"></span> چاپ</button>
  </div>

  <div class="card" style="--d:0">
    <div class="job-title" :class="{ closed: job.closed }" style="font-size:17px">
      <span v-html="ico(job.closed ? 'lock' : 'unlock', 20)"></span> {{ job.name }}
    </div>
    <div class="job-meta" style="margin-top:8px">
      <span><span v-html="ico('clock', 13)"></span> تاریخ شروع: {{ job.date }}</span>
      <span><span v-html="ico('tool', 13)"></span> {{ fmt(items.length) }} قلم</span>
    </div>

    <div v-if="items.length" style="margin-top:14px">
      <div class="row" style="justify-content:space-between;font-size:12.5px;color:var(--mut)">
        <span>پیشرفت تحویل</span>
        <span>
          <b :style="{ color: done.length === items.length ? 'var(--ok-fg)' : 'var(--warn-fg)' }">
            {{ fmt(done.length) }} / {{ fmt(items.length) }}
          </b>
        </span>
      </div>
      <div style="height:8px;background:var(--card2);border-radius:20px;overflow:hidden;margin-top:6px">
        <div class="job-detail-progress" :style="{ width: progress + '%' }"
             style="height:100%;background:linear-gradient(90deg,var(--pri),var(--purple));border-radius:20px;transition:width .4s ease"></div>
      </div>
    </div>
  </div>

  <div class="card" style="--d:1">
    <SecHead icon="listChecks" title="چک‌لیست تحویل ابزارها">
      <button v-if="pending.length" class="btn sm ok no-print" data-act="return-all" :data-id="job.id">
        <span v-html="ico('checkC', 14)"></span> تحویل همه
      </button>
    </SecHead>

    <div v-if="items.length" class="return-list">
      <label v-for="(it, i) in items" :key="it.id" class="return-row" :class="{ returned: it.returned }" :style="{ '--i': i }">
        <input type="checkbox" class="return-cb" :checked="it.returned" :disabled="job.closed"
               @change="onToggle($event, it)">
        <span class="return-name">
          {{ store.toolOf(it.toolId) ? store.toolOf(it.toolId).name : '(حذف‌شده)' }}
          <small>تعداد {{ fmt(it.qty) }} • خروج: {{ it.outAt || '—' }}{{ it.inAt ? ' • ورود: ' + it.inAt : '' }}</small>
        </span>
        <span class="return-qty">
          <span v-if="it.returned" class="badge ok">تحویل شد</span>
          <span v-else class="badge warn">در امانت</span>
        </span>
      </label>
    </div>
    <EmptyBox v-else msg="ابزاری برای این کار ثبت نشده" />
  </div>

  <div class="card no-print" style="--d:2">
    <div class="row" style="justify-content:space-between">
      <button v-if="!job.closed" class="btn" :class="pending.length ? 'warn' : 'ok'" data-act="job-close" :data-id="job.id">
        <span v-html="ico(pending.length ? 'lock' : 'checkC', 15)"></span>
        {{ pending.length ? 'پایان کار با ' + fmt(pending.length) + ' ابزار تحویل‌نشده' : 'پایان کار' }}
      </button>
      <button v-else class="btn warn" data-act="job-reopen" :data-id="job.id">
        <span v-html="ico('unlock', 15)"></span> بازکردن مجدد کار
      </button>
      <button class="btn dan" data-act="del" data-type="job" :data-id="job.id">
        <span v-html="ico('trash', 15)"></span> حذف کار
      </button>
    </div>
  </div>
</template>
