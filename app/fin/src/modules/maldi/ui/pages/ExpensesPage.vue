<template>
  <div>
    <div class="page-header with-action">
      <div><h2>مدیریت هزینه‌ها</h2><p>هزینه‌های ثابت، متغیر و متفرقه ({{ getUnitLabel(unit) }})</p></div>
      <div style="display:flex;gap:8px;flexWrap:wrap">
        <button class="btn btn-outline" @click="showTemplates = true"><AppIcon name="template" /><span class="btn-label-desktop"> قالب‌ها</span></button>
        <button class="btn btn-accent" @click="openAdd"><AppIcon name="plus" /><span class="btn-label-desktop"> هزینه جدید</span><span class="btn-label-mobile">افزودن</span></button>
      </div>
    </div>

    <div class="tab-bar">
      <div v-for="t in tabs" :key="t.k" class="tab-item" :class="{ active: tab === t.k }" @click="tab = t.k">{{ t.l }}</div>
    </div>

    <div class="card">
      <div v-if="filtered.length === 0" class="empty-state"><p>هزینه‌ای ثبت نشده</p></div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>نام</th><th>مبلغ</th><th>روز سررسید</th><th>پرداخت این ماه</th><th>دسته</th><th>نوع</th><th></th></tr></thead>
          <tbody>
            <tr v-for="ex in sorted" :key="ex.id">
              <td style="fontWeight:600">{{ ex.name }}</td>
              <td>
                <div style="color:var(--accent);fontWeight:600">{{ formatMoney(ex.amount) }} <span style="fontWeight:400;fontSize:11px">{{ getUnitLabel(unit) }}</span></div>
                <div class="money-inline-words">{{ numberToPersianWords(ex.amount) }} {{ getUnitLabel(unit) }}</div>
              </td>
              <td>روز {{ ex.dueDay }}<span v-if="effDay(ex) !== ex.dueDay" style="fontSize:10px;color:var(--text-muted)"> ({{ effDay(ex) }})</span></td>
              <td>
                <div style="display:flex;gap:6px;alignItems:center;flexWrap:wrap">
                  <span v-if="isDueToday(ex)" class="badge partial">امروز</span>
                  <button
                    class="badge pay-btn"
                    :class="isPaid(ex) ? 'paid' : 'unpaid'"
                    @click="togglePaid(ex)"
                    :title="isPaid(ex) ? 'کلیک کنید تا به «پرداخت نشده» برگردد' : 'کلیک کنید تا پرداخت ثبت شود'"
                  >{{ isPaid(ex) ? '✓ پرداخت شده' : '✗ پرداخت نشده' }}</button>
                </div>
              </td>
              <td><span class="badge" :style="{ background: getCategoryColor(ex.category) + '22', color: getCategoryColor(ex.category) }">{{ getCategoryLabel(ex.category) }}</span></td>
              <td><span class="badge" :style="{ background: ex.isRecurring ? 'var(--accent-bg)' : 'var(--surface-3)', color: ex.isRecurring ? 'var(--accent)' : 'var(--text-secondary)' }">{{ ex.isRecurring ? 'تکرارشونده' : 'یکبار' }}</span></td>
              <td>
                <div style="display:flex;gap:6px">
                  <button class="btn-icon btn-icon-sm" @click="startEdit(ex)">✏️</button>
                  <button class="btn-icon btn-icon-sm" @click="deleteExpense(ex)"><AppIcon name="trash" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showAdd || editItem" :title="editItem ? 'ویرایش هزینه' : 'افزودن هزینه'" @close="closeAdd">
      <div class="form-grid">
        <div><label class="form-label">نام هزینه</label><input class="form-input" v-model="form.name" /></div>
        <div><label class="form-label">مبلغ ({{ getUnitLabel(unit) }})</label>
          <input class="form-input" type="number" v-model="form.amount" />
          <div v-if="form.amount" class="money-inline-words" style="marginTop:4px">{{ numberToPersianWords(parseInt(form.amount)) }} {{ getUnitLabel(unit) }}</div>
        </div>
        <div><label class="form-label">روز سررسید</label><input class="form-input" type="number" min="1" max="31" v-model="form.dueDay" /></div>
        <div><label class="form-label">دسته‌بندی</label>
          <select class="form-input" v-model="form.category">
            <option value="rent">اجاره</option><option value="salary">حقوق</option><option value="utility">قبوض</option><option value="misc">متفرقه</option>
          </select>
        </div>
        <div class="form-group full">
          <label style="display:flex;alignItems:center;gap:8px;cursor:pointer;fontSize:13px"><input type="checkbox" v-model="form.isRecurring" />تکرارشونده</label>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-accent" @click="editItem ? updateExpense() : addExpense()"><AppIcon name="check" /> {{ editItem ? 'ذخیره' : 'افزودن' }}</button>
        <button v-if="!editItem" class="btn btn-outline" @click="saveAsTemplate"><AppIcon name="template" /> ذخیره قالب</button>
        <button class="btn btn-outline" @click="closeAdd">انصراف</button>
      </div>
    </Modal>

    <Modal v-if="showTemplates" title="قالب‌های هزینه" @close="showTemplates = false">
      <div style="display:flex;flexDirection:column;gap:8px">
        <div v-for="tpl in data.expenseTemplates" :key="tpl.id" style="display:flex;justifyContent:space-between;alignItems:center;padding:10px 14px;background:var(--surface-2);borderRadius:8px;gap:10px;flexWrap:wrap;border:1px solid var(--border)">
          <div>
            <div style="fontWeight:600;fontSize:13px">{{ tpl.name }}</div>
            <div style="fontSize:11px;color:var(--text-muted)">روز {{ tpl.dueDay }} — {{ displayMoney(tpl.amount, unit) }}</div>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-accent btn-sm" @click="addTemplateAsExpense(tpl)">افزودن</button>
            <button class="btn-icon btn-icon-sm" @click="deleteTemplate(tpl)"><AppIcon name="trash" /></button>
          </div>
        </div>
      </div>
      <div class="modal-actions"><button class="btn btn-outline" @click="showTemplates = false">بستن</button></div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../components/Modal.vue'
