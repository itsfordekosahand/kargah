<template>
  <div>
    <div class="page-header with-action">
      <div><h2>مدیریت بدهی‌ها</h2><p>بدهی‌های پرداخت نشده ({{ getUnitLabel(unit) }})</p></div>
      <button class="btn btn-accent" @click="openAdd"><AppIcon name="plus" /><span class="btn-label-desktop"> بدهی جدید</span><span class="btn-label-mobile">افزودن</span></button>
    </div>

    <div class="stats-grid cols-3">
      <div class="stat-card red"><div class="stat-label">کل بدهی پرداخت نشده</div><div class="stat-value" style="color:var(--danger);font-size:22px">{{ formatMoney(totalUnpaid) }} {{ getUnitLabel(unit) }}</div><div class="stat-words">{{ moneyWords(totalUnpaid, unit) }}</div></div>
      <div class="stat-card green"><div class="stat-label">پرداخت شده</div><div class="stat-value" style="color:var(--success);font-size:22px">{{ formatMoney(totalPaid) }} {{ getUnitLabel(unit) }}</div><div class="stat-words">{{ moneyWords(totalPaid, unit) }}</div></div>
      <div class="stat-card blue"><div class="stat-label">تعداد کل</div><div class="stat-value" style="color:var(--info);font-size:22px">{{ formatMoney(data.debts.length) }} مورد</div></div>
    </div>

    <div class="tab-bar">
      <div v-for="t in tabs" :key="t.k" class="tab-item" :class="{ active: filter === t.k }" @click="filter = t.k">{{ t.l }}</div>
    </div>

    <div class="card">
      <div v-if="filtered.length === 0" class="empty-state"><p>بدهی ثبت نشده</p></div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>نام</th><th>مبلغ</th><th>توضیحات</th><th>وضعیت</th><th></th></tr></thead>
          <tbody>
            <tr v-for="de in filtered" :key="de.id">
              <td style="fontWeight:600">{{ de.name }}</td>
              <td>
                <div style="color:var(--accent);fontWeight:600">{{ formatMoney(de.amount) }} {{ getUnitLabel(unit) }}</div>
                <div class="money-inline-words">{{ numberToPersianWords(de.amount) }} {{ getUnitLabel(unit) }}</div>
              </td>
              <td style="color:var(--text-secondary);fontSize:12px">{{ de.notes || '-' }}</td>
              <td><span v-if="de.paid" class="badge paid">پرداخت شده</span><span v-else class="badge unpaid">پرداخت نشده</span></td>
              <td>
                <div style="display:flex;gap:6px">
                  <button v-if="!de.paid" class="btn btn-success btn-sm" @click="markPaid(de)">پرداخت شد</button>
                  <button v-if="de.paid" class="btn btn-outline btn-sm" @click="markUnpaid(de)">بازگشت</button>
                  <button class="btn-icon btn-icon-sm" @click="startEdit(de)">✏️</button>
                  <button class="btn-icon btn-icon-sm" @click="deleteDebt(de)"><AppIcon name="trash" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showAdd || editItem" :title="editItem ? 'ویرایش بدهی' : 'ثبت بدهی جدید'" @close="closeAdd">
      <div class="form-grid">
        <div class="form-group full"><label class="form-label">نام بدهی</label><input class="form-input" v-model="form.name" /></div>
        <div class="form-group full"><label class="form-label">مبلغ ({{ getUnitLabel(unit) }})</label>
          <input class="form-input" type="number" v-model="form.amount" />
          <div v-if="form.amount" class="money-inline-words" style="marginTop:4px">{{ numberToPersianWords(parseInt(form.amount)) }} {{ getUnitLabel(unit) }}</div>
        </div>
        <div class="form-group full"><label class="form-label">توضیحات</label><input class="form-input" v-model="form.notes" /></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-accent" @click="editItem ? updateDebt() : addDebt()"><AppIcon name="check" /> {{ editItem ? 'ذخیره' : 'ثبت' }}</button>
        <button class="btn btn-outline" @click="closeAdd">انصراف</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../components/Modal.vue'
