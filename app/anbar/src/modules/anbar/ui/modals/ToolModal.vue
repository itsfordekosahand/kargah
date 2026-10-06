<script setup>
import { ref, computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { esc } from '../../utils/format.js'

const store = useAnbarStore()
const m = store.modal
const t = computed(() => (m.editId ? store.toolOf(m.editId) : null))

const name = ref(t.value ? t.value.name : '')
const category = ref(t.value ? t.value.category : (m.presetCat || ''))
const total = ref(t.value ? t.value.total : 1)
const note = ref(t.value ? (t.value.note || '') : '')
const cats = computed(() => store.uniq(store.data.tools.map(x => x.category)))

function submit() {
  const ok = store.saveTool(m.editId, { name: name.value, category: category.value, total: total.value, note: note.value })
  if (ok) store.closeModal()
}
</script>

<template>
  <form id="toolForm" class="modal-body grid" @submit.prevent="submit">
    <div style="grid-column:1/-1">
      <label>نام ابزار *</label>
      <input v-model="name" name="name" required placeholder="مثلا فرز انگشتی">
    </div>
    <div style="grid-column:1/-1">
      <label>دسته *</label>
      <input v-model="category" name="category" list="toolCats" required placeholder="برقی / دستی">
      <datalist id="toolCats">
        <option v-for="c in cats" :key="c" :value="esc(c)"></option>
      </datalist>
    </div>
    <div>
      <label>تعداد *</label>
      <input v-model="total" name="total" type="number" min="0" step="1" required>
    </div>
    <div style="grid-column:1/-1">
      <label>توضیح</label>
      <input v-model="note" name="note">
    </div>
  </form>

  <div class="modal-foot">
    <button class="btn pri" type="submit" form="toolForm">
      <span v-html="ico(t ? 'check' : 'plus', 15)"></span> {{ t ? 'ذخیره' : 'افزودن' }}
    </button>
    <button class="btn" @click="store.closeModal()">انصراف</button>
  </div>
</template>