import AppIcon from '../components/AppIcon.vue'
import { JalaliDate, effectiveDueDay } from '../../core/jalali.js'
import { recordTx, syncPaidFromAllocations } from '../../core/finance.js'
import { genId, formatMoney, displayMoney, getUnitLabel, numberToPersianWords, getCategoryLabel, getCategoryColor } from '../../config/units.js'
import { useMaldiStore } from '../../store/maldi-store.js'

const store = useMaldiStore()
const data = computed(() => store.data)
const unit = computed(() => data.value.settings?.unit || 'toman')

const showAdd = ref(false)
const showTemplates = ref(false)
const editItem = ref(null)
const tab = ref('all')
const blankForm = () => ({ name: '', amount: '', dueDay: '', category: 'misc', isRecurring: true })
const form = ref(blankForm())
const jToday = JalaliDate.today()

const tabs = [{ k: 'all', l: 'همه' }, { k: 'recurring', l: 'تکرارشونده' }, { k: 'onetime', l: 'یکبار' }]

function openAdd() { form.value = blankForm(); editItem.value = null; showAdd.value = true }
function closeAdd() { showAdd.value = false; editItem.value = null }

function addExpense() {
  if (!form.value.name || !form.value.amount || !form.value.dueDay) { store.toast('لطفاً تمام فیلدها را پر کنید'); return }
  const f = form.value
  const newEx = { id: genId(), name: f.name, amount: parseInt(f.amount), dueDay: parseInt(f.dueDay), category: f.category, isRecurring: f.isRecurring }
  store.setData(d => {
    const newData = { ...d, expenses: [...d.expenses, newEx] }
    newData.paidRecord = { ...newData.paidRecord, expenses: syncPaidFromAllocations(newData) }
    return recordTx(newData, { type: 'expense_add', title: 'هزینه جدید: ' + newEx.name, amount: newEx.amount })
  })
  form.value = blankForm()
  showAdd.value = false
  store.toast('هزینه اضافه شد')
}

