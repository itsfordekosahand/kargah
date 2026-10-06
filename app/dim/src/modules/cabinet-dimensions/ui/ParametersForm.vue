<template>
  <div class="cd-form-grid">
    <div class="cd-field">
      <label class="cd-field__label">عرض کل (سانتی‌متر)</label>
      <InputNumber v-model="local.width" :min="20" :max="500" :step="1" show-buttons :use-grouping="false" @update:model-value="schedule" />
      <span class="cd-field__hint">مقدار اصلی ورودی محاسبه</span>
    </div>

    <div class="cd-field">
      <label class="cd-field__label">ارتفاع (سانتی‌متر)</label>
      <InputNumber v-model="local.height" :min="10" :max="400" :step="1" show-buttons :use-grouping="false" @update:model-value="schedule" />
      <span class="cd-field__hint">پیش‌فرض از قالب: {{ formatNumber(defaults.height || 0) }}</span>
    </div>

    <div class="cd-field">
      <label class="cd-field__label">عمق (سانتی‌متر)</label>
      <InputNumber v-model="local.depth" :min="10" :max="200" :step="1" show-buttons :use-grouping="false" @update:model-value="schedule" />
      <span class="cd-field__hint">پیش‌فرض از قالب: {{ formatNumber(defaults.depth || 0) }}</span>
    </div>

    <div class="cd-field">
      <label class="cd-field__label">ضخامت MDF (سانتی‌متر)</label>
      <InputNumber
        :model-value="mdfThickness"
        :min="0.4" :max="5" :step="0.1" :min-fraction-digits="1" :max-fraction-digits="2"
        show-buttons @update:model-value="(v) => $emit('update-constant', { key: 'mdfThickness', value: v })"
      />
      <span class="cd-field__hint">پیش‌فرض از ثابتهای کارگاه</span>
    </div>

    <div class="cd-field">
      <label class="cd-field__label">تعداد در</label>
      <div class="cd-number-buttons">
        <Button
          v-for="n in doorOptions"
          :key="n"
          :label="toPersianDigits(n)"
          size="small"
          :severity="local.doors === n ? 'primary' : 'secondary'"
          :outlined="local.doors !== n"
          @click="setDoors(n)"
        />
      </div>
    </div>

    <div class="cd-field">
      <label class="cd-field__label">تعداد طبقه</label>
      <InputNumber v-model="local.shelves" :min="0" :max="30" show-buttons :use-grouping="false" @update:model-value="schedule" />
      <span class="cd-field__hint">پیش‌فرض از قالب: {{ toPersianDigits(defaults.shelves ?? 1) }}</span>
    </div>

    <div class="cd-field" style="grid-column: 1 / -1">
      <label class="cd-field__label">گزینه‌ها</label>
      <div class="cd-checks">
        <label class="cd-check"><Checkbox v-model="local.options.pvcDoor" binary @update:model-value="schedule" /> PVC روی در</label>
        <label class="cd-check"><Checkbox v-model="local.options.pvcBody" binary @update:model-value="schedule" /> PVC روی بدنه</label>
        <label class="cd-check"><Checkbox v-model="local.options.pvcShelf" binary @update:model-value="schedule" /> PVC روی طبقه</label>
        <label class="cd-check"><Checkbox v-model="local.options.grooveBack" binary @update:model-value="schedule" /> شیار پشت</label>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, onUnmounted } from 'vue'
import InputNumber from 'primevue/inputnumber'
import Checkbox from 'primevue/checkbox'
import Button from 'primevue/button'
import { debounce } from '../utils/timing.js'
import { toPersianDigits, formatNumber } from '../utils/formatters.js'

const props = defineProps({
  params: { type: Object, required: true },
  options: { type: Object, required: true },
  defaults: { type: Object, default: () => ({}) },
  mdfThickness: { type: Number, default: 1.6 }
})
const emit = defineEmits(['update:params', 'update:options', 'update-constant'])

const doorOptions = [1, 2, 3, 4, 5, 6]

const local = reactive({
  width: props.params.width,
  height: props.params.height,
  depth: props.params.depth,
  doors: props.params.doors,
  shelves: props.params.shelves,
  options: { ...props.options }
})

const push = () => {
  emit('update:params', {
    width: Number(local.width),
    height: Number(local.height),
    depth: Number(local.depth),
    doors: Number(local.doors),
    shelves: Number(local.shelves)
  })
  emit('update:options', { ...local.options })
}

const schedule = debounce(push, 200)

function setDoors(n) {
  local.doors = n
  schedule()
}

// اگر قالب/پارامتر از بیرون عوض شد، فرم همگام می‌شود
watch(() => [props.params, props.options], () => {
  local.width = props.params.width
  local.height = props.params.height
  local.depth = props.params.depth
  local.doors = props.params.doors
  local.shelves = props.params.shelves
  local.options = { ...props.options }
}, { deep: true })

watch(() => props.defaults, () => { /* فقط برای نمایش پیش‌فرضها */ }, { deep: true })

onUnmounted(() => schedule.cancel())
</script>
