/**
 * موتور ارزیابی فرمول — کاملاً خالص، بدون وابستگی به Vue / DOM / ذخیره‌سازی.
 *
 * پشتیبانی: اعداد، متغیرها (کلید لاتین یا برچسب فارسی)، عملگرهای + - * / ^،
 * پرانتز، عملوند یوناری، و توابع ریاضی رایج.
 *
 * خطاها همیشه با پیام فارسی و نوع FormulaError برگردانده می‌شوند.
 */

export class FormulaError extends Error {
  constructor(message, pos = null) {
    super(message)
    this.name = 'FormulaError'
    this.pos = pos
    this.fa = message
  }
}

const FUNCTIONS = {
  abs: Math.abs,
  round: (x, d = 0) => {
    const p = 10 ** Number(d || 0)
    return Math.round(x * p) / p
  },
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: Math.sqrt,
  min: (...a) => Math.min(...a),
  max: (...a) => Math.max(...a),
  pow: Math.pow
}

/** ارقام فارسی/عربی و جداکننده اعشار فارسی → لاتین */
export function normalizeNumberText(text) {
  const map = { '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
                '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
                '٫':'.', '٬':'', '،':',' }
  // فاصله‌ها حفظ می‌شوند چون برچسبهای فارسی چندکلمه‌ای باید قابل تشخیص باشند
  return String(text).replace(/[۰-۹٠-٩٫٬،]/g, (c) => (c in map ? map[c] : c))
}

function tokenize(input, keys = []) {
  const src = normalizeNumberText(input)
  // کلیدهای چندکلمه‌ای (مثل «ضخامت MDF») باید به صورت یکجا تشخیص داده شوند
  const multiWordKeys = keys.filter((k) => /\s/.test(k)).sort((a, b) => b.length - a.length)
  const tokens = []
  let i = 0
  const isIdentStart = (ch) => /[A-Za-z_\u0621-\u064A]/.test(ch)
  const isIdentPart = (ch) => /[A-Za-z0-9_\u0621-\u064A]/.test(ch)

  while (i < src.length) {
    const ch = src[i]
    if (/\s/.test(ch)) { i++; continue }

    const multi = multiWordKeys.find((k) => src.startsWith(k, i))
    if (multi) {
      tokens.push({ type: 'ident', value: multi, pos: i })
      i += multi.length
      continue
    }

    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let j = i
      while (j < src.length && /[0-9.]/.test(src[j])) j++
      const raw = src.slice(i, j)
      if ((raw.match(/\./g) || []).length > 1) {
        throw new FormulaError(`عدد نامعتبر «${raw}» است.`, i)
      }
      tokens.push({ type: 'num', value: Number(raw), pos: i })
      i = j
      continue
    }

    if (isIdentStart(ch)) {
      let j = i
      while (j < src.length && isIdentPart(src[j])) j++
      tokens.push({ type: 'ident', value: src.slice(i, j), pos: i })
      i = j
      continue
    }

    if ('+-*/^(),'.includes(ch)) {
      tokens.push({ type: ch, value: ch, pos: i })
      i++
      continue
    }

    throw new FormulaError(`کاراکتر نامعتبر «${ch}» در عبارت.`, i)
  }
  tokens.push({ type: 'eof', value: null, pos: src.length })
  return tokens
}

function nearestVariable(name, vars) {
  const keys = Object.keys(vars)
  if (!keys.length) return null
  const first = name[0]
  const same = keys.filter((k) => k[0] === first)
  if (same.length) return same.slice(0, 3).join('، ')
  return keys.slice(0, 5).join('، ')
}

