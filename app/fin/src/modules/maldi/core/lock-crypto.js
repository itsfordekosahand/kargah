/**
 * کریپتوی ورود — از lock.js مبدأ (خطوط ۸۱–۱۸۲) استخراج شده تا خالص و
 * بدون DOM باشد و با `node --test` قابل آزمون باشد. رفتار دست‌نخورده است:
 *   - PBKDF2-SHA256 با WebCrypto (iter=120000 برای pbkdf2)
 *   - fallback sha256-iter (iter=600) وقتی WebCrypto نیست
 *   - مقایسه hash بدون leak زمانی
 */

export const MIN_LEN = 4
export const RECORD_VERSION = 3

export function toHex(buf) {
  let s = ''
  const b = new Uint8Array(buf)
  for (let i = 0; i < b.length; i++) s += ('0' + b[i].toString(16)).slice(-2)
  return s
}

export function randomSalt() {
  const a = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(a)
  else for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256)
  return toHex(a)
}

export function hasWebCrypto() {
  return typeof crypto !== 'undefined' && !!crypto.subtle && typeof TextEncoder !== 'undefined'
}

export function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16)
  return out
}

export function pickAlg() { return hasWebCrypto() ? 'pbkdf2' : 'sha256-iter' }
export function pickIter(alg) { return alg === 'pbkdf2' ? 120000 : 600 }

/* Compact SHA-256 (fallback when WebCrypto unavailable). */
export function sha256hex(input) {
  const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x92e67432,0x991931be,
             0xa1f0d686,0xa8036f35,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
             0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
             0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
             0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
             0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]
  function utf8(str) {
    const out = []
    for (let i = 0; i < str.length; i++) {
      const c = str.charCodeAt(i)
      if (c < 128) out.push(c)
      else if (c < 2048) out.push(192 | (c >> 6), 128 | (c & 63))
      else if (c >= 0xd800 && c < 0xdc00) {
        const c2 = str.charCodeAt(++i)
        const cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff)
        out.push(240 | (cp >> 18), 128 | ((cp >> 12) & 63), 128 | ((cp >> 6) & 63), 128 | (cp & 63))
      } else out.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63))
    }
    return out
  }
  const bytes = utf8(input)
  const bitLen = bytes.length * 8
  bytes.push(0x80)
  while (bytes.length % 64 !== 56) bytes.push(0)
  for (let i2 = 7; i2 >= 0; i2--) bytes.push((bitLen / Math.pow(2, i2 * 8)) & 0xff)
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]
  const w = new Array(64)
  function rotr(x, n) { return (x >>> n) | (x << (32 - n)) }
  for (let off = 0; off < bytes.length; off += 64) {
    for (let t = 0; t < 16; t++) {
      const j = off + t * 4
      w[t] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0
    }
    for (let t2 = 16; t2 < 64; t2++) {
      const s0 = rotr(w[t2 - 15], 7) ^ rotr(w[t2 - 15], 18) ^ (w[t2 - 15] >>> 3)
      const s1 = rotr(w[t2 - 2], 17) ^ rotr(w[t2 - 2], 19) ^ (w[t2 - 2] >>> 10)
      w[t2] = (w[t2 - 16] + s0 + w[t2 - 7] + s1) >>> 0
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7]
    for (let t3 = 0; t3 < 64; t3++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)
      const ch = (e & f) ^ (~e & g)
      const temp1 = (h + S1 + K[t3] + w[t3]) >>> 0
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const temp2 = (S0 + maj) >>> 0
      h = g; g = f; f = e; e = (d + temp1) >>> 0
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0
    }
    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0
  }
  return H.map(function (x) { return ('00000000' + x.toString(16)).slice(-8) }).join('')
}

export function hashPassword(password, salt, iterations, alg) {
  if (alg === 'pbkdf2' && hasWebCrypto()) {
    return crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: hexToBytes(salt), iterations: iterations, hash: 'SHA-256' },
          key, 256)
      })
      .then(toHex)
  }
  let h = sha256hex(salt + ':' + password)
  for (let i = 1; i < iterations; i++) h = sha256hex(h + salt + ':' + password)
  return Promise.resolve(h)
}

export function hashEquals(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
