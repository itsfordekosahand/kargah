<template>
  <Modal title="⚙️ تنظیمات" @close="$emit('close')">
    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:14px;line-height:1.7">
      واحد پولی که برای ثبت مبالغ استفاده می‌کنید را انتخاب کنید.
    </div>
    <div class="unit-options">
      <div
        v-for="o in unitOptions"
        :key="o.k"
        class="unit-option"
        :class="{ selected: unit === o.k }"
        @click="unit = o.k"
      >
        <div class="unit-option-radio"></div>
        <div style="flex:1">
          <div class="unit-option-title">{{ o.t }}</div>
          <div class="unit-option-desc">{{ o.d }}</div>
        </div>
      </div>
    </div>
    <div style="border-top:1px solid var(--border);margin-top:18px;padding-top:16px">
      <div style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;line-height:1.7">
        🔒 <b style="color:#fff">حساب کاربری و رمز</b> — کاربران و رمزهای این پنل (مالی) مستقل از پنل انبار مدیریت می‌شوند.
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <template v-if="isAdmin">
          <button class="btn btn-outline" @click="manageUsers">🔐 مدیریت کاربران و رمزها</button>
          <button class="btn btn-outline" @click="goLauncher">🏠 بازگشت به لانچر</button>
        </template>
        <button class="btn btn-outline" @click="logout">🚪 خروج از حساب</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-accent" @click="handleSave"><AppIcon name="check" /> ذخیره</button>
      <button class="btn btn-outline" @click="$emit('close')">انصراف</button>
    </div>
  </Modal>
</template>

<script setup>
import { ref, computed } from 'vue'
import Modal from '../ui/components/Modal.vue'
import AppIcon from '../ui/components/AppIcon.vue'
import { useMaldiStore } from '../store/maldi-store.js'

const props = defineProps({ data: { type: Object, required: true } })
defineEmits(['close'])

const store = useMaldiStore()
const unit = ref(props.data.settings?.unit || 'toman')

const unitOptions = [
  { k: 'toman', t: 'تومان', d: 'مثال: ۷۵,۰۰۰,۰۰۰ تومان' },
  { k: 'thousand', t: 'هزار تومان', d: 'مثال: ۷۵,۰۰۰ هزار تومان' },
  { k: 'million', t: 'میلیون تومان', d: 'مثال: ۷۵ میلیون تومان' }
]

const isAdmin = computed(() =>
  !!(window.DecorAuth && window.DecorAuth.isAdmin && window.DecorAuth.isAdmin())
)

function handleSave() {
  store.setData(d => ({ ...d, settings: { ...(d.settings || {}), unit: unit.value } }))
  store.showSettings = false
}
function manageUsers() { if (window.DecorLock) window.DecorLock.change() }
function goLauncher() { location.href = '../' }
function logout() { if (window.DecorLock) window.DecorLock.lock() }
</script>
