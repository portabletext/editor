import {defineInlineObject} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {ActivityIcon, AtSignIcon} from 'lucide-react'
import type {JSX} from 'react'
import {tv} from 'tailwind-variants'

const stockTickerStyle = tv({
  base: 'max-w-30 inline-flex items-center gap-1 border-2 border-gray-300 dark:border-gray-600 rounded px-1 font-mono text-xs',
  variants: {
    selected: {
      true: 'border-blue-300 dark:border-blue-600',
    },
    focused: {
      true: 'bg-blue-100 dark:bg-blue-800/60',
    },
  },
})

const mentionStyle = tv({
  base: 'inline-flex items-center gap-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded px-1 text-sm',
  variants: {
    selected: {
      true: 'ring-2 ring-blue-300 dark:ring-blue-600',
    },
    focused: {
      true: 'bg-blue-200 dark:bg-blue-700/70',
    },
  },
})

const inlineImageStyle = tv({
  base: 'max-w-35 grid grid-cols-[auto_1fr] items-start gap-1 border-2 border-gray-300 dark:border-gray-600 rounded text-sm',
  variants: {
    selected: {
      true: 'border-blue-300 dark:border-blue-600',
    },
    focused: {
      true: 'bg-blue-100 dark:bg-blue-800/60',
    },
  },
})

const stockTickerLeaf = defineInlineObject({
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

const mentionLeaf = defineInlineObject({
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

const inlineImageLeaf = defineInlineObject({
  type: 'image',
  render: ({attributes, children, node, focused, readOnly, selected}) => {
    const image = node as {src?: string; alt?: string}
    return (
      <span {...attributes}>
        {children}
        <span
          draggable={!readOnly}
          className={inlineImageStyle({focused, selected})}
        >
          <span className="bg-gray-100 dark:bg-gray-700 size-5 overflow-clip flex items-center justify-center">
            <img
              className="object-scale-down max-w-full"
              src={image.src}
              alt={image.alt ?? ''}
            />
          </span>
          <span className="text-ellipsis overflow-hidden whitespace-nowrap">
            {image.src}
          </span>
        </span>
      </span>
    )
  },
})

export function InlineObjectsPlugin(): JSX.Element {
  return <NodePlugin nodes={[stockTickerLeaf, mentionLeaf, inlineImageLeaf]} />
}
