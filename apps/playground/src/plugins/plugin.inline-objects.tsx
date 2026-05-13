import {defineLeaf} from '@portabletext/editor'
import {LeafPlugin} from '@portabletext/editor/plugins'
import {ActivityIcon, AtSignIcon} from 'lucide-react'
import type {JSX} from 'react'
import {tv} from 'tailwind-variants'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

const stockTickerStyle = tv({
  base: 'max-w-30 inline-flex items-center gap-1 border-2 border-gray-300 dark:border-gray-600 rounded px-1 font-mono text-xs',
  variants: {
    selected: {true: 'border-blue-300 dark:border-blue-600'},
    focused: {true: 'bg-blue-100 dark:bg-blue-800/60'},
  },
})

const mentionStyle = tv({
  base: 'inline-flex items-center gap-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded px-1 text-sm',
  variants: {
    selected: {true: 'ring-2 ring-blue-300 dark:ring-blue-600'},
    focused: {true: 'bg-blue-200 dark:bg-blue-700/70'},
  },
})

const stockTickerLeaf = defineLeaf<typeof playgroundSchemaDefinition>({
  type: 'stock-ticker',
  render: ({attributes, children, node, focused, readOnly, selected}) => {
    const stockTicker = node as {symbol?: string}
    return (
      <span {...attributes}>
        {children}
        <span
          draggable={!readOnly}
          className={stockTickerStyle({focused, selected})}
        >
          <ActivityIcon className="size-3 shrink-0" />
          {stockTicker.symbol}
        </span>
      </span>
    )
  },
})

const mentionLeaf = defineLeaf<typeof playgroundSchemaDefinition>({
  type: 'mention',
  render: ({attributes, children, node, focused, readOnly, selected}) => {
    const mention = node as {username?: string}
    return (
      <span {...attributes}>
        {children}
        <span
          draggable={!readOnly}
          className={mentionStyle({focused, selected})}
        >
          <AtSignIcon className="size-3" />
          {mention.username}
        </span>
      </span>
    )
  },
})

// The legacy `$..block.image` inline-image override is now handled by
// the global `image` defineLeaf which branches on `isInline` in its
// render function (see plugin.image.tsx).

export function InlineObjectsPlugin(): JSX.Element {
  return <LeafPlugin leafs={[stockTickerLeaf, mentionLeaf]} />
}
