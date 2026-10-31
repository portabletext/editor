// Mirrors markdown-it's `validateLink`, which `@portabletext/markdown` uses:
// clipboard content is untrusted, and these schemes run code or read local
// files when the link is followed.
const unsafeProtocol = /^(vbscript|javascript|file|data):/

export function isUnsafeUrl(href: string): boolean {
  // Browsers ignore ASCII control characters and whitespace inside a scheme.
  // oxlint-disable-next-line no-control-regex
  const scheme = href.replace(/[\u0000- \u007f]/g, '').toLowerCase()

  return unsafeProtocol.test(scheme)
}
