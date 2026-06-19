import {
  defineBlockObject,
  defineContainer,
  defineTextBlock,
} from '@portabletext/editor'
import {NodePlugin} from '@portabletext/editor/plugins'
import {
  InfoIcon,
  LightbulbIcon,
  MessageSquareWarningIcon,
  OctagonAlertIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import type {JSX} from 'react'
import {DragHandle} from './drag-handle'

const toneClassName: Record<string, string> = {
  note: 'border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  tip: 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  important:
    'border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100',
  warning:
    'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  caution:
    'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
}

const defaultToneClassName = toneClassName.note!

function ToneIcon({tone}: {tone: string}): JSX.Element {
  const className = 'h-4 w-4 shrink-0'
  switch (tone) {
    case 'tip':
      return <LightbulbIcon aria-hidden className={className} />
    case 'important':
      return <MessageSquareWarningIcon aria-hidden className={className} />
    case 'warning':
      return <TriangleAlertIcon aria-hidden className={className} />
    case 'caution':
      return <OctagonAlertIcon aria-hidden className={className} />
    default:
      return <InfoIcon aria-hidden className={className} />
  }
}

const calloutImageLeaf = defineBlockObject({
  type: 'image',
  render: ({attributes, children, node, focused, selected}) => {
    const image = node as {src?: string; alt?: string}
    return (
      <span
        {...attributes}
        className={[
          'my-1 inline-flex items-center justify-center overflow-hidden rounded border border-amber-300 dark:border-amber-700',
          selected
            ? 'outline outline-2 outline-amber-500 dark:outline-amber-400'
            : '',
          focused ? 'bg-amber-100 dark:bg-amber-900/40' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <img
          src={image.src}
          alt={image.alt ?? ''}
          contentEditable={false}
          className="h-16 w-auto object-contain"
        />
        {children}
      </span>
    )
  },
})

const calloutContainer = defineContainer({
  type: 'callout',
  arrayField: 'content',
  render: ({attributes, children, node, readOnly, selected}) => {
    const tone = typeof node.tone === 'string' ? node.tone : 'note'
    const toneStyle = toneClassName[tone] ?? defaultToneClassName
    return (
      <aside
        {...attributes}
        data-selected={selected ? '' : undefined}
        className={`group relative my-3 flex gap-2.5 rounded-md border-l-4 p-3 transition-shadow data-[selected]:shadow-md ${toneStyle}`}
      >
        <span
          contentEditable={false}
          className="mt-[0.3rem] flex shrink-0 items-center justify-center"
        >
          <ToneIcon tone={tone} />
        </span>
        <div className="min-w-0 flex-1 cursor-text">{children}</div>
        <DragHandle readOnly={readOnly} />
      </aside>
    )
  },
  of: [
    defineTextBlock({
      type: 'block',
      render: ({attributes, children, node}) => {
        if (node.listItem !== undefined) {
          return (
            <div {...attributes} className="my-1">
              {children}
            </div>
          )
        }

        switch (node.style) {
          case 'h1':
            return (
              <h1 {...attributes} className="my-2 font-bold text-2xl">
                {children}
              </h1>
            )
          case 'h2':
            return (
              <h2 {...attributes} className="my-2 font-bold text-xl">
                {children}
              </h2>
            )
          case 'h3':
            return (
              <h3 {...attributes} className="my-2 font-bold text-lg">
                {children}
              </h3>
            )
          case 'blockquote':
            return (
              <blockquote
                {...attributes}
                className="my-1 border-l-2 border-amber-600 pl-2 italic dark:border-amber-300"
              >
                {children}
              </blockquote>
            )
          default:
            return (
              <p {...attributes} className="my-1">
                {children}
              </p>
            )
        }
      },
    }),
    calloutImageLeaf,
  ],
})

export function CalloutPlugin(): JSX.Element {
  return <NodePlugin nodes={[calloutContainer]} />
}
