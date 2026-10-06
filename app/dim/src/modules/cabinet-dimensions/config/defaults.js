/**
 * مقادیر پیش‌فرض قالب‌ها: سه قالب آماده و پارامترهای پیش‌فرض هر نوع.
 */

export const TEMPLATE_TYPES = [
  { key: 'base', name: 'کابینت زمینی', icon: 'pi pi-home', description: 'کابینت زیر کانتر با در و طبقه' },
  { key: 'wall', name: 'کابینت هوایی', icon: 'pi pi-window-maximize', description: 'کابینت دیواری بالای سینک' },
  { key: 'tall', name: 'کابینت قدی', icon: 'pi pi-align-justify', description: 'کابینت ایستاده بلند (یخچالی/بوفه)' }
]

/** پارامترهای پیش‌فرض هر نوع (ارتفاع، عمق، تعداد در، تعداد طبقه) */
export const DEFAULT_TEMPLATE_PARAMS = {
  base: { height: 71, depth: 58, doors: 2, shelves: 1 },
  wall: { height: 72, depth: 35, doors: 2, shelves: 1 },
  tall: { height: 215, depth: 55, doors: 2, shelves: 4 }
}

export function defaultParamsFor(typeKey) {
  return { ...(DEFAULT_TEMPLATE_PARAMS[typeKey] || DEFAULT_TEMPLATE_PARAMS.base) }
}

let seq = 0
export function uid(prefix = 'id') {
  seq += 1
  const rnd = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}${rnd}`
}

/** یک قطعه استاندارد می‌سازد */
export function makePart(p) {
  return {
    id: p.id || uid('part'),
    name: p.name,
    material: p.material || 'mdf',
    pvc: !!p.pvc,
    groove: !!p.groove,
    quantity: p.quantity || { type: 'constant', value: 1 },
    length: p.length,
    width: p.width,
    order: p.order ?? 0
  }
}

/**
 * ساخت لیست قطعات یک قالب.
 * قواعد زیر دقیقاً همان نمونهٔ موفقیت را می‌سازند (عرض ۱۰۰، عمق ۵۸، ارتفاع ۷۱):
 * کف ۱۰۰×۵۸، بغل ۷۱×۵۸، قید ۹۶٫۸×۶، طبقه ۹۶٫۸×۵۵، در ۴۹٫۸×۶۹٫۵، پشت ۹۸٫۲×۶۹
 */
export function standardParts() {
  return [
    makePart({
      id: 'bottom', name: 'کف', order: 0, material: 'mdf', pvc: true,
      quantity: { type: 'constant', value: 1 },
      length: { type: 'equal', source: 'width' },
      width: { type: 'equal', source: 'depth' }
    }),
    makePart({
      id: 'side', name: 'بغل', order: 1, material: 'mdf', pvc: true,
      quantity: { type: 'constant', value: 2 },
      length: { type: 'equal', source: 'height' },
      width: { type: 'equal', source: 'depth' }
    }),
    makePart({
      id: 'rail', name: 'قید', order: 2, material: 'mdf', pvc: true,
      quantity: { type: 'constant', value: 1 },
      length: { type: 'offset', source: 'width', offset: -3.2 },
      width: { type: 'constant', value: 6 }
    }),
    makePart({
      id: 'shelf', name: 'طبقه', order: 3, material: 'mdf', pvc: false,
      quantity: { type: 'equal', source: 'shelves' },
      length: { type: 'offset', source: 'width', offset: -3.2 },
      width: { type: 'formula', expression: 'depth - shelfSetback' }
    }),
    makePart({
      id: 'door', name: 'در', order: 4, material: 'mdf', pvc: true,
      quantity: { type: 'equal', source: 'doors' },
      length: { type: 'divide', numerator: 'width - 2 * doorSideGap', denominator: 'doors' },
      width: { type: 'formula', expression: 'height - doorTopGap - doorBottomGap' }
    }),
    makePart({
      id: 'back', name: 'پشت', order: 5, material: 'back', pvc: false, groove: true,
      quantity: { type: 'constant', value: 1 },
      length: { type: 'formula', expression: 'width - 2 * backMargin' },
      width: { type: 'formula', expression: 'height - 2 * backGrooveDepth' }
    })
  ]
}

/** سه قالب پیش‌فرض سیستم */
export function defaultTemplates() {
  return TEMPLATE_TYPES.map((t, i) => ({
    id: `tpl_${t.key}`,
    name: t.name,
    icon: t.icon,
    description: t.description,
    system: true,
    type: t.key,
    defaults: defaultParamsFor(t.key),
    parts: standardParts(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deletedAt: null,
    order: i
  }))
}
