<script setup>
import { ref, reactive, computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt, num } from '../../utils/format.js'

const store = useAnbarStore()
const name = ref('')
const search = ref('')
const sel = reactive({}) // id -> { on, qty }

const avail = computed(() => store.data.tools.filter(t => num(t.total) > 0))
const rows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return avail.value
  return avail.value.filter(t => (t.name + ' ' + (t.category || '')).toLowerCase().includes(q))
})
const selCount = computed(() => avail.value.filter(t => sel[t.id] && sel[t.id].on).length)

function st(id) {
  if (!sel[id]) sel[id] = { on: false, qty: 1 }
  return sel[id]
}
function availOf(t) { return store.toolAvail(store.data.jobs, t) }
function onToggle(t, e) {
  const s = st(t.id)
  s.on = e.target.checked
  if (s.on) {
    const av = availOf(t)
    if (num(s.qty) < 1) s.qty = 1
    if (num(s.qty) > av) s.qty = av
  }
}
function confirmStart() {
  const jobName = name.value.trim()
  if (!jobName) { store.toast('نام کار را وارد کنید', 'warn'); return }
  const picked = []
  for (const t of avail.value) {
    const s = sel[t.id]
    if (!s || !s.on) continue
    const qty = num(s.qty)
    const av = availOf(t)
    if (qty <= 0 || qty > av) {
      store.toast(`تعداد «${t.name}» نامعتبر است (موجود: ${fmt(av)})`, 'dan')
      return
    }
    picked.push({ id: t.id, qty })
  }
  if (!picked.length) { store.toast('حداقل یک ابزار انتخاب کنید', 'warn'); return }
  store.createJob(jobName, picked)
  store.closeModal()
}
</script>

<template>
  <div class="modal-body">
    <div>
      <label>نام کار *</label>
      <input id="startJobName" v-model="name" required placeholder="مثلا کابینت آشپزخانه آقای رضایی">
    </div>

    <div style="margin-top:14px">
      <label>جستجوی سریع ابزار</label>
      <input id="startSearch" v-model="search" placeholder="نام ابزار..." autocomplete="off">
    </div>

    <div class="hint" style="margin-top:12px;display:flex;justify-content:space-between;align-items:center">
      <span>ابزارهای موردنیاز را تیک بزنید:</span>
      <span id="startSelCount" style="font-weight:700;color:var(--pri)">{{ fmt(selCount) }} انتخاب شده</span>
    </div>

    <div class="tool-pick-list" id="startList">
      <label v-for="t in rows" :key="t.id" class="tool-pick-row"
             :class="{ checked: sel[t.id] && sel[t.id].on }"
             :data-name="(t.name + ' ' + (t.category || '')).toLowerCase()">
        <input type="checkbox" class="start-cb" :checked="sel[t.id] && sel[t.id].on"
               @change="onToggle(t, $event)">
        <span class="tool-pick-info">
          <b>{{ t.name }}</b>
          <span class="hint">{{ t.category || 'بدون دسته' }} • موجود: {{ fmt(availOf(t)) }}</span>
        </span>
        <input type="number" class="tool-pick-qty" :value="st(t.id).qty" :max="availOf(t)"
               min="1" :disabled="!(sel[t.id] && sel[t.id].on)"
               @input="st(t.id).qty = num($event.target.value)">
      </label>
    </div>
  </div>

  <div class="modal-foot">
    <button class="btn pri" data-modal="confirm-start" @click="confirmStart">
      <span v-html="ico('check', 15)"></span> شروع کار
    </button>
    <button class="btn" @click="store.closeModal()">انصراف</button>
  </div>
</template>
