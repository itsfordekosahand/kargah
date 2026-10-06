<script setup>
import { computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import ToolModal from './ToolModal.vue'
import WizardModal from './WizardModal.vue'
import StartJobModal from './StartJobModal.vue'
import ItemModal from './ItemModal.vue'
import ImportModal from './ImportModal.vue'

const store = useAnbarStore()
const KINDS = { tool: ToolModal, wizard: WizardModal, startJob: StartJobModal, item: ItemModal, import: ImportModal }

const kind = computed(() => store.modal.kind)
const comp = computed(() => KINDS[kind.value] || null)
const meta = computed(() => {
  const m = store.modal
  if (m.kind === 'tool') return { icon: 'tool', title: m.editId ? 'ویرایش ابزار' : 'افزودن ابزار جدید' }
  if (m.kind === 'wizard') {
    const tn = m.wizard && m.wizard.type === 'sheet' ? 'ورق' : 'یراق'
    return { icon: m.wizard && m.wizard.type === 'sheet' ? 'file' : 'bolt', title: (m.wizard && m.wizard.editId ? 'ویرایش ' : 'افزودن ') + tn }
  }
  if (m.kind === 'startJob') return { icon: 'playCircle', title: 'شروع کار جدید' }
  if (m.kind === 'item') return { icon: 'receipt', title: m.item && m.item.itemId ? 'ویرایش قلم' : 'افزودن قلم به فاکتور' }
  if (m.kind === 'import') return { icon: 'up', title: 'بازیابی از فایل پشتیبان' }
  return { icon: 'info', title: '' }
})
</script>

<template>
  <div id="modal" class="modal" :class="{ show: !!kind }" role="dialog" aria-modal="true"
       @click.self="store.closeModal()">
    <div class="modal-box">
      <div class="modal-head">
        <span class="modal-title">
          <span v-html="ico(meta.icon, 18)"></span><span>{{ meta.title }}</span>
        </span>
        <button class="x" aria-label="بستن" @click="store.closeModal()">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <component :is="comp" v-if="comp" />
    </div>
  </div>
</template>
