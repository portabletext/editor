/**
 * The URL the driver opens: `url` with its `prefix` search parameter set to `prefix`. Chrome reports a
 * page target by the serialized URL, so the driver opens and matches this one string.
 */
export function prefixedPageUrl(url: string, prefix: string): string {
  const pageUrl = new URL(url)
  pageUrl.searchParams.set('prefix', prefix)
  return pageUrl.href
}

/** The port to reverse to the device for a `localhost` page, the scheme's default when the URL has none. */
export function localhostPort(url: string): string | undefined {
  const {hostname, port, protocol} = new URL(url)
  if (hostname !== 'localhost') {
    return undefined
  }
  if (port !== '') {
    return port
  }
  return protocol === 'https:' ? '443' : '80'
}
