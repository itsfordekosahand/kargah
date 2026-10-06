<script setup>
import { ref, computed, nextTick } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt, esc, uniq } from '../../utils/format.js'

const store = useAnbarStore()
const w = computed(() => store.modal.wizard)

const showNewCat = ref(false)
const showNewSub = ref(false)
const newCatVal = ref('')
const newSubVal = ref('')

const items = computed(() => {
  const ww = w.value
  if (!ww) return []
  return ww.type === 'sheet' ? store.data.sheets : store.data.hardware
})
const cats = computed(() =>
  store.uniq(items.value.map(x => x.category)).sort((a, b) => a.localeCompare(b, 'fa')))
const subs = computed(() => {
  const ww = w.value
  return store.uniq(items.value.filter(x => x.category === ww.category).map(x => x.sub))
    .sort((a, b) => a.localeCompare(b, 'fa'))
})

function countCat(c) { return items.value.filter(x => x.category === c).length }
function countSub(s) { return items.value.filter(x => x.category === w.value.category && x.sub === s).length }

function stepStyle(n) {
  const s = w.value ? w.value.step : 0
  const base = 'padding:5px 12px;border-radius:20px;font-weight:600;'
  const idle = base + 'background:var(--card2);color:var(--mut);border:1px solid var(--line)'
  const on = base + 'background:var(--pri);color:var(--accent-fg);border:1px solid var(--pri)'
  if (n === 1) return s === 1 ? on : idle
  if (n === 2) {
    if (s === 2) return on
    if (s > 2) return base + 'background:var(--ok-bg);color:var(--ok-fg);border:1px solid color-mix(in srgb,var(--ok) 40%,var(--line))'
    return idle
  }
  return s === 3 ? on : idle
}

function onCancel() { store.closeModal() }
function onBack() { w.value.step = Math.max(1, w.value.step - 1) }
function onNext() {
  const ww = w.value
  if (!ww.category) { store.toast('دسته را انتخاب کنید', 'warn'); return }
  if (!ww.sub) { store.toast('زیردسته را انتخاب کنید', 'warn'); return }
  ww.step = 3
}
function onPickCat(v) { w.value.category = v; w.value.step = 2 }
function onNewCat() {
  showNewCat.value = true
  newCatVal.value = ''
  nextTick(() => document.getElementById('newCatInput')?.focus())
}
function onConfirmNewCat() {
  const v = newCatVal.value.trim()
  if (!v) { store.toast('نام دسته را وارد کنید', 'warn'); return }
  w.value.category = v
  w.value.step = 2
}
function onPickSub(v) { w.value.sub = v; w.value.step = 3 }
function onNewSub() {
  showNewSub.value = true
  newSubVal.value = ''
  nextTick(() => document.getElementById('newSubInput')?.focus())
}
function onConfirmNewSub() {
  const v = newSubVal.value.trim()
  if (!v) { store.toast('نام زیردسته را وارد کنید', 'warn'); return }
  w.value.sub = v
  w.value.step = 3
}
function onCatKey(e) { if (e.key === 'Enter') { e.preventDefault(); onConfirmNewCat() } }
function onSubKey(e) { if (e.key === 'Enter') { e.preventDefault(); onConfirmNewSub() } }

function onSave() {
  const el = document.getElementById('wizForm')
  if (!el || !el.reportValidity()) return
  const g = k => ((el.elements[k] ? el.elements[k].value : '') + '').trim()
  const form = {
    width: g('width'), length: g('length'), qty: g('qty'), note: g('note'),
    title: g('title'), unit: g('unit'), packSize: g('packSize')
  }
  const res = store.saveWizard(form)
  if (res === true) store.closeModal()
}
</script>

