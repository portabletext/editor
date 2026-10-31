// Parse uiautomator XML hierarchy dumps. A strict little parser for the dump's shape: nested elements
// with quoted attributes and the five XML entities. Malformed input throws.

export type XmlNode = {tag: string; attrs: Record<string, string>}

/** Map of content-desc, or text when that is empty, to bounds center for every node of `packageName`. First wins. */
export function packageKeys(xml: string, packageName: string): Map<string, [number, number]> {
  const keys = new Map<string, [number, number]>()
  for (const node of parseXml(xml)) {
    if (node.tag !== 'node' || node.attrs.package !== packageName) continue
    const label = node.attrs['content-desc'] || node.attrs.text
    if (!label) continue
    const [left, top, right, bottom] = node.attrs.bounds!.replaceAll('][', ',').replace(/^[[\]]+|[[\]]+$/g, '').split(',').map((coordinate) => {
      if (!/^\s*[+-]?\d+\s*$/.test(coordinate)) throw new Error(`invalid bounds ${node.attrs.bounds}`)
      return Number(coordinate)
    }) as [number, number, number, number]
    if (!keys.has(label)) keys.set(label, [Math.floor((left + right) / 2), Math.floor((top + bottom) / 2)])
  }
  return keys
}

/** Every element in document order. */
export function parseXml(xml: string): XmlNode[] {
  const nodes: XmlNode[] = []
  const stack: string[] = []
  let rootSeen = false
  const tag = /<(\?[\s\S]*?\?>|!--[\s\S]*?-->|\/([\w:.-]+)\s*>|([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>)/g
  let at = 0
  for (let match = tag.exec(xml); match; match = tag.exec(xml)) {
    if (xml.slice(at, match.index).includes('<')) throw new Error(`malformed XML near offset ${at}`)
    at = tag.lastIndex
    if (match[1]!.startsWith('?') || match[1]!.startsWith('!')) continue
    if (match[2]) {
      if (stack.pop() !== match[2]) throw new Error(`mismatched </${match[2]}> at offset ${match.index}`)
      continue
    }
    if (stack.length === 0 && rootSeen) throw new Error('junk after document element')
    rootSeen = true
    const attrs: Record<string, string> = {}
    for (const attribute of match[4]!.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[attribute[1]!] = unescape(attribute[2] ?? attribute[3] ?? '')
    nodes.push({tag: match[3]!, attrs})
    if (!match[5]) stack.push(match[3]!)
  }
  if (xml.slice(at).includes('<')) throw new Error(`malformed XML near offset ${at}`)
  if (!rootSeen) throw new Error('no element found')
  if (stack.length) throw new Error(`unclosed <${stack.at(-1)}>`)
  return nodes
}

const ENTITIES: Record<string, string> = {amp: '&', lt: '<', gt: '>', quot: '"', apos: "'"}

// Literal tabs and newlines in an attribute value read as spaces, character references do not.
function unescape(value: string): string {
  return value.replace(/\r\n|[\t\n\r]/g, ' ').replace(/&(#x[0-9a-fA-F]+|#\d+|\w+);/g, (whole, name: string) => {
    if (name.startsWith('#x')) return String.fromCodePoint(parseInt(name.slice(2), 16))
    if (name.startsWith('#')) return String.fromCodePoint(parseInt(name.slice(1), 10))
    const entity = ENTITIES[name]
    if (entity === undefined) throw new Error(`undefined entity ${whole}`)
    return entity
  })
}
