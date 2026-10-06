<template>
  <div>
    <div class="page-header with-action">
      <div><h2>مدیریت چک‌ها</h2><p>ثبت، نقد، انتقال و مدیریت چک‌ها ({{ getUnitLabel(unit) }})</p></div>
      <button class="btn btn-accent" @click="openAdd"><AppIcon name="plus" /><span class="btn-label-desktop"> چک جدید</span><span class="btn-label-mobile">افزودن</span></button>
    </div>

    <div class="tab-bar">
      <div v-for="t in tabs" :key="t.k" class="tab-item" :class="{ active: filter === t.k }" @click="filter = t.k">{{ t.l }}</div>
    </div>

    <div class="card">
      <div v-if="filtered.length === 0" class="empty-state"><p>چکی ثبت نشده</p></div>
      <div v-else class="table-wrap">
        <table>
          <thead><tr><th>صاحب چک</th><th>مبلغ</th><th>سررسید</th><th>وضعیت</th><th>عملیات</th></tr></thead>
          <tbody>
            <tr v-for="ch in sorted" :key="ch.id">
              <td>
                <div class="cell-name">{{ ch.payerName }}</div>
                <div v-if="ch.notes" class="cell-note">📝 {{ ch.notes }}</div>
                <div v-if="ch.status === 'transferred' && ch.transferredTo" class="cell-note" style="color:var(--info)">👤 {{ ch.transferredTo }}</div>
                <div v-if="ch.status === 'transferred' && ch.transferNote" class="cell-note">📝 {{ ch.transferNote }}</div>
              </td>
              <td>
                <div style="color:var(--accent);fontWeight:600">{{ formatMoney(ch.amount) }} <span style="fontWeight:400;fontSize:11px">{{ getUnitLabel(unit) }}</span></div>
                <div class="money-inline-words">{{ numberToPersianWords(ch.amount) }} {{ getUnitLabel(unit) }}</div>
              </td>
              <td style="fontWeight:500">{{ JalaliDate.formatGregorian(ch.dueDate) }}</td>
              <td><span class="badge" :class="ch.status">{{ statusLabel(ch) }}</span></td>
              <td>
                <div style="display:flex;gap:6px;flexWrap:wrap">
                  <button v-if="ch.status === 'pending'" class="btn btn-success btn-sm" @click="cashCheck(ch)">نقد کردن</button>
                  <button v-if="ch.status === 'pending'" class="btn btn-info btn-sm" @click="transferItem = ch"><AppIcon name="transfer" /> انتقال</button>
                  <button v-if="ch.status === 'pending'" class="btn btn-danger btn-sm" @click="bounceCheck(ch)">برگشتی</button>
                  <button v-if="ch.status === 'cashed'" class="btn btn-outline btn-sm" @click="showAlloc = ch">تخصیص‌ها</button>
                  <button v-if="ch.status === 'cashed' || ch.status === 'transferred'" class="btn btn-outline btn-sm" @click="revertToPending(ch)"><AppIcon name="revert" /> برگشت به انتظار</button>
                  <button class="btn-icon btn-icon-sm" @click="startEdit(ch)" title="ویرایش">✏️</button>
                  <button class="btn-icon btn-icon-sm" @click="deleteCheck(ch)" title="حذف"><AppIcon name="trash" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal v-if="showAdd || editItem" :title="editItem ? 'ویرایش چک' : 'ثبت چک جدید'" @close="closeModal">
      <div class="form-grid">
        <div><label class="form-label">نام صاحب چک</label><input class="form-input" v-model="form.payerName" placeholder="مثال: علی محمدی" /></div>
        <div><label class="form-label">مبلغ ({{ getUnitLabel(unit) }})</label>
          <input class="form-input" type="number" v-model="form.amount" placeholder="75" />
          <div v-if="form.amount" class="money-inline-words" style="marginTop:4px">{{ numberToPersianWords(parseInt(form.amount)) }} {{ getUnitLabel(unit) }}</div>
        </div>
        <div><label class="form-label">تاریخ سررسید</label><JalaliDatePicker :value="form.dueDate" @update:value="v => (form.dueDate = v)" /></div>
        <div><label class="form-label">تاریخ صدور</label><JalaliDatePicker :value="form.issueDate" @update:value="v => (form.issueDate = v)" /></div>
        <div class="form-group full"><label class="form-label">توضیحات</label><input class="form-input" v-model="form.notes" placeholder="اختیاری" /></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-accent" @click="editItem ? updateCheck() : addCheck()"><AppIcon name="check" /> {{ editItem ? 'ذخیره' : 'ثبت چک' }}</button>
        <button class="btn btn-outline" @click="closeModal">انصراف</button>
      </div>
    </Modal>

    <TransferModal v-if="transferItem" :check="transferItem" :data="data" @save="info => transferCheck(transferItem, info)" @close="transferItem = null" />

    <Modal v-if="showAlloc" :title="'تخصیص‌های چک ' + showAlloc.payerName" @close="showAlloc = null">
      <div style="background:var(--surface-2);borderRadius:8px;padding:12px;marginBottom:14px;fontSize:12px;color:var(--text-secondary)">
        <div>مبلغ چک: <strong style="color:var(--accent)">{{ displayMoney(showAlloc.amount, unit) }}</strong></div>
        <div v-if="showAlloc.notes" style="marginTop:6px">📝 {{ showAlloc.notes }}</div>
      </div>
      <p v-if="getAllocsFor(showAlloc).length === 0" style="color:var(--text-secondary);fontSize:14px">هنوز تخصیصی نشده</p>
      <div v-else class="allocation-items">
        <div v-for="a in getAllocsFor(showAlloc)" :key="a.id" class="allocation-item">
          <span>{{ expenseName(a.expenseId) }}</span>
          <span style="fontWeight:600;color:var(--accent)">{{ formatMoney(a.amount) }} {{ getUnitLabel(unit) }}</span>
        </div>
      </div>
      <div class="modal-actions"><button class="btn btn-outline" @click="showAlloc = null">بستن</button></div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../components/Modal.vue'