function updateExpense() {
  const f = form.value
  if (!f.name || !f.amount || !f.dueDay) { store.toast('لطفاً تمام فیلدها را پر کنید'); return }
  store.setData(d => {
    const newData = { ...d, expenses: d.expenses.map(e => e.id === editItem.value.id ? { ...e, name: f.name, amount: parseInt(f.amount), dueDay: parseInt(f.dueDay), category: f.category, isRecurring: f.isRecurring } : e) }
    newData.paidRecord = { ...newData.paidRecord, expenses: syncPaidFromAllocations(newData) }
    return recordTx(newData, { type: 'expense_edit', title: 'ویرایش هزینه: ' + f.name, amount: parseInt(f.amount) })
  })
  form.value = blankForm()
  editItem.value = null
  store.toast('بروزرسانی شد')
}

function deleteExpense(ex) {
  if (!confirm('"' + ex.name + '" حذف شود؟')) return
  store.setData(d => {
    const newData = { ...d, expenses: d.expenses.filter(e => e.id !== ex.id), allocations: d.allocations.filter(a => a.expenseId !== ex.id) }
    newData.paidRecord = { ...newData.paidRecord, expenses: syncPaidFromAllocations(newData) }
    return recordTx(newData, { type: 'expense_delete', title: 'حذف هزینه: ' + ex.name, amount: ex.amount })
  })
  store.toast('حذف شد')
}

function startEdit(ex) {
  form.value = { name: ex.name, amount: ex.amount.toString(), dueDay: ex.dueDay.toString(), category: ex.category, isRecurring: ex.isRecurring }
  editItem.value = ex
  showAdd.value = true
}

function addTemplateAsExpense(t) {
  form.value = { name: t.name, amount: t.amount.toString(), dueDay: t.dueDay.toString(), category: t.category, isRecurring: true }
  showTemplates.value = false
  showAdd.value = true
}

function saveAsTemplate() {
  if (!form.value.name || !form.value.amount || !form.value.dueDay) { store.toast('لطفاً فیلدها را پر کنید'); return }
  const f = form.value
  store.setData(d => ({ ...d, expenseTemplates: [...d.expenseTemplates, { id: genId(), name: f.name, amount: parseInt(f.amount), dueDay: parseInt(f.dueDay), category: f.category }] }))
  store.toast('قالب ذخیره شد')
}

function deleteTemplate(tpl) {
  store.setData(d => ({ ...d, expenseTemplates: d.expenseTemplates.filter(t => t.id !== tpl.id) }))
}

function togglePaid(ex) {
  const k = ex.id + '_' + jToday.jy + '_' + jToday.jm
  store.setData(d => {
    const next = { ...d.paidRecord.expenses }
    const isPaid = !!next[k]
    let title, type
    if (isPaid) { delete next[k]; title = 'لغو پرداخت: ' + ex.name; type = 'expense_unpay' }
    else { next[k] = true; title = 'پرداخت: ' + ex.name; type = 'expense_pay' }
    const newData = { ...d, paidRecord: { ...d.paidRecord, expenses: next } }
    return recordTx(newData, { type, title, amount: ex.amount })
  })
  store.toast('ثبت شد')
}

const filtered = computed(() => tab.value === 'all' ? data.value.expenses : tab.value === 'recurring' ? data.value.expenses.filter(e => e.isRecurring) : data.value.expenses.filter(e => !e.isRecurring))
const sorted = computed(() => filtered.value.slice().sort((a, b) => a.dueDay - b.dueDay))

const paidKey = ex => ex.id + '_' + jToday.jy + '_' + jToday.jm
const isPaid = ex => !!data.value.paidRecord.expenses[paidKey(ex)]
const effDay = ex => effectiveDueDay(ex.dueDay, jToday.jy, jToday.jm)
const isDueToday = ex => effDay(ex) === jToday.jd
</script>
