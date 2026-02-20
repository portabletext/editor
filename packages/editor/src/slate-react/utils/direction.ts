// Inlined from `direction@2.0.1` to avoid cross-package type resolution
// issues in the monorepo. The `direction` package has only a named export,
// but Slate's source uses default imports. Different packages in the monorepo
// resolve the types differently, causing TS1192 errors.

const rtlRange = '\u0591-\u07FF\uFB1D-\uFDFD\uFE70-\uFEFC'
const ltrRange =
  'A-Za-z\u00C0-\u00D6\u00D8-\u00F6' +
  '\u00F8-\u02B8\u0300-\u0590\u0800-\u1FFF\u200E\u2C00-\uFB1C' +
  '\uFE00-\uFE6F\uFEFD-\uFFFF'

const rtl = new RegExp(`^[^${ltrRange}]*[${rtlRange}]`)
const ltr = new RegExp(`^[^${rtlRange}]*[${ltrRange}]`)

export default function getDirection(value: string): 'rtl' | 'ltr' | 'neutral' {
  const source = String(value || '')
  return rtl.test(source) ? 'rtl' : ltr.test(source) ? 'ltr' : 'neutral'
}
