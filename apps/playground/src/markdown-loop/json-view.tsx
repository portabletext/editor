import {Fragment, type ReactNode} from 'react'
import type {PreservedKeyBasis} from './report-summary'

const BASIS_DISPLAY: Partial<Record<PreservedKeyBasis, string>> = {
  'content-moved': 'moved',
  'content-split': 'split',
  'content-merged': 'merged',
  'same-position': 'positional',
  'similar-content': 'similar',
}

/**
 * A hand-rolled pretty-printer, not `shiki`: it needs to single out
 * `_key` values as their own nodes so a sync's fresh keys can be
 * wrapped in a highlight span and a restored key can carry its
 * reconciliation reason as a badge, which a generic syntax highlighter
 * has no notion of. Each recursive call gets its own `Fragment` key
 * from a counter local to this top-level call, not the sibling's array
 * index: the tree is rebuilt from scratch every render, so nothing is
 * ever reordered, but a plain index still reads as one to the linter.
 */
export function renderJsonValue(
  value: unknown,
  indent: number,
  freshKeys: ReadonlySet<string> | null,
  basisByKey?: ReadonlyMap<string, PreservedKeyBasis> | null,
): ReactNode {
  let nextFragmentId = 0
  return renderNode(value, indent)

  function renderNode(node: unknown, nodeIndent: number): ReactNode {
    if (Array.isArray(node)) {
      if (node.length === 0) {
        return '[]'
      }
      const pad = '  '.repeat(nodeIndent)
      const childPad = '  '.repeat(nodeIndent + 1)
      return (
        <>
          {'[\n'}
          {node.map((item, index) => (
            <Fragment key={nextFragmentId++}>
              {childPad}
              {renderNode(item, nodeIndent + 1)}
              {index < node.length - 1 ? ',\n' : '\n'}
            </Fragment>
          ))}
          {pad}
          {']'}
        </>
      )
    }

    if (node !== null && typeof node === 'object') {
      const entries = Object.entries(node)
      if (entries.length === 0) {
        return '{}'
      }
      const pad = '  '.repeat(nodeIndent)
      const childPad = '  '.repeat(nodeIndent + 1)
      return (
        <>
          {'{\n'}
          {entries.map(([field, fieldValue], index) => (
            <Fragment key={nextFragmentId++}>
              {childPad}
              <PropertyName>{JSON.stringify(field)}</PropertyName>
              {': '}
              {field === '_key' && typeof fieldValue === 'string' ? (
                <>
                  <KeySpan value={fieldValue} freshKeys={freshKeys} />
                  <ReasonBadge basis={basisByKey?.get(fieldValue) ?? null} />
                </>
              ) : (
                renderNode(fieldValue, nodeIndent + 1)
              )}
              {index < entries.length - 1 ? ',\n' : '\n'}
            </Fragment>
          ))}
          {pad}
          {'}'}
        </>
      )
    }

    if (typeof node === 'string') {
      return <StringLiteral>{JSON.stringify(node)}</StringLiteral>
    }

    return <ScalarLiteral>{JSON.stringify(node) ?? 'null'}</ScalarLiteral>
  }
}

/**
 * Hues lifted from `highlight-json-machine`'s `github-light`/`github-dark`
 * themes (property names and scalars share one hue, strings sit on a
 * second, darker-in-light/lighter-in-dark hue), so this hand-rolled
 * renderer and the shiki-highlighted Stored/Tidied tabs read as the
 * same JSON style.
 */
function PropertyName(props: {children: ReactNode}) {
  return (
    <span className="text-blue-700 dark:text-blue-300">{props.children}</span>
  )
}

function ScalarLiteral(props: {children: ReactNode}) {
  return (
    <span className="text-blue-700 dark:text-blue-300">{props.children}</span>
  )
}

function StringLiteral(props: {children: ReactNode}) {
  return (
    <span className="text-blue-900 dark:text-blue-200">{props.children}</span>
  )
}

function KeySpan(props: {
  value: string
  freshKeys: ReadonlySet<string> | null
}) {
  const isFresh = props.freshKeys?.has(props.value) ?? false
  return (
    <span
      className={
        isFresh
          ? 'rounded bg-amber-200 dark:bg-amber-900/60 px-0.5 text-amber-900 dark:text-amber-200'
          : undefined
      }
    >
      {JSON.stringify(props.value)}
    </span>
  )
}

function ReasonBadge(props: {basis: PreservedKeyBasis | null}) {
  const display = props.basis ? BASIS_DISPLAY[props.basis] : undefined
  if (!display) {
    return null
  }
  return (
    <span className="ms-1 rounded bg-gray-100 dark:bg-gray-700 px-1 align-middle font-mono text-[9px] text-gray-500 dark:text-gray-400">
      {display}
    </span>
  )
}
