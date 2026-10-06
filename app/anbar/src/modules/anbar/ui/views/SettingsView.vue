<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAnbarStore } from '../../store/anbar.js'
import { ico } from '../../utils/icons.js'
import { fmt } from '../../utils/format.js'
import SecHead from '../components/SecHead.vue'

const store = useAnbarStore()
const isAdmin = ref(false)

function checkAdmin() {
  try {
    isAdmin.value = !!(window.DecorAuth && window.DecorAuth.isAdmin && window.DecorAuth.isAdmin())
  } catch (_) { isAdmin.value = false }
}
onMounted(() => {
  checkAdmin()
  window.addEventListener('decor:unlocked', checkAdmin)
})
onUnmounted(() => window.removeEventListener('decor:unlocked', checkAdmin))
</script>

<template>
  <div v-if="isAdmin" class="card" style="--d:0">
    <SecHead icon="lock" title="حساب و دسترسی‌ها (فقط ادمین)" />
    <p class="hint">کاربران و رمزهای این پنل (انبار) مستقل از پنل مالی مدیریت می‌شوند.</p>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" data-decor-admin><span v-html="ico('lock', 15)"></span> مدیریت کاربران و رمزها</button>
      <a class="btn" href="../"><span v-html="ico('folder', 15)"></span> بازگشت به لانچر</a>
    </div>
  </div>

  <div class="card" style="--d:0">
    <SecHead icon="down" title="پشتیبانگیری (Export)" />
    <p class="hint">تمام دادهها را در یک فایل JSON ذخیره کنید.</p>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" data-act="export"><span v-html="ico('down', 15)"></span> دانلود فایل پشتیبان</button>
      <button class="btn" data-act="export-html"><span v-html="ico('save', 15)"></span> ذخیره در خود فایل HTML</button>
    </div>
    <div class="hint" style="margin-top:10px">
      شامل: {{ fmt(store.data.tools.length) }} ابزار، {{ fmt(store.data.sheets.length) }} ورق،
      {{ fmt(store.data.hardware.length) }} یراق، {{ fmt(store.data.templates.length) }} قالب،
      {{ fmt(store.data.jobs.length) }} کار.
    </div>
  </div>

  <div class="card" style="--d:1">
    <SecHead icon="up" title="بازیابی از پشتیبان (Import)" />
    <p class="hint">فایل را انتخاب کنید و در مرحله بعد ادغام یا جایگزینی کامل را انتخاب کنید.</p>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" data-act="import"><span v-html="ico('up', 15)"></span> انتخاب فایل پشتیبان</button>
    </div>
  </div>

  <div class="card" style="--d:2">
    <SecHead icon="target" title="داده نمونه / بازنشانی" />
    <div class="row" style="margin-top:12px">
      <button class="btn" data-act="demo"><span v-html="ico('target', 15)"></span> بارگذاری داده نمونه</button>
      <button class="btn dan" data-act="wipe"><span v-html="ico('trash', 15)"></span> پاک کردن همه</button>
    </div>
  </div>

  <div class="card" style="--d:3">
    <SecHead icon="chart" title="آمار کلی" />
    <div class="table-wrap">
      <table>
        <tbody>
          <tr><td>تعداد ابزار</td><td>{{ fmt(store.data.tools.length) }}</td></tr>
          <tr><td>ردیف‌های ورق</td><td>{{ fmt(store.data.sheets.length) }}</td></tr>
          <tr><td>اقلام یراق</td><td>{{ fmt(store.data.hardware.length) }}</td></tr>
          <tr><td>قالب‌های محاسبه</td><td>{{ fmt(store.data.templates.length) }}</td></tr>
          <tr><td>کارها (باز / کل)</td><td>{{ fmt(store.jobsOpen(store.data.jobs).length) }} / {{ fmt(store.data.jobs.length) }}</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <div class="card" style="--d:4">
    <SecHead icon="phone" title="نصب روی گوشی (نسخه مستقل)" />
    <p class="hint">با نصب، آیکون اختصاصی <b style="color:var(--txt)">Deco Sahand</b> روی صفحه اصلی قرار می‌گیرد، اپ مثل یک برنامه مستقل باز می‌شود و بدون اینترنت هم کار می‌کند.</p>
    <div class="row" style="margin-top:12px">
      <button class="btn pri" data-act="install-pwa"><span v-html="ico('phone', 15)"></span> نصب اپلیکیشن</button>
    </div>
    <div class="hint" style="margin-top:10px">
      در اندروید: همین دکمه یا منوی مرورگر ← «نصب برنامه».<br>
      در آیفون: دکمه اشتراک‌گذاری مرورگر ← «افزودن به صفحه اصلی».
    </div>
  </div>
</template>