import AppIcon from '../components/AppIcon.vue'
import JalaliDatePicker from '../components/JalaliDatePicker.vue'
import TransferModal from '../../management/TransferModal.vue'
import { JalaliDate } from '../../core/jalali.js'
import { recordTx, syncPaidFromAllocations } from '../../core/finance.js'
import { genId, todayISO, formatMoney, moneyWords, displayMoney, getUnitLabel, numberToPersianWords } from '../../config/units.js'
import { useMaldiStore } from '../../store/maldi-store.js'

const store = useMaldiStore()
const data = computed(() => store.data)
const unit = computed(() => data.value.settings?.unit || 'toman')

const showAdd = ref(false)
const editItem = ref(null)
const showAlloc = ref(null)
const transferItem = ref(null)
const filter = ref('all')
const blankForm = () => ({ payerName: '', amount: '', dueDate: '', issueDate: todayISO(), notes: '' })
const form = ref(blankForm())
const resetForm = () => { form.value = blankForm() }
const closeModal = () => { showAdd.value = false; editItem.value = null; resetForm() }
const openAdd = () => { showAdd.value = true }

const tabs = [
  { k: 'all', l: 'همه' },
  { k: 'pending', l: 'منتظر پاس' },
  { k: 'cashed', l: 'نقد شده' },
  { k: 'transferred', l: 'منتقل شده' },
  { k: 'bounced', l: 'برگشتی' }
]
function statusLabel(ch) {
  return ch.status === 'pending' ? 'منتظر پاس' : ch.status === 'cashed' ? 'نقد شده' : ch.status === 'transferred' ? 'منتقل شده' : 'برگشتی'
}

function addCheck() {
  const f = form.value
  if (!f.payerName || !f.amount || !f.dueDate) { store.toast('لطفاً تمام فیلدها را پر کنید'); return }
  const newCheck = { id: genId(), payerName: f.payerName, amount: parseInt(f.amount), dueDate: f.dueDate, issueDate: f.issueDate, notes: f.notes, status: 'pending', cashedDate: null }
  store.setData(d => recordTx({ ...d, checks: [...d.checks, newCheck] }, { type: 'check_add', title: 'چک جدید: ' + newCheck.payerName, amount: newCheck.amount }))
  resetForm()
  showAdd.value = false
  store.toast('چک ثبت شد')
}

