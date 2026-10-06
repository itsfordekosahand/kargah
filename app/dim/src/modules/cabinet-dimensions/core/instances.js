/**
 * منطق نمونه‌های ذخیره‌شده (کابینتهای محاسبه‌شده).
 */
import { uid } from '../config/defaults.js'

export function instancesList(instances = {}) {
  return Object.values(instances)
    .filter((i) => i && !i.deletedAt)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
}

export function getInstance(instances = {}, id) {
  return instances[id] && !instances[id].deletedAt ? instances[id] : null
}

/**
 * ساخت یک نمونه.
 * result: خروجی calculateCabinet در لحظه ذخیره
 * overrides: بازنویسیهای اختصاصی این کابینت
 */
export function createInstance({ name, templateId, templateName, params = {}, result = null, overrides = {} }) {
  const now = Date.now()
  return {
    id: uid('inst'),
    name: name || 'کابینت بدون نام',
    templateId,
    templateName: templateName || '',
    params: { ...params },
    result: result ? JSON.parse(JSON.stringify(result)) : null,
    overrides: JSON.parse(JSON.stringify(overrides || {})),
    createdAt: now,
    updatedAt: now,
    deletedAt: null
  }
}

export function updateInstance(instance, patch = {}) {
  return { ...instance, ...patch, updatedAt: Date.now() }
}

export function softDeleteInstance(instance) {
  return { ...instance, deletedAt: Date.now(), updatedAt: Date.now() }
}

/** بازنویسی تکی یک بُعد در یک کابینت */
export function setOverride(instance, partId, field, value) {
  const overrides = { ...(instance.overrides || {}) }
  overrides[partId] = { ...(overrides[partId] || {}), [field]: value }
  return updateInstance(instance, { overrides })
}
