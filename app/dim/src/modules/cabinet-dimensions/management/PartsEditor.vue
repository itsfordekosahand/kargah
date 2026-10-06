<template>
  <div style="display: flex; flex-direction: column; gap: 10px">
    <div v-for="(part, idx) in parts" :key="part.id" class="cd-part-card" :class="{ 'cd-part-card--open': openId === part.id }">
      <div class="cd-part-card__main">
        <input v-model="part.name" class="p-inputtext" placeholder="نام قطعه" @input="sync" />
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
          <span class="cd-part-card__meta">جنس:</span>
          <Select v-model="part.material" :options="materials" option-label="label" option-value="key" class="cd-part-card__select" @update:model-value="sync" />
          <label class="cd-check"><Checkbox v-model="part.pvc" binary @update:model-value="sync" /> PVC</label>
          <label class="cd-check"><Checkbox v-model="part.groove" binary @update:model-value="sync" /> شیار</label>
        </div>
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
          <span class="cd-part-card__meta">تعداد:</span>
          <Select v-model="part.quantity.type" :options="qtyTypes" option-label="label" option-value="key" class="cd-part-card__select" @update:model-value="sync" />
          <InputNumber
            v-if="part.quantity.type === 'constant'"
            v-model="part.quantity.value" :min="0" :max="999" show-buttons :use-grouping="false" style="width: 120px"
            @update:model-value="sync"
          />
          <Select
            v-else-if="part.quantity.type === 'equal'"
            v-model="part.quantity.source"
            :options="variableKeys"
            option-label="label"
            option-value="key"
            class="cd-part-card__select cd-part-card__select--wide"
            @update:model-value="sync"
          />
          <input
            v-else
            v-model="part.quantity.expression"
            class="p-inputtext cd-part-card__expr"
            dir="ltr"
            placeholder="مثلاً shelves + 1"
            @input="sync"
          />
        </div>
      </div>

      <div class="cd-part-card__meta cd-part-card__rules">
        <div>طول: <code dir="ltr">{{ describeRule(part.length) }}</code></div>
        <div>عرض: <code dir="ltr">{{ describeRule(part.width) }}</code></div>
        <div v-if="openId === part.id" style="margin-top: 6px">
          <RuleBadge :rule-type="part.length?.type" /> <RuleBadge :rule-type="part.width?.type" />
        </div>
      </div>

      <div class="cd-part-card__actions no-print">
        <Button
          :label="openId === part.id ? 'بستن قواعد' : 'ویرایش قواعد'"
          icon="pi pi-wrench"
          size="small"
          :severity="openId === part.id ? 'primary' : 'secondary'"
          :outlined="openId !== part.id"
          @click="openId = openId === part.id ? null : part.id"
        />
        <Button icon="pi pi-arrow-up" size="small" severity="secondary" text :disabled="idx === 0" @click="move(idx, -1)" title="بالا" />
        <Button icon="pi pi-arrow-down" size="small" severity="secondary" text :disabled="idx === parts.length - 1" @click="move(idx, 1)" title="پایین" />
        <Button icon="pi pi-trash" size="small" severity="danger" text @click="remove(part.id)" title="حذف" />
      </div>

      <div v-if="openId === part.id" style="width: 100%; display: flex; flex-direction: column; gap: 12px">
        <RuleEditor
          :rule="part.length"
          :title="`${part.name} — قاعده طول`"
          :params="params"
          :constants="constants"
          @update:rule="(r) => setRule(part.id, 'length', r)"
        />
        <RuleEditor
          :rule="part.width"
          :title="`${part.name} — قاعده عرض`"
          :params="params"
          :constants="constants"
          @update:rule="(r) => setRule(part.id, 'width', r)"
        />
      </div>
    </div>

    <div class="cd-toolbar cd-toolbar--end">
      <Button label="افزودن قطعه" icon="pi pi-plus" size="small" @click="add" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Select from 'primevue/select'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import RuleEditor from './RuleEditor.vue'
import RuleBadge from '../ui/components/RuleBadge.vue'
import { MATERIALS } from '../core/constants.js'
import { describeRule } from '../core/calculator.js'
import { variableOptions } from '../config/variables.js'
import { uid } from '../config/defaults.js'

const props = defineProps({
  parts: { type: Array, required: true },
  params: { type: Object, default: () => ({ width: 100, height: 71, depth: 58, doors: 2, shelves: 1 }) },
  constants: { type: Object, default: () => ({}) }
})
const emit = defineEmits(['update:parts'])

const openId = ref(null)

const materials = Object.values(MATERIALS).map((m) => ({ key: m.key, label: m.label }))
const qtyTypes = [
  { key: 'constant', label: 'ثابت' },
  { key: 'equal', label: 'مساوی متغیر' },
  { key: 'formula', label: 'فرمول' }
]
const variableKeys = variableOptions(props.constants).map((v) => ({ key: v.key, label: v.label }))

function sync() {
  emit('update:parts', props.parts)
}

function setRule(partId, dim, rule) {
  const part = props.parts.find((p) => p.id === partId)
  if (!part) return
  part[dim] = rule
  sync()
}

function move(idx, dir) {
  const list = [...props.parts]
  const target = idx + dir
  if (target < 0 || target >= list.length) return
  ;[list[idx], list[target]] = [list[target], list[idx]]
  emit('update:parts', list.map((p, i) => ({ ...p, order: i })))
}

function remove(partId) {
  emit('update:parts', props.parts.filter((p) => p.id !== partId).map((p, i) => ({ ...p, order: i })))
  if (openId.value === partId) openId.value = null
}

function add() {
  const list = [
    ...props.parts,
    {
      id: uid('part'),
      name: 'قطعه جدید',
      material: 'mdf',
      pvc: false,
      groove: false,
      quantity: { type: 'constant', value: 1 },
      length: { type: 'constant', value: 50 },
      width: { type: 'constant', value: 30 },
      order: props.parts.length
    }
  ]
  emit('update:parts', list)
}
</script>
