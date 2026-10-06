/**
 * لایه ذخیره‌سازی محلی — wrapper روی localStorage.
 * کاملاً آفلاین؛ هیچ درخواست شبکه‌ای انجام نمی‌شود.
 * هر شیء ذخیره‌شده ساختار { updatedAt, items } دارد تا با مکانیزم
 * tombstone / updatedAt در فازهای بعد سازگار بماند.
 */

export const PREFIX = 'cd:v1:'

export const STORAGE_KEYS = {
  constants: 'constants',
  templates: 'templates',
  instances: 'instances',
  samples: 'samples',
  meta: 'meta'
}

export function storageKey(name) {
  return PREFIX + name
}

export function storageAvailable() {
  try {
    if (typeof localStorage === 'undefined') return false
    const k = PREFIX + '__probe__'
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

/** خواندن یک کلید (JSON) — خطا هرگز پرتاب نمی‌شود */
export function get(name) {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(storageKey(name))
    if (raw === null) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

/** نوشتن یک کلید (JSON) — در صورت شکست false برمی‌گرداند */
export function set(name, value) {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.setItem(storageKey(name), JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function remove(name) {
  try {
    if (typeof localStorage === 'undefined') return false
    localStorage.removeItem(storageKey(name))
    return true
  } catch {
    return false
  }
}

export function clearAll() {
  try {
    if (typeof localStorage === 'undefined') return false
    const keys = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX)) keys.push(k)
    }
    keys.forEach((k) => localStorage.removeItem(k))
    return true
  } catch {
    return false
  }
}

export function has(name) {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(storageKey(name)) !== null
  } catch {
    return false
  }
}

/** ذخیره مجموعه به شکل { updatedAt, items } */
export function saveCollection(name, items) {
  return set(name, { updatedAt: Date.now(), items: items || {} })
}

/** خواندن مجموعه؛ اگر چیزی نبود { items: {} } برمی‌گرداند */
export function loadCollection(name) {
  const raw = get(name)
  if (!raw) return { updatedAt: null, items: {} }
  if (raw && typeof raw === 'object' && raw.items) return { updatedAt: raw.updatedAt || null, items: raw.items }
  // سازگاری با ساختار قدیمی (خودِ آبجکت، بدون envelope)
  return { updatedAt: null, items: raw }
}
