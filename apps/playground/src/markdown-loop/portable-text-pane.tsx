import type {PortableTextBlock} from '@portabletext/editor'
import {Fragment, type ReactNode} from 'react'
import type {KeyDelta} from './loop-state'

export function PortableTextPane(props: {
  value: Array<PortableTextBlock>
  keyDelta: KeyDelta | null
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Portable Text
        </h2>
        <span className="text-[11px] italic text-gray-400 dark:text-gray-500">
          storage
        </span>
      </div>
      <pre className="flex-1 overflow-auto px-3 py-2 font-mono text-xs text-gray-600 dark:text-gray-300">
        {renderJsonValue(props.value, 0, props.keyDelta?.freshKeys ?? null)}
      </pre>
      {props.keyDelta ? (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-1.5 text-[11px] text-gray-500 dark:text-gray-400">
          <span className="font-medium text-amber-700 dark:text-amber-400">
            {props.keyDelta.freshCount} fresh{' '}
            {props.keyDelta.freshCount === 1 ? 'key' : 'keys'}
          </span>{' '}
          · {props.keyDelta.adoptedCount} adopted
        </div>
      ) : null}
    </section>
  )
}

/**
 * A hand-rolled pretty-printer, not `shiki`: it needs to single out
 * `_key` values as their own nodes so a sync's fresh keys can be
 * wrapped in a highlight span, which a generic syntax highlighter has
 * no notion of. Each recursive call gets its own `Fragment` key from a
 * counter local to this top-level call, not the sibling's array index:
 * the tree is rebuilt from scratch every render, so nothing is ever
 * reordered, but a plain index still reads as one to the linter.
 */
function renderJsonValue(
  value: unknown,
  indent: number,
  freshKeys: ReadonlySet<string> | null,
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
              {JSON.stringify(field)}
              {': '}
              {field === '_key' && typeof fieldValue === 'string' ? (
                <KeySpan value={fieldValue} freshKeys={freshKeys} />
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

    return JSON.stringify(node) ?? 'null'
  }
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
