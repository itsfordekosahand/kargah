<template>
  <div class="card" style="marginTop:20px">
    <div class="card-header"><span class="card-title" style="display:flex;alignItems:center;gap:8px"><AppIcon name="calendar" /> تقویم شمسی</span></div>
    <div class="month-selector">
      <button @click="prevMonth" type="button"><AppIcon name="arrowLeft" /></button>
      <span>{{ monthNames[viewJM - 1] }} {{ viewJY }}</span>
      <button @click="nextMonth" type="button"><AppIcon name="arrowRight" /></button>
    </div>
    <div class="calendar-grid">
      <div v-for="d in weekDays" :key="d" class="calendar-header-cell">{{ d }}</div>
      <div v-for="(d, i) in days" :key="d === null ? 'e' + i : d" class="calendar-day" :class="{ empty: d === null, today: d !== null && isToday(d) }" @click="d !== null && toggleDay(d)">
        <template v-if="d !== null">
          <div class="calendar-day-num">{{ d }}</div>
          <div v-for="(ev, idx) in eventsFor(d).slice(0, 3)" :key="idx" class="calendar-event" :class="ev.type">{{ ev.name }}</div>
          <div v-if="eventsFor(d).length > 3" style="fontSize:9px;color:var(--text-muted)">+{{ eventsFor(d).length - 3 }}</div>
        </template>
      </div>
    </div>
    <div class="calendar-legend">
      <div class="calendar-legend-item"><div class="calendar-legend-dot" style="background:var(--info)"></div>هزینه</div>
      <div class="calendar-legend-item"><div class="calendar-legend-dot" style="background:var(--warning)"></div>چک منتظر</div>
      <div class="calendar-legend-item"><div class="calendar-legend-dot" style="background:var(--success)"></div>نقد شده</div>
      <div class="calendar-legend-item"><div class="calendar-legend-dot" style="background:#14B8A6"></div>منتقل شده</div>
    </div>

    <div v-if="selectedDay" style="marginTop:16px;padding:14px;background:var(--surface-2);borderRadius:8px;border:1px solid var(--border)">
      <div style="fontWeight:600;marginBottom:8px;fontSize:14px;color:#fff">روز {{ selectedDay }} {{ monthNames[viewJM - 1] }} {{ viewJY }}</div>
      <p v-if="eventsFor(selectedDay).length === 0" style="fontSize:13px;color:var(--text-muted)">موردی ثبت نشده</p>
      <div v-for="(ev, idx) in eventsFor(selectedDay)" :key="idx" style="display:flex;justifyContent:space-between;alignItems:center;padding:8px 12px;background:var(--surface);borderRadius:6px;marginBottom:4px;fontSize:13px;gap:10px;border:1px solid var(--border)">
        <span style="minWidth:0;overflow:hidden;textOverflow:ellipsis;whiteSpace:nowrap;color:#fff">{{ ev.name }}</span>
        <span style="fontWeight:600;whiteSpace:nowrap;color:var(--accent)">{{ displayMoney(ev.amount, unit) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppIcon from './AppIcon.vue'
import { JalaliDate, daysInJMonth, effectiveDueDay } from '../../core/jalali.js'
import { displayMoney } from '../../config/units.js'

const props = defineProps({ data: { type: Object, required: true } })

const unit = computed(() => props.data.settings?.unit || 'toman')
const today = JalaliDate.today()
const viewJY = ref(today.jy)
const viewJM = ref(today.jm)
const selectedDay = ref(null)
const monthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']
const weekDays = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه']

function nextMonth() { if (viewJM.value === 12) { viewJM.value = 1; viewJY.value = viewJY.value + 1 } else viewJM.value = viewJM.value + 1; selectedDay.value = null }
function prevMonth() { if (viewJM.value === 1) { viewJM.value = 12; viewJY.value = viewJY.value - 1 } else viewJM.value = viewJM.value - 1; selectedDay.value = null }

const totalDays = computed(() => daysInJMonth(viewJY.value, viewJM.value))
const days = computed(() => {
  const firstDayG = JalaliDate.jalaliToGregorian(viewJY.value, viewJM.value, 1)
  const firstDayJsDate = new Date(firstDayG.gy, firstDayG.gm - 1, firstDayG.gd)
  const startDow = (firstDayJsDate.getDay() + 1) % 7
  const out = []
  for (let i = 0; i < startDow; i++) out.push(null)
  for (let d = 1; d <= totalDays.value; d++) out.push(d)
  return out
})

function isToday(d) { return d === today.jd && viewJM.value === today.jm && viewJY.value === today.jy }
function toggleDay(d) { selectedDay.value = selectedDay.value === d ? null : d }

function eventsFor(jd) {
  const events = []
  props.data.expenses.filter(e => e.isRecurring && effectiveDueDay(e.dueDay, viewJY.value, viewJM.value) === jd).forEach(ex => {
    const k = ex.id + '_' + viewJY.value + '_' + viewJM.value
    events.push({ type: props.data.paidRecord.expenses[k] ? 'expense-paid' : 'expense', name: ex.name, amount: ex.amount })
  })
  props.data.checks.forEach(ch => {
    const chG = new Date(ch.dueDate)
    const chJ = JalaliDate.gregorianToJalali(chG.getFullYear(), chG.getMonth() + 1, chG.getDate())
    if (chJ.jy === viewJY.value && chJ.jm === viewJM.value && chJ.jd === jd) {
      let type = 'check-pending'
      if (ch.status === 'cashed') type = 'check-paid'
      else if (ch.status === 'transferred') type = 'check-transferred'
      events.push({ type, name: ch.payerName, amount: ch.amount })
    }
  })
  return events
}
</script>
