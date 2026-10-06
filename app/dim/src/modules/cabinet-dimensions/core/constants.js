/**
 * کتابخانه ثابتهای کارگاه: ساخت، خواندن، ویرایش و اعتبارسنجی کالکشن ثابتها.
 * هر ثابت: { id, label, value, unit, description, order }
 */

export const MATERIALS = {
  mdf: { key: 'mdf', label: 'MDF', thicknessKey: 'mdfThickness' },
  back: { key: 'back', label: 'پشت', thicknessKey: 'backThickness' },
  pvc: { key: 'pvc', label: 'PVC', thicknessKey: 'pvcThickness' }
}

export function materialLabel(key) {
  return MATERIALS[key]?.label || key || '—'
}

function def(id, label, value, unit, description, order) {
  return { id, label, value, unit, description, order }
}

/** مقادیر پیش‌فرض ثابتهای کارگاه */
export function defaultConstants() {
  const list = [
    def('mdfThickness', 'ضخامت MDF', 1.6, 'سانتی‌متر', 'ضخامت ورق MDF بدنه', 0),
    def('backThickness', 'ضخامت پشت', 0.3, 'سانتی‌متر', 'ضخامت ورق پشت (فایبر یا MDF نازک)', 1),
    def('pvcThickness', 'ضخامت PVC', 0.2, 'سانتی‌متر', 'ضخامت لایه PVC روی قطعات', 2),
    def('backGrooveDepth', 'عمق شیار پشت', 1, 'سانتی‌متر', 'عمق شیاری که پنل پشت در آن قرار می‌گیرد', 3),

    def('baseHeight', 'ارتفاع پیش‌فرض زمینی', 71, 'سانتی‌متر', 'ارتفاع پیش‌فرض کابینت زمینی', 4),
    def('baseDepth', 'عمق پیش‌فرض زمینی', 58, 'سانتی‌متر', 'عمق پیش‌فرض کابینت زمینی', 5),
    def('baseShelves', 'تعداد طبقه پیش‌فرض زمینی', 1, 'عدد', 'تعداد طبقه پیش‌فرض کابینت زمینی', 6),

    def('wallHeight', 'ارتفاع پیش‌فرض هوایی', 72, 'سانتی‌متر', 'ارتفاع پیش‌فرض کابینت هوایی', 7),
    def('wallDepth', 'عمق پیش‌فرض هوایی', 35, 'سانتی‌متر', 'عمق پیش‌فرض کابینت هوایی', 8),
    def('wallShelves', 'تعداد طبقه پیش‌فرض هوایی', 1, 'عدد', 'تعداد طبقه پیش‌فرض کابینت هوایی', 9),

    def('tallHeight', 'ارتفاع پیش‌فرض قدی', 215, 'سانتی‌متر', 'ارتفاع پیش‌فرض کابینت قدی', 10),
    def('tallDepth', 'عمق پیش‌فرض قدی', 55, 'سانتی‌متر', 'عمق پیش‌فرض کابینت قدی', 11),
    def('tallShelves', 'تعداد طبقه پیش‌فرض قدی', 4, 'عدد', 'تعداد طبقه پیش‌فرض کابینت قدی', 12),

    def('defaultDoors', 'تعداد در پیش‌فرض', 2, 'عدد', 'تعداد در پیش‌فرض هر قالب', 13),
    def('railHeight', 'ارتفاع قید', 6, 'سانتی‌متر', 'ارتفاع قید (نوار میانی)', 14),
    def('shelfSetback', 'عقبرفتگی طبقه', 3, 'سانتی‌متر', 'میزان عقب‌رفتگی طبقه نسبت به جلوی کابینت', 15),
    def('doorSideGap', 'فاصله در از لبه کناری', 0.2, 'سانتی‌متر', 'فاصله هر در از لبه کناری قاب', 16),
    def('doorTopGap', 'فاصله در از بالا', 0.5, 'سانتی‌متر', 'فاصله در از لبه بالای کابینت', 17),
    def('doorBottomGap', 'فاصله در از پایین', 1, 'سانتی‌متر', 'فاصله در از لبه پایین کابینت', 18),
    def('backMargin', 'حاشیه پشت', 0.9, 'سانتی‌متر', 'حاشیه از هر طرف برای محاسبه ابعاد پنل پشت', 19)
  ]
  const map = {}
  for (const c of list) map[c.id] = { ...c, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null }
  return map
}

export function constantList(constants = {}) {
  return Object.values(constants)
    .filter((c) => !c.deletedAt)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function getConstant(constants = {}, key) {
  return constants[key] || null
}

export function constantValue(constants = {}, key, fallback = 0) {
  const v = Number(constants[key]?.value)
  return Number.isFinite(v) ? v : fallback
}

/** مقدار یک ثابت را تغییر می‌دهد (ساختار جدید برمی‌گرداند) */
export function setConstantValue(constants = {}, key, value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return constants
  return {
    ...constants,
    [key]: { ...(constants[key] || { id: key, label: key, unit: 'سانتی‌متر', description: '', order: 99 }),
      value: num, updatedAt: Date.now() }
  }
}

export function addConstant(constants = {}, { id, label, value, unit = 'سانتی‌متر', description = '' }) {
  const key = String(id || '').trim() || `const_${Date.now().toString(36)}`
  return {
    ...constants,
    [key]: { id: key, label: label || key, value: Number(value) || 0, unit, description,
      order: Object.keys(constants).length, createdAt: Date.now(), updatedAt: Date.now(), deletedAt: null }
  }
}

/** حذف نرم */
export function removeConstant(constants = {}, key) {
  if (!constants[key]) return constants
  return { ...constants, [key]: { ...constants[key], deletedAt: Date.now(), updatedAt: Date.now() } }
}

/** اعتبارسنجی کالکشن ثابتها — پیام‌ها فارسی */
export function validateConstants(constants = {}) {
  const errors = []
  const seenLabels = new Set()
  for (const [key, c] of Object.entries(constants)) {
    if (!c) continue
    if (!c.label || !String(c.label).trim()) errors.push({ path: key, message: 'ثابت بدون نام مجاز نیست.' })
    if (!Number.isFinite(Number(c.value))) errors.push({ path: key, message: `مقدار ثابت «${c.label || key}» عدد معتبری نیست.` })
    if (c.label && seenLabels.has(c.label)) errors.push({ path: key, message: `نام تکراری «${c.label}» در ثابتها.` })
    seenLabels.add(c.label)
  }
  return errors
}

/** فهرست ثابتهای قابل استفاده در فرمولها (برای راهنما) */
export function formulaConstants(constants = {}) {
  return constantList(constants).map((c) => ({ key: c.id, label: c.label, value: c.value, unit: c.unit, description: c.description }))
}