import AppIcon from '../components/AppIcon.vue'
import { recordTx } from '../../core/finance.js'
import { genId, todayISO, formatMoney, moneyWords, getUnitLabel, numberToPersianWords } from '../../config/units.js'
import { useMaldiStore } from '../../store/maldi-store.js'

const store = useMaldiStore()
const data = computed(() => store.data)
const unit = computed(() => data.value.settings?.unit || 'toman')

const showAdd = ref(false)
const editItem = ref(null)
const filter = ref('all')
const blankForm = () => ({ name: '', amount: '', notes: '' })
const form = ref(blankForm())

const tabs = [{ k: 'all', l: 'همه' }, { k: 'unpaid', l: 'پرداخت نشده' }, { k: 'paid', l: 'پرداخت شده' }]

function closeAdd() { showAdd.value = false; editItem.value = null }
function openAdd() { form.value = blankForm(); editItem.value = null; showAdd.value = true }

function addDebt() {
  if (!form.value.name || !form.value.amount) { store.toast('لطفاً نام و مبلغ را پر کنید'); return }
  const newDebt = { id: genId(), name: form.value.name, amount: parseInt(form.value.amount), notes: form.value.notes, paid: false, paidDate: null, createdDate: todayISO() }
  store.setData(d => recordTx({ ...d, debts: [...d.debts, newDebt] }, { type: 'debt_add', title: 'بدهی جدید: ' + newDebt.name, amount: newDebt.amount }))
  form.value = blankForm()
  showAdd.value = false
  store.toast('بدهی ثبت شد')
}

function updateDebt() {
  if (!form.value.name || !form.value.amount) { store.toast('لطفاً نام و مبلغ را پر کنید'); return }
  store.setData(d => recordTx({ ...d, debts: d.debts.map(de => de.id === editItem.value.id ? { ...de, name: form.value.name, amount: parseInt(form.value.amount), notes: form.value.notes } : de) }, { type: 'debt_edit', title: 'ویرایش بدهی: ' + form.value.name, amount: parseInt(form.value.amount) }))
  form.value = blankForm()
  editItem.value = null
  showAdd.value = false
  store.toast('بروزرسانی شد')
}

function markPaid(de) {
  store.setData(d => recordTx({ ...d, debts: d.debts.map(x => x.id === de.id ? { ...x, paid: true, paidDate: todayISO() } : x) }, { type: 'debt_pay', title: 'پرداخت بدهی: ' + de.name, amount: de.amount }))
  store.toast('ثبت شد')
}

function markUnpaid(de) {
  store.setData(d => recordTx({ ...d, debts: d.debts.map(x => x.id === de.id ? { ...x, paid: false, paidDate: null } : x) }, { type: 'debt_unpay', title: 'لغو پرداخت: ' + de.name, amount: de.amount }))
  store.toast('بازگشت')
}

function deleteDebt(de) {
  if (!confirm('حذف شود؟')) return
  store.setData(d => recordTx({ ...d, debts: d.debts.filter(x => x.id !== de.id) }, { type: 'debt_delete', title: 'حذف بدهی: ' + de.name, amount: de.amount }))
  store.toast('حذف شد')
}

function startEdit(de) {
  form.value = { name: de.name, amount: de.amount.toString(), notes: de.notes || '' }
  editItem.value = de
  showAdd.value = true
}

const filtered = computed(() => filter.value === 'all' ? data.value.debts : filter.value === 'unpaid' ? data.value.debts.filter(d => !d.paid) : data.value.debts.filter(d => d.paid))
const totalUnpaid = computed(() => data.value.debts.filter(d => !d.paid).reduce((s, d) => s + d.amount, 0))
const totalPaid = computed(() => data.value.debts.filter(d => d.paid).reduce((s, d) => s + d.amount, 0))
</script>
