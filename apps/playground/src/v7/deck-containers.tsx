import {defineContainer, defineTextBlock} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {
  AlertTriangleIcon,
  InfoIcon,
  LightbulbIcon,
  MessageSquareWarningIcon,
  OctagonAlertIcon,
} from 'lucide-react'
import type {JSX} from 'react'
import {CodeHighlight} from './code-highlight'

const toneStyles: Record<
  string,
  {className: string; icon: typeof InfoIcon; label: string}
> = {
  note: {
    className:
      'border-sky-400 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
    icon: InfoIcon,
    label: 'Note',
  },
  tip: {
    className:
      'border-emerald-400 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
    icon: LightbulbIcon,
    label: 'Tip',
  },
  important: {
    className:
      'border-violet-400 bg-violet-50 text-violet-900 dark:bg-violet-950/40 dark:text-violet-100',
    icon: MessageSquareWarningIcon,
    label: 'Important',
  },
  warning: {
    className:
      'border-amber-400 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
    icon: AlertTriangleIcon,
    label: 'Warning',
  },
  caution: {
    className:
      'border-rose-400 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-100',
    icon: OctagonAlertIcon,
    label: 'Caution',
  },
}

function richTextBlock() {
  return defineTextBlock({
    type: 'block',
    render: ({attributes, children, node}) => {
      if (node.listItem !== undefined) {
        return (
          <div {...attributes} className="my-1.5">
            {children}
          </div>
        )
      }
      switch (node.style) {
        case 'h1':
          return (
            <h1
              {...attributes}
              className="mt-3 mb-2 font-bold text-2xl tracking-tight"
            >
              {children}
            </h1>
          )
        case 'h2':
          return (
            <h2
              {...attributes}
              className="mt-3 mb-1 font-semibold text-xl tracking-tight"
            >
              {children}
            </h2>
          )
        case 'h3':
          return (
            <h3
              {...attributes}
              className="mt-2 mb-1 font-semibold text-lg tracking-tight"
            >
              {children}
            </h3>
          )
        default:
          return (
            <p {...attributes} className="my-1.5 leading-relaxed">
              {children}
            </p>
          )
      }
    },
  })
}

const calloutContainer = defineContainer({
  type: 'callout',
  childField: 'content',
  render: ({attributes, children, node, selected}) => {
    const tone = typeof node.tone === 'string' ? node.tone : 'note'
    const style = toneStyles[tone] ?? toneStyles.note!
    const Icon = style.icon
    return (
      <aside
        {...attributes}
        data-selected={selected ? '' : undefined}
        className={`my-5 flex gap-3 rounded-lg border-l-4 px-5 py-4 transition-shadow data-[selected]:shadow-md ${style.className}`}
      >
        <span
          contentEditable={false}
          className="mt-1 flex shrink-0 items-center justify-center"
        >
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div
            contentEditable={false}
            className="mb-1 font-mono text-xs uppercase tracking-wider opacity-70"
          >
            {style.label}
          </div>
          {children}
        </div>
      </aside>
    )
  },
  of: [richTextBlock()],
})

const codeBlockContainer = defineContainer({
  type: 'code-block',
  childField: 'lines',
  render: ({attributes, children, node, selected}) => {
    const language =
      typeof node.language === 'string' ? node.language : 'typescript'
    return (
      <CodeHighlight
        attributes={attributes}
        selected={selected}
        language={language}
      >
        {children}
      </CodeHighlight>
    )
  },
})

const tableContainer = defineContainer({
  type: 'table',
  childField: 'rows',
  render: ({attributes, children, node, selected}) => {
    const headerRows = typeof node.headerRows === 'number' ? node.headerRows : 0
    // On narrow viewports the table renders as a scrollable block so wide
    // technical comparisons pan horizontally instead of clipping. Resets
    // to a normal full-width table at the sm breakpoint and above.
    return (
      <table
        {...attributes}
        data-header-rows={headerRows}
        data-selected={selected ? '' : undefined}
        data-deck-no-swipe=""
        className="deck-table my-5 block max-w-full overflow-x-auto border-collapse rounded-lg border border-stone-300 text-sm sm:table sm:w-full sm:overflow-hidden sm:text-base dark:border-stone-700"
      >
        <tbody>{children}</tbody>
      </table>
    )
  },
  of: [
    defineContainer({
      type: 'row',
      childField: 'cells',
      render: ({attributes, children, selected}) => (
        <tr {...attributes} data-selected={selected ? '' : undefined}>
          {children}
        </tr>
      ),
      of: [
        {
          kind: 'container',
          type: 'cell',
          childField: 'content',
          render: ({attributes, children, selected}) => (
            <td
              {...attributes}
              data-selected={selected ? '' : undefined}
              className="border border-stone-300 px-2 py-1.5 align-top sm:px-3 sm:py-2 dark:border-stone-700"
            >
              {children}
            </td>
          ),
          of: [richTextBlock()],
        },
      ],
    }),
  ],
})

export function DeckContainerPlugins(): JSX.Element {
  return (
    <ContainerPlugin
      containers={[calloutContainer, codeBlockContainer, tableContainer]}
    />
  )
}
