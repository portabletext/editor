const BAD_PROTOCOL = /^(vbscript|javascript|file|data):/
const GOOD_DATA_URI = /^data:image\/(gif|png|jpeg|webp);/

/**
 * The markdown-it instance the parse side builds
 * (`to-portable-text/markdown-to-portable-text.ts`) never overrides
 * `validateLink`, so markdown-it's default validator is the one that runs on
 * reparse and this must stay identical to it: it rejects
 * `javascript:`/`vbscript:`/`file:` and all `data:` URIs except
 * png/gif/jpeg/webp. A copy instead of a `markdown-it` instance keeps
 * markdown-it out of bundles that only serialize.
 */
export function validateLink(url: string): boolean {
  const normalizedUrl = url.trim().toLowerCase()
  return BAD_PROTOCOL.test(normalizedUrl)
    ? GOOD_DATA_URI.test(normalizedUrl)
    : true
}
