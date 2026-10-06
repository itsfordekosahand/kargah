<template>
  <div class="jdp-wrap" ref="wrapRef">
    <input
      type="text"
      readonly
      class="form-input jdp-input"
      :value="displayText"
      :placeholder="placeholder || 'انتخاب تاریخ'"
      @click="open = !open"
    />
    <div v-if="open" class="jdp-popup">
      <div class="jdp-nav">
        <button type="button" @click="nextMonth"><AppIcon name="arrowRight" /></button>
        <span>{{ monthNames[viewJM - 1] }} {{ viewJY }}</span>
        <button type="button" @click="prevMonth"><AppIcon name="arrowLeft" /></button>
      </div>
      <div class="jdp-grid">
        <div v-for="(d, i) in weekDays" :key="'h' + i" class="jdp-head">{{ d }}</div>
        <template v-for="(d, i) in days" :key="d === null ? 'e' + i : 'd' + d">
          <div v-if="d === null" class="jdp-cell empty"></div>
          <div
            v-else
            class="jdp-cell"
            :class="{ selected: isSelected(d), today: isToday(d) }"
            @click="selectDay(d)"
          >{{ d }}</div>
        </template>
      </div>
      <div class="jdp-actions">
        <button type="button" class="jdp-today" @click="selectToday">امروز</button>
        <button v-if="value" type="button" class="jdp-clear" @click="clear">پاک کردن</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { JalaliDate, daysInJMonth } from '../../core/jalali.js'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  value: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})
const emit = defineEmits(['update:value', 'change'])

const open = ref(false)
const wrapRef = ref(null)
const t = JalaliDate.today()

function jOf(v) {
  if (!v) return null
  const d = new Date(v)
  return JalaliDate.gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

const initJ = jOf(props.value) || t
const viewJY = ref(initJ.jy)
const viewJM = ref(initJ.jm)

const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const weekDays = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج']

watch(() => props.value, (v) => {
  if (!v) return
  const j = jOf(v)
  if (!j) return
  viewJY.value = j.jy
  viewJM.value = j.jm
})

function onDocMouseDown(e) {
  if (wrapRef.value && !wrapRef.value.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocMouseDown))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocMouseDown))

const selectedJ = computed(() => jOf(props.value))

const totalDays = computed(() => daysInJMonth(viewJY.value, viewJM.value))
const days = computed(() => {
  const firstDayG = JalaliDate.jalaliToGregorian(viewJY.value, viewJM.value, 1)
  const firstDayJsDate = new Date(firstDayG.gy, firstDayG.gm - 1, firstDayG.gd)
  const startDow = (firstDayJsDate.getDay() + 1) % 7
  const arr = []
  for (let i = 0; i < startDow; i++) arr.push(null)
  for (let d = 1; d <= totalDays.value; d++) arr.push(d)
  return arr
})

function prevMonth() {
  if (viewJM.value === 1) { viewJM.value = 12; viewJY.value = viewJY.value - 1 } else viewJM.value = viewJM.value - 1
}
function nextMonth() {
  if (viewJM.value === 12) { viewJM.value = 1; viewJY.value = viewJY.value + 1 } else viewJM.value = viewJM.value + 1
}
function pick(gy, gm, gd) {
  emit('update:value', JalaliDate.toISO(gy, gm, gd))
  emit('change', JalaliDate.toISO(gy, gm, gd))
  open.value = false
}
function selectDay(d) {
  const g = JalaliDate.jalaliToGregorian(viewJY.value, viewJM.value, d)
  pick(g.gy, g.gm, g.gd)
}
function selectToday() {
  const g = JalaliDate.jalaliToGregorian(t.jy, t.jm, t.jd)
  pick(g.gy, g.gm, g.gd)
}
function clear() {
  emit('update:value', '')
  emit('change', '')
  open.value = false
}
function isSelected(d) {
  const s = selectedJ.value
  return !!(s && s.jy === viewJY.value && s.jm === viewJM.value && s.jd === d)
}
function isToday(d) {
  return d === t.jd && viewJM.value === t.jm && viewJY.value === t.jy
}

const displayText = computed(() => {
  const s = selectedJ.value
  return s ? JalaliDate.toString(s.jy, s.jm, s.jd) : ''
})
</script>
