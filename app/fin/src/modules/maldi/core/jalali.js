/**
 * تاریخ شمسی — عیناً از index.html مبدأ (خطوط ۳۰۶–۳۴۱) منتقل شده است.
 * نکته: `jalaliToGregorian` شامل اصلاح `gy += 1595` (فیکس نسخه ۶.۲) است.
 */

export const JalaliDate = {
  gregorianToJalali(gy, gm, gd) {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    let gy2 = (gm > 2) ? (gy + 1) : gy
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1]
    let jy = -1595 + (33 * Math.floor(days / 12053)); days %= 12053
    jy += 4 * Math.floor(days / 1461); days %= 1461
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365 }
    let jm, jd
    if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31) }
    else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30) }
    return { jy, jm, jd }
  },
  // ===== FIX: اضافه کردن 1595 به سال =====
  jalaliToGregorian(jy, jm, jd) {
    let days = -355668 + (365 * jy) + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186)
    let gy = 400 * Math.floor(days / 146097); days %= 146097
    if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++ }
    gy += 4 * Math.floor(days / 1461); days %= 1461
    if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365 }
    gy += 1595
    let gd = days + 1
    const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || (gy % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    let gm
    for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm]
    return { gy, gm, gd }
  },
  toString(jy, jm, jd) { return jy + '/' + String(jm).padStart(2, '0') + '/' + String(jd).padStart(2, '0') },
  today() { const n = new Date(); return this.gregorianToJalali(n.getFullYear(), n.getMonth() + 1, n.getDate()) },
  formatGregorian(dateStr) { if (!dateStr) return ''; const d = new Date(dateStr); const j = this.gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate()); return this.toString(j.jy, j.jm, j.jd) },
  toISO(gy, gm, gd) { return gy + '-' + String(gm).padStart(2, '0') + '-' + String(gd).padStart(2, '0') }
}

export const daysInJYear = (jy) => {
  const gs = JalaliDate.jalaliToGregorian(jy, 1, 1)
  const ge = JalaliDate.jalaliToGregorian(jy + 1, 1, 1)
  return Math.round((new Date(ge.gy, ge.gm - 1, ge.gd) - new Date(gs.gy, gs.gm - 1, gs.gd)) / 86400000)
}

export const daysInJMonth = (jy, jm) => {
  if (jm <= 6) return 31
  if (jm <= 11) return 30
  return daysInJYear(jy) === 366 ? 30 : 29
}

export const jalaliMonthRange = (jy, jm) => {
  const gs = JalaliDate.jalaliToGregorian(jy, jm, 1)
  const ge = JalaliDate.jalaliToGregorian(jy, jm, daysInJMonth(jy, jm))
  return {
    startT: new Date(gs.gy, gs.gm - 1, gs.gd).getTime(),
    endT: new Date(ge.gy, ge.gm - 1, ge.gd).getTime()
  }
}

export const effectiveDueDay = (dueDay, jy, jm) => Math.min(dueDay, daysInJMonth(jy, jm))

export const PERSIAN_MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند']

export const getPersianMonth = (m) => PERSIAN_MONTHS[m] || ''
