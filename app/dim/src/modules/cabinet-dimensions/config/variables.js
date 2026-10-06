/**
 * متغیرهای مجاز در فرمول‌ها.
 * هر متغیر: کلید لاتین (برای ذخیره)، برچسب فارسی (برای نمایش و تایپ)، توضیح.
 * در فرمول می‌توان هم از کلید لاتین (width) و هم از برچسب فارسی (عرض کابینت) استفاده کرد.
 */

export const PARAM_VARIABLES = [
  { key: 'width', label: 'عرض کابینت', group: 'param', description: 'عرض کل کابینت به سانتی‌متر (مقدار واردشده توسط کاربر)' },
  { key: 'height', label: 'ارتفاع کابینت', group: 'param', description: 'ارتفاع کابینت به سانتی‌متر (پیش‌فرض از قالب)' },
  { key: 'depth', label: 'عمق کابینت', group: 'param', description: 'عمق کابینت به سانتی‌متر (پیش‌فرض از قالب)' },
  { key: 'doors', label: 'تعداد در', group: 'param', description: 'تعداد درهای کابینت (عدد)' },
  { key: 'shelves', label: 'تعداد طبقه', group: 'param', description: 'تعداد طبقه‌ها (عدد)' }
]

export const CONSTANT_VARIABLES = [
  { key: 'mdfThickness', label: 'ضخامت MDF', group: 'constant', unit: 'cm', description: 'ضخامت ورق MDF بدنه به سانتی‌متر' },
  { key: 'backThickness', label: 'ضخامت پشت', group: 'constant', unit: 'cm', description: 'ضخامت ورق پشت (فایبر یا MDF نازک)' },
  { key: 'pvcThickness', label: 'ضخامت PVC', group: 'constant', unit: 'cm', description: 'ضخامت لایه PVC روی قطعات' },
  { key: 'backGrooveDepth', label: 'عمق شیار پشت', group: 'constant', unit: 'cm', description: 'عمق شیاری که پشت در آن قرار می‌گیرد' },
  { key: 'railHeight', label: 'ارتفاع قید', group: 'constant', unit: 'cm', description: 'ارتفاع قید (نوار میانی) به سانتی‌متر' },
  { key: 'shelfSetback', label: 'عقبرفتگی طبقه', group: 'constant', unit: 'cm', description: 'میزان عقب‌رفتگی طبقه نسبت به جلوی کابینت' },
  { key: 'doorSideGap', label: 'فاصله در از لبه کناری', group: 'constant', unit: 'cm', description: 'فاصله هر در از لبه کناری قاب' },
  { key: 'doorTopGap', label: 'فاصله در از بالا', group: 'constant', unit: 'cm', description: 'فاصله در از لبه بالای کابینت' },
  { key: 'doorBottomGap', label: 'فاصله در از پایین', group: 'constant', unit: 'cm', description: 'فاصله در از لبه پایین کابینت' },
  { key: 'backMargin', label: 'حاشیه پشت', group: 'constant', unit: 'cm', description: 'حاشیه از هر طرف برای محاسبه ابعاد پنل پشت' }
]

export const ALL_VARIABLES = [...PARAM_VARIABLES, ...CONSTANT_VARIABLES]

/** نگاشت کلید → برچسب فارسی (برای تایپ فارسی در فرمول) */
export const LABEL_TO_KEY = ALL_VARIABLES.reduce((acc, v) => {
  acc[v.label] = v.key
  return acc
}, {})

export function describeVariable(key) {
  return ALL_VARIABLES.find((v) => v.key === key || v.label === key) || null
}

/**
 * ساخت آبجکت مقادیر زنده برای موتور فرمول.
 * @param {object} params  پارامترهای کابینت (width, height, ...)
 * @param {object} constants کالکشن ثابتهای کارگاه
 */
export function buildVariableMap(params = {}, constants = {}) {
  const out = {}
  for (const v of PARAM_VARIABLES) {
    const val = Number(params[v.key])
    if (Number.isFinite(val)) out[v.key] = val
    out[v.label] = out[v.key]
  }
  for (const [key, def] of Object.entries(constants)) {
    const val = Number(def && def.value)
    if (Number.isFinite(val)) {
      out[key] = val
      if (def.label) out[def.label] = val
    }
  }
  return out
}

/** فهرست متغیرها برای نمایش در راهنما/انتخاب‌گر (با مقدار زنده) */
export function variableOptions(constants = {}) {
  const list = ALL_VARIABLES.map((v) => ({
    ...v,
    value: v.group === 'constant' ? Number(constants[v.key]?.value) : undefined
  }))
  for (const [key, def] of Object.entries(constants)) {
    if (!ALL_VARIABLES.some((v) => v.key === key) && def && def.label) {
      list.push({ key, label: def.label, group: 'constant', unit: def.unit, description: def.description || '', value: Number(def.value) })
    }
  }
  return list
}
