<script setup>
import { ref, computed } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt, fmtInt, num, faNow } from '../../utils/format.js'
import { numToWords, thousands } from '../../core/amount-format.js'
import EmptyBox from '../components/EmptyBox.vue'

const props = defineProps({ tpl: { type: Object, required: true } })
const store = useAnbarStore()

/* BUG-4: شماره فاکتور فقط هنگام باز شدن قالب تخصیص می‌یابد، نه در هر رندر */
const invNum = ref(store.ensureInvoiceNumber(props.tpl.id))
const tt = computed(() => store.templateTotals(props.tpl))

function setName(e) { store.setTemplateField(props.tpl.id, 'name', e.target.value) }
function setNotes(e) { store.setTemplateField(props.tpl.id, 'notes', e.target.value) }
function setDisc(e) { store.setTemplateField(props.tpl.id, 'discountPercent', e.target.value) }
function setTax(e) { store.setTemplateField(props.tpl.id, 'taxPercent', e.target.value) }

/* ---- معادل حروف مبالغ فاکتور (core/amount-format.js) ---- */
const wSub = computed(() => numToWords(tt.value.sub, 'تومان'))
const wDisc = computed(() => numToWords(tt.value.disc, 'تومان'))
const wTax = computed(() => numToWords(tt.value.tax, 'تومان'))
const wTotal = computed(() => numToWords(tt.value.total, 'تومان'))
/* جمع هر قلم به حروف — زیر قیمت واحد در فهرست اقلام */
const itemWords = it => ({
  unit: numToWords(it.unitPrice, 'تومان'),
  line: numToWords(num(it.qty) * num(it.unitPrice), 'تومان')
})
</script>

<template>
  <div class="row no-print" style="margin-bottom:12px">
    <button class="btn" data-act="close-template"><span v-html="ico('arrowR', 15)"></span> بازگشت</button>
    <button class="btn amber" data-act="print-invoice" :data-id="tpl.id"><span v-html="ico('print', 15)"></span> چاپ / PDF</button>
  </div>

  <div class="card invoice-view" style="--d:0" :data-inv-theme="tpl.invTheme || undefined">
    <div class="invoice-head">
      <div>
        <div class="inv-title"><span v-html="ico('receipt', 22)"></span> دکور سهند</div>
        <div class="hint" style="margin-top:4px"><span v-html="ico('info', 13)"></span> تاریخ صدور: {{ faNow() }}</div>
      </div>
      <div class="row no-print" style="gap:4px;align-items:center">
        <div class="inv-num">#{{ invNum }}</div>
      </div>
    </div>

    <div style="margin-top:16px">
      <label>عنوان فاکتور / قالب</label>
      <input :value="tpl.name" :data-tpl-name="tpl.id" @change="setName">
    </div>

    <h3 style="margin-top:20px;display:flex;align-items:center;gap:8px">
      <span v-html="ico('layers', 18)"></span> اقلام فاکتور
    </h3>

    <div v-if="(tpl.items || []).length" class="inv-items">
      <div v-for="(it, i) in tpl.items" :key="it.id" class="inv-item" :style="{ '--i': i }">
        <div class="inv-item-main">
          <div class="inv-item-title">
            <span class="type-badge">{{ it.type || 'قلم' }}</span>
            <span class="inv-item-label">{{ it.label }}</span>
          </div>
          <div class="inv-item-meta">
            <span>تعداد: <b>{{ fmt(it.qty) }}</b> {{ it.unit || '' }}</span>
            <span>قیمت واحد: <b>{{ thousands(it.unitPrice) }}</b> تومان
              <em v-if="itemWords(it).unit" class="amount-words">{{ itemWords(it).unit }}</em></span>
            <span>جمع: <b>{{ thousands(num(it.qty) * num(it.unitPrice)) }}</b> تومان
              <em v-if="itemWords(it).line" class="amount-words">{{ itemWords(it).line }}</em></span>
          </div>
        </div>
        <div class="inv-item-actions no-print">
          <button class="btn sm" data-act="edit-item" :data-tpl="tpl.id" :data-item="it.id" title="ویرایش" v-html="ico('pencil', 14)"></button>
          <button class="btn sm dan" data-act="del-item" :data-tpl="tpl.id" :data-item="it.id" title="حذف" v-html="ico('trash', 14)"></button>
        </div>
      </div>
    </div>
    <EmptyBox v-else msg="هنوز قلمی اضافه نشده" />

    <div class="row no-print" style="margin-top:12px">
      <button class="btn pri" data-act="add-item" :data-tpl="tpl.id">
        <span v-html="ico('plus', 15)"></span> افزودن قلم
      </button>
    </div>

    <div class="invoice-summary" :data-tpl-summary="tpl.id">
      <div class="inv-row"><span>جمع کل اقلام:</span>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:1px">
          <b class="s-sub">{{ thousands(tt.sub) }} تومان</b>
          <em v-if="wSub" class="amount-words">{{ wSub }}</em>
        </span></div>
      <div class="inv-row">
        <span>تخفیف (<input type="number" min="0" max="100" step="0.1" :value="tpl.discountPercent || 0"
                            :data-tpl-disc="tpl.id" @input="setDisc">٪):</span>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:1px">
          <b class="s-disc">{{ thousands(tt.disc) }} تومان</b>
          <em v-if="wDisc" class="amount-words">{{ wDisc }}</em>
        </span>
      </div>
      <div class="inv-row">
        <span>مالیات (<input type="number" min="0" max="100" step="0.1" :value="tpl.taxPercent || 0"
                             :data-tpl-tax="tpl.id" @input="setTax">٪):</span>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:1px">
          <b class="s-tax">{{ thousands(tt.tax) }} تومان</b>
          <em v-if="wTax" class="amount-words">{{ wTax }}</em>
        </span>
      </div>
      <div class="inv-row inv-total"><span>مبلغ نهایی قابل پرداخت:</span>
        <span style="display:flex;flex-direction:column;align-items:flex-end;gap:1px">
          <b class="s-total">{{ thousands(tt.total) }} تومان</b>
          <em v-if="wTotal" class="amount-words">{{ wTotal }}</em>
        </span></div>
    </div>

    <div style="margin-top:18px">
      <label>توضیحات فاکتور</label>
      <textarea rows="3" :data-tpl-notes="tpl.id" placeholder="شرایط پرداخت، توضیحات اضافی..."
                :value="tpl.notes || ''" @change="setNotes"></textarea>
    </div>
  </div>

  <div class="card no-print" style="--d:1">
    <button class="btn dan" data-act="del" data-type="template" :data-id="tpl.id">
      <span v-html="ico('trash', 15)"></span> حذف کامل قالب
    </button>
  </div>
</template>