function updateCheck() {
  const f = form.value
  if (!f.payerName || !f.amount || !f.dueDate) { store.toast('لطفاً تمام فیلدها را پر کنید'); return }
  store.setData(d => recordTx({
    ...d,
    checks: d.checks.map(c => c.id === editItem.value.id ? { ...c, payerName: f.payerName, amount: parseInt(f.amount), dueDate: f.dueDate, issueDate: f.issueDate, notes: f.notes } : c)
  }, { type: 'check_edit', title: 'ویرایش چک: ' + f.payerName, amount: parseInt(f.amount) }))
  closeModal()
  store.toast('چک ویرایش شد')
}

function startEdit(ch) {
  form.value = { payerName: ch.payerName, amount: ch.amount.toString(), dueDate: ch.dueDate, issueDate: ch.issueDate || todayISO(), notes: ch.notes || '' }
  editItem.value = ch
  showAdd.value = true
}

function cashCheck(ch) {
  store.setData(d => recordTx({ ...d, checks: d.checks.map(c => c.id === ch.id ? { ...c, status: 'cashed', cashedDate: todayISO() } : c) }, { type: 'check_cash', title: 'نقد چک ' + ch.payerName, amount: ch.amount }))
  store.toast('چک ' + ch.payerName + ' نقد شد')
}

function bounceCheck(ch) {
  store.setData(d => recordTx({ ...d, checks: d.checks.map(c => c.id === ch.id ? { ...c, status: 'bounced' } : c) }, { type: 'check_bounce', title: 'چک برگشتی ' + ch.payerName, amount: ch.amount }))
  store.toast('چک ' + ch.payerName + ' برگشتی')
}

function transferCheck(ch, info) {
  store.setData(d => {
    const newData = { ...d, checks: d.checks.map(c => c.id === ch.id ? { ...c, status: 'transferred', transferredTo: info.transferredTo, transferNote: info.transferNote, transferDate: info.transferDate } : c) }
    return recordTx(newData, { type: 'check_transfer', title: 'انتقال چک ' + ch.payerName + ' به ' + info.transferredTo, amount: ch.amount, meta: { recipient: info.transferredTo, note: info.transferNote } })
  })
  transferItem.value = null
  store.toast('چک به ' + info.transferredTo + ' منتقل شد')
}

function revertToPending(ch) {
  if (!confirm('چک ' + ch.payerName + ' به حالت «منتظر پاس» برگردد؟')) return
  store.setData(d => {
    const newData = { ...d, checks: d.checks.map(c => c.id === ch.id ? { ...c, status: 'pending', cashedDate: null, transferredTo: null, transferNote: null, transferDate: null } : c) }
    return recordTx(newData, { type: 'check_revert', title: 'برگشت به انتظار: ' + ch.payerName, amount: ch.amount })
  })
  store.toast('چک به حالت منتظر پاس برگشت')
}

function deleteCheck(ch) {
  if (!confirm('چک ' + ch.payerName + ' و تخصیص‌هایش حذف شوند؟')) return
  store.setData(d => {
    const newData = { ...d, checks: d.checks.filter(c => c.id !== ch.id), allocations: d.allocations.filter(a => a.checkId !== ch.id) }
    newData.paidRecord = { ...newData.paidRecord, expenses: syncPaidFromAllocations(newData) }
    return recordTx(newData, { type: 'check_delete', title: 'حذف چک ' + ch.payerName, amount: ch.amount })
  })
  store.toast('حذف شد')
}

const filtered = computed(() => filter.value === 'all' ? data.value.checks : data.value.checks.filter(c => c.status === filter.value))
const sorted = computed(() => filtered.value.slice().sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)))
const getAllocsFor = ch => data.value.allocations.filter(a => a.checkId === ch.id)
const expenseName = id => { const ex = data.value.expenses.find(e => e.id === id); return ex ? ex.name : 'حذف شده' }
</script>