<template>
  <div class="modal-body" v-if="w">
    <div class="wizard-steps" style="display:flex;gap:6px;margin-bottom:16px;font-size:12px;flex-wrap:wrap">
      <div :style="stepStyle(1)">۱. دسته</div>
      <div :style="stepStyle(2)">۲. زیردسته</div>
      <div :style="stepStyle(3)">۳. مشخصات</div>
    </div>

    <!-- مرحله ۱: دسته -->
    <template v-if="w.step === 1">
      <div class="hint" style="margin-bottom:12px">یک دسته انتخاب کنید:</div>
      <div class="card-grid">
        <button v-for="(c, i) in cats" :key="c" type="button" class="cat-card" :style="{ '--i': i }"
                data-w="pick-cat" :data-val="esc(c)" @click="onPickCat(c)">
          <span class="cat-name"><span v-html="ico('folder', 15)"></span> {{ c }}</span>
          <span class="cat-count">{{ fmt(countCat(c)) }} ردیف</span>
        </button>
        <button type="button" class="cat-card new" :style="{ '--i': cats.length }"
                data-w="new-cat" @click="onNewCat">
          <span class="cat-name"><span v-html="ico('plus', 18)"></span> دسته جدید</span>
        </button>
      </div>
      <div v-if="showNewCat" id="newCatBox" style="margin-top:14px;animation:slideDown .3s ease both">
        <label>نام دسته جدید *</label>
        <div class="row">
          <input id="newCatInput" v-model="newCatVal" data-w-input="newCat"
                 placeholder="مثلا MDF" style="flex:1;min-width:0" @keydown="onCatKey">
          <button type="button" class="btn pri" data-w="confirm-new-cat" @click="onConfirmNewCat">
            <span v-html="ico('check', 14)"></span> تأیید
          </button>
        </div>
      </div>
    </template>

    <!-- مرحله ۲: زیردسته -->
    <template v-else-if="w.step === 2">
      <div class="chips-row">
        <span class="chip"><span v-html="ico('folder', 13)"></span> {{ w.category }}</span>
        <button type="button" class="chip"
                style="background:var(--card2);color:var(--mut);cursor:pointer;border:1px solid var(--line);font-family:inherit"
                data-w="back" @click="onBack">
          <span v-html="ico('swap', 12)"></span> تغییر
        </button>
      </div>
      <div class="hint" style="margin-bottom:12px">زیردسته را انتخاب کنید:</div>
      <div class="card-grid">
        <button v-for="(s, i) in subs" :key="s" type="button" class="cat-card" :style="{ '--i': i }"
                data-w="pick-sub" :data-val="esc(s)" @click="onPickSub(s)">
          <span class="cat-name"><span v-html="ico('layers', 15)"></span> {{ s }}</span>
          <span class="cat-count">{{ fmt(countSub(s)) }} ردیف</span>
        </button>
        <button type="button" class="cat-card new" :style="{ '--i': subs.length }"
                data-w="new-sub" @click="onNewSub">
          <span class="cat-name"><span v-html="ico('plus', 18)"></span> زیردسته جدید</span>
        </button>
      </div>
      <div v-if="showNewSub" id="newSubBox" style="margin-top:14px;animation:slideDown .3s ease both">
        <label>نام زیردسته جدید *</label>
        <div class="row">
          <input id="newSubInput" v-model="newSubVal" placeholder="مثلا روکش‌دار" style="flex:1;min-width:0" @keydown="onSubKey">
          <button type="button" class="btn pri" data-w="confirm-new-sub" @click="onConfirmNewSub">
            <span v-html="ico('check', 14)"></span> تأیید
          </button>
        </div>
      </div>
    </template>

    <!-- مرحله ۳: مشخصات -->
    <template v-else>
      <div class="chips-row">
        <span class="chip"><span v-html="ico('folder', 13)"></span> {{ w.category }}</span>
        <span v-if="w.sub" class="chip"><span v-html="ico('layers', 13)"></span> {{ w.sub }}</span>
      </div>

      <form v-if="w.type === 'sheet'" id="wizForm" class="grid">
        <div><label>عرض (cm) *</label><input name="width" type="number" step="0.1" min="0" required
               :value="w.data.width != null ? w.data.width : ''"></div>
        <div><label>طول (cm) *</label><input name="length" type="number" step="0.1" min="0" required
               :value="w.data.length != null ? w.data.length : ''"></div>
        <div><label>تعداد *</label><input name="qty" type="number" step="1" min="0" required
               :value="w.data.qty != null ? w.data.qty : ''"></div>
        <div style="grid-column:1/-1"><label>توضیح</label><input name="note" :value="w.data.note || ''"></div>
      </form>

      <form v-else id="wizForm" class="grid">
        <div style="grid-column:1/-1"><label>شرح قلم *</label>
          <input name="title" required placeholder="مثلا پیچ ام‌دی‌اف ۴×۱۶"
                 :value="w.data.title != null ? (w.data.title || '') : ''"></div>
        <div><label>تعداد *</label><input name="qty" type="number" step="1" min="0" required
               :value="w.data.qty != null ? w.data.qty : ''"></div>
        <div><label>واحد</label>
          <select name="unit">
            <option value="piece" :selected="w.data.unit !== 'pack'">عدد</option>
            <option value="pack" :selected="w.data.unit === 'pack'">بسته</option>
          </select>
        </div>
        <div><label>تعداد در هر بسته</label><input name="packSize" type="number" min="1" step="1"
               :value="w.data.packSize != null ? w.data.packSize : ''"></div>
        <div style="grid-column:1/-1"><label>توضیح</label><input name="note" :value="w.data.note || ''"></div>
      </form>
    </template>
  </div>

  <div class="modal-foot" v-if="w">
    <template v-if="w.step === 1">
      <button class="btn" data-w="cancel" @click="onCancel">انصراف</button>
    </template>
    <template v-else-if="w.step === 2">
      <button class="btn pri" data-w="next" @click="onNext">مرحله بعد <span v-html="ico('arrowL', 14)"></span></button>
      <button class="btn" data-w="back" @click="onBack"><span v-html="ico('arrowR', 14)"></span> قبلی</button>
      <button class="btn" data-w="cancel" @click="onCancel">انصراف</button>
    </template>
    <template v-else>
      <button class="btn pri" data-w="save" @click="onSave"><span v-html="ico('check', 15)"></span> {{ w.editId ? 'ذخیره' : 'ثبت' }}</button>
      <button class="btn" data-w="back" @click="onBack"><span v-html="ico('arrowR', 14)"></span> قبلی</button>
      <button class="btn" data-w="cancel" @click="onCancel">انصراف</button>
    </template>
  </div>
</template>