function makeParser(tokens, vars) {
  let p = 0
  const peek = () => tokens[p]
  const next = () => tokens[p++]
  const expect = (type) => {
    const t = next()
    if (t.type !== type) {
      throw new FormulaError(t.type === 'eof'
        ? 'عبارت ناقص است و عبارت به پایان رسید.'
        : `کاراکتر «${t.value}» انتظار نمی‌رفت.`, t.pos)
    }
    return t
  }

  function parseExpr() {
    let node = parseTerm()
    while (peek().type === '+' || peek().type === '-') {
      const op = next().type
      const rhs = parseTerm()
      node = { kind: 'bin', op, left: node, right: rhs }
    }
    return node
  }

  function parseTerm() {
    let node = parseUnary()
    while (peek().type === '*' || peek().type === '/') {
      const op = next().type
      const rhs = parseUnary()
      node = { kind: 'bin', op, left: node, right: rhs }
    }
    return node
  }

  function parseUnary() {
    if (peek().type === '-' || peek().type === '+') {
      const op = next().type
      return { kind: 'un', op, operand: parseUnary() }
    }
    return parsePower()
  }

  function parsePower() {
    const base = parseAtom()
    if (peek().type === '^') {
      next()
      return { kind: 'bin', op: '^', left: base, right: parseUnary() }
    }
    return base
  }

  function parseAtom() {
    const t = peek()
    if (t.type === 'num') { next(); return { kind: 'num', value: t.value } }
    if (t.type === '(') {
      next()
      const node = parseExpr()
      expect(')')
      return node
    }
    if (t.type === 'ident') {
      next()
      if (peek().type === '(') {
        next()
        const args = []
        if (peek().type !== ')') {
          args.push(parseExpr())
          while (peek().type === ',') { next(); args.push(parseExpr()) }
        }
        expect(')')
        const fn = FUNCTIONS[t.value.toLowerCase()]
        if (!fn) throw new FormulaError(`تابع «${t.value}» تعریف نشده است.`, t.pos)
        return { kind: 'call', name: t.value.toLowerCase(), args }
      }
      const key = t.value
      if (!(key in vars)) {
        const hint = nearestVariable(key, vars)
        throw new FormulaError(
          hint
            ? `متغیر تعریف‌نشده «${key}». متغیرهای موجود: ${hint}`
            : `متغیر تعریف‌نشده «${key}».`, t.pos)
      }
      return { kind: 'var', name: key, value: Number(vars[key]) }
    }
    if (t.type === 'eof') {
      const prev = p > 0 ? tokens[p - 1] : null
      if (prev && ['+', '-', '*', '/', '^', '(', ','].includes(prev.type)) {
        throw new FormulaError(`عبارت ناقص است؛ بعد از «${prev.value || prev.type}» عدد یا متغیری نیامده.`, t.pos)
      }
      throw new FormulaError('عبارت خالی است.', t.pos)
    }
    throw new FormulaError(`کاراکتر غیرمنتظره «${t.value}» در عبارت.`, t.pos)
  }

  const ast = parseExpr()
  if (peek().type !== 'eof') {
    throw new FormulaError(`کاراکتر اضافی «${peek().value}» در عبارت.`, peek().pos)
  }
  return ast
}

function evalNode(node) {
  switch (node.kind) {
    case 'num': return node.value
    case 'var': return node.value
    case 'un': {
      const v = evalNode(node.operand)
      return node.op === '-' ? -v : v
    }
    case 'call': return FUNCTIONS[node.name](...node.args.map(evalNode))
    case 'bin': {
      const a = evalNode(node.left)
      const b = evalNode(node.right)
      switch (node.op) {
        case '+': return a + b
        case '-': return a - b
        case '*': return a * b
        case '/':
          if (Math.abs(b) < 1e-12) throw new FormulaError('تقسیم بر صفر مجاز نیست.')
          return a / b
        case '^': return a ** b
      }
    }
  }
  throw new FormulaError('عبارت قابل ارزیابی نیست.')
}

/**
 * ارزیابی فرمول.
 * @param {string} formula
 * @param {Record<string, number>} vars
 * @returns {number}
 * @throws {FormulaError} با پیام فارسی
 */
export function evaluate(formula, vars = {}) {
  if (formula === null || formula === undefined || String(formula).trim() === '') {
    throw new FormulaError('عبارت فرمول خالی است.')
  }
  const tokens = tokenize(String(formula), Object.keys(vars))
  const ast = makeParser(tokens, vars)
  const result = evalNode(ast)
  if (typeof result !== 'number' || Number.isNaN(result)) {
    throw new FormulaError('نتیجه فرمول عدد معتبری نیست.')
  }
  if (!Number.isFinite(result)) {
    throw new FormulaError('نتیجه فرمول نامتناهی است (احتمالاً تقسیم بر صفر).')
  }
  return result
}

/** ارزیابی امن: خطا را پرتاب نمی‌کند */
export function tryEvaluate(formula, vars = {}) {
  try {
    const value = evaluate(formula, vars)
    return { ok: true, value, error: null }
  } catch (e) {
    return { ok: false, value: null, error: e.fa || e.message || 'خطای ناشناخته در فرمول' }
  }
}

/** اعتبارسنجی فرمول (بدون پرتاب کردن خطا) */
export function validateFormula(formula, vars = {}) {
  const r = tryEvaluate(formula, vars)
  return { valid: r.ok, value: r.value, error: r.error }
}

/** متغیرهای استفاده‌شده در یک فرمول */
export function extractVariables(formula) {
  const found = []
  try {
    const tokens = tokenize(String(formula || ''))
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type === 'ident' && tokens[i + 1] && tokens[i + 1].type !== '(') {
        if (!found.includes(tokens[i].value)) found.push(tokens[i].value)
      }
    }
  } catch {
    /* عبارت خراب — متغیری استخراج نمی‌شود */
  }
  return found
}

/** راهنمای توابع برای UI */
export const FORMULA_HELP = [
  { name: 'round(x)', desc: 'گرد کردن به نزدیک‌ترین عدد' },
  { name: 'floor(x) / ceil(x)', desc: 'گرد به پایین / بالا' },
  { name: 'abs(x)', desc: 'مقدار مطلق' },
  { name: 'min(a, b) / max(a, b)', desc: 'کوچک‌ترین / بزرگ‌ترین' },
  { name: 'sqrt(x) / pow(x, y)', desc: 'جذر / توان' }
]
