import type {ReactNode} from 'react'

/**
 * Lightweight grayscale JSON syntax highlighter. Produces an array of
 * React nodes with class names that map to subtle weight + color shifts
 * via the theme tokens. Avoids any hue - keys are slightly darker and
 * bolder, strings get a thin underline weight, numbers/booleans stay
 * muted. The point is hierarchy without rainbows.
 */
export function highlightJson(source: string): Array<ReactNode> {
  const nodes: Array<ReactNode> = []
  const regex =
    /("(?:\\.|[^\\"])*")(\s*:)|("(?:\\.|[^\\"])*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

  let cursor = 0
  let key = 0
  for (const match of source.matchAll(regex)) {
    const start = match.index ?? 0
    if (start > cursor) {
      nodes.push(source.slice(cursor, start))
    }
    if (match[1] && match[2]) {
      nodes.push(
        <span key={key++} className="pc-json-key">
          {match[1]}
        </span>,
      )
      nodes.push(match[2])
    } else if (match[3]) {
      nodes.push(
        <span key={key++} className="pc-json-string">
          {match[3]}
        </span>,
      )
    } else if (match[4]) {
      nodes.push(
        <span key={key++} className="pc-json-literal">
          {match[4]}
        </span>,
      )
    } else if (match[5]) {
      nodes.push(
        <span key={key++} className="pc-json-number">
          {match[5]}
        </span>,
      )
    }
    cursor = start + match[0].length
  }
  if (cursor < source.length) {
    nodes.push(source.slice(cursor))
  }
  return nodes
}
