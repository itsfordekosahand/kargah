<script setup>
import { computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt } from '../../utils/format.js'
import { importStats } from '../../management/backup.js'

const store = useAnbarStore()
const m = store.modal
const stats = computed(() => importStats(m.pendingImport || {}))
const total = computed(() => stats.value.tools + stats.value.sheets + stats.value.hardware + stats.value.templates + stats.value.jobs)

function setMode(mode) { m.importMode = mode }
function apply() {
  if (!m.pendingImport) { store.closeModal(); return }
  if (store.applyImport(m.pendingImport, m.importMode)) store.closeModal()
}
</script>

<template>
  <div class="modal-body">
    <div class="hint" style="padding:10px 12px;background:var(--card2);border:1px solid var(--line);border-radius:10px">
      <b style="color:var(--txt)">{{ m.importFileName || 'backup.json' }}</b>
      <div style="margin-top:4px">
        {{ fmt(stats.tools) }} ابزار • {{ fmt(stats.sheets) }} ورق • {{ fmt(stats.hardware) }} یراق •
        {{ fmt(stats.templates) }} قالب • {{ fmt(stats.jobs) }} کار
        <br>مجموع: {{ fmt(total) }} رکورد
      </div>
    </div>

    <div class="sec-title" style="margin-top:16px">حالت بازیابی:</div>

    <label class="imp-option" :class="{ selected: m.importMode === 'merge' }" data-imp-mode="merge" @click="setMode('merge')">
      <input type="radio" name="impMode" value="merge" :checked="m.importMode === 'merge'">
      <div class="imp-option-body">
        <b><span v-html="ico('merge', 15)"></span> ادغام با داده‌های فعلی</b>
        <div class="hint">رکوردها اضافه می‌شوند. رکوردهای با شناسه تکراری به‌روزرسانی می‌شوند.</div>
      </div>
    </label>

    <label class="imp-option" :class="{ selected: m.importMode === 'replace' }" data-imp-mode="replace" @click="setMode('replace')">
      <input type="radio" name="impMode" value="replace" :checked="m.importMode === 'replace'">
      <div class="imp-option-body">
        <b><span v-html="ico('replace', 15)"></span> جایگزینی کامل</b>
        <div class="hint" style="color:var(--dan-fg)">هشدار: تمام داده‌های فعلی پاک و با فایل جایگزین می‌شوند.</div>
      </div>
    </label>
  </div>

  <div class="modal-foot">
    <button class="btn pri" data-modal="do-import" @click="apply"><span v-html="ico('check', 15)"></span> اعمال</button>
    <button class="btn" @click="store.closeModal()">انصراف</button>
  </div>
</template>
