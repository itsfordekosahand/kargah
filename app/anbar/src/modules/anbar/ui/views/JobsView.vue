<script setup>
import { computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt } from '../../utils/format.js'
import SecHead from '../components/SecHead.vue'
import EmptyBox from '../components/EmptyBox.vue'
import JobDetailView from './JobDetailView.vue'

const store = useAnbarStore()
const ui = store.ui

const filter = computed(() => ui.jobFilter || 'open')
const list = computed(() =>
  filter.value === 'open' ? store.jobsOpen(store.data.jobs)
    : filter.value === 'closed' ? store.jobsClosed(store.data.jobs)
      : store.data.jobs)
const activeJob = computed(() => (ui.openJob ? store.jobOf(ui.openJob) : null))
</script>

<template>
  <JobDetailView v-if="activeJob" :job="activeJob" />

  <div v-else class="card" style="--d:0">
    <SecHead icon="playCircle" title="کارها" :count="list.length">
      <button class="btn sm" :class="{ pri: filter === 'open' }" data-act="job-filter" data-val="open">
        <span v-html="ico('play', 13)"></span> باز ({{ fmt(store.jobsOpen(store.data.jobs).length) }})
      </button>
      <button class="btn sm" :class="{ pri: filter === 'closed' }" data-act="job-filter" data-val="closed">
        <span v-html="ico('lock', 13)"></span> بسته ({{ fmt(store.jobsClosed(store.data.jobs).length) }})
      </button>
      <button class="btn sm" :class="{ pri: filter === 'all' }" data-act="job-filter" data-val="all">
        <span v-html="ico('layers', 13)"></span> همه ({{ fmt(store.data.jobs.length) }})
      </button>
    </SecHead>

    <button class="btn amber lg" data-act="start-job" style="width:100%;margin-bottom:14px">
      <span v-html="ico('playCircle', 20)"></span> شروع کار جدید
    </button>

    <div v-if="list.length">
      <div v-for="(j, i) in list" :key="j.id" class="job-card" :class="{ closed: j.closed }" :style="{ '--i': i }">
        <div class="job-head">
          <div style="min-width:0;flex:1">
            <div class="job-title" :class="{ closed: j.closed }">
              <span v-html="ico(j.closed ? 'lock' : 'unlock', 16)"></span> {{ j.name }}
            </div>
            <div class="job-meta">
              <span><span v-html="ico('clock', 13)"></span> {{ j.date }}</span>
              <span>
                <span v-html="ico('tool', 13)"></span> {{ fmt((j.items || []).length) }} قلم
                <span v-if="store.jobPendingCount(j)" class="badge warn" style="margin-inline-start:5px">
                  {{ fmt(store.jobPendingCount(j)) }} تحویل‌نشده
                </span>
                <span v-else-if="(j.items || []).length" class="badge ok" style="margin-inline-start:5px">همه تحویل شد</span>
              </span>
            </div>
          </div>
          <div class="job-actions no-print">
            <button class="btn sm" :class="{ pri: !j.closed }" data-act="open-job" :data-id="j.id">
              <span v-html="ico(j.closed ? 'info' : 'listChecks', 14)"></span>
              {{ j.closed ? 'مشاهده' : 'ادامه / پایان' }}
            </button>
            <button class="btn sm dan" data-act="del" data-type="job" :data-id="j.id" title="حذف" v-html="ico('trash', 14)"></button>
          </div>
        </div>
      </div>
    </div>
    <EmptyBox v-else msg="کاری ثبت نشده. با دکمه «شروع کار جدید» آغاز کنید." />
  </div>
</template>
