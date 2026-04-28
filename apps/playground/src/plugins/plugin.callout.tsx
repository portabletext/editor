import {defineContainer, defineLeaf} from '@portabletext/editor'
import {ContainerPlugin, LeafPlugin} from '@portabletext/editor/plugins'
import type {JSX} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

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
  const common = {
    'aria-hidden': true,
    'className': 'h-4 w-4 shrink-0',
    'fill': 'none',
    'stroke': 'currentColor',
    'strokeWidth': 2,
    'strokeLinecap': 'round' as const,
    'strokeLinejoin': 'round' as const,
    'viewBox': '0 0 24 24',
  }
  switch (tone) {
    case 'tip':
      return (
        <svg {...common}>
          <title>Tip</title>
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2Z" />
        </svg>
      )
    case 'important':
      return (
        <svg {...common}>
          <title>Important</title>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
        </svg>
      )
    case 'warning':
      return (
        <svg {...common}>
          <title>Warning</title>
          <path d="M12 3 2 21h20L12 3Z" />
          <path d="M12 10v5" />
          <circle cx="12" cy="18" r="0.5" fill="currentColor" />
        </svg>
      )
    case 'caution':
      return (
        <svg {...common}>
          <title>Caution</title>
          <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <title>Note</title>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <circle cx="12" cy="16" r="0.5" fill="currentColor" />
        </svg>
      )
  }
}

const calloutContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..callout',
  field: 'content',
  render: ({attributes, children, node}) => {
    const tone = typeof node.tone === 'string' ? node.tone : 'note'
    const toneStyle = toneClassName[tone] ?? defaultToneClassName
    return (
      <aside
        {...attributes}
        className={`my-3 flex gap-2.5 rounded-md border-l-4 px-4 py-3 ${toneStyle}`}
      >
        <span
          contentEditable={false}
          className="mt-[0.3rem] flex shrink-0 items-center justify-center"
        >
          <ToneIcon tone={tone} />
        </span>
        <div className="min-w-0 flex-1">{children}</div>
      </aside>
    )
  },
})

const calloutBlockContainer = defineContainer<
  typeof playgroundSchemaDefinition
>({
  scope: '$..callout.block',
  field: 'children',
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
})

const calloutImageLeaf = defineLeaf<typeof playgroundSchemaDefinition>({
  scope: '$..callout.image',
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

export function CalloutPlugin(): JSX.Element {
  return (
    <>
      <ContainerPlugin containers={[calloutContainer, calloutBlockContainer]} />
      <LeafPlugin leafs={[calloutImageLeaf]} />
    </>
  )
}
