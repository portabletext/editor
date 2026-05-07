import {defineContainer} from '@portabletext/editor'
import type {PortableTextTextBlock} from '@portabletext/editor'
import {ContainerPlugin} from '@portabletext/editor/plugins'
import {Code2Icon, WorkflowIcon} from 'lucide-react'
import type {JSX, ReactElement} from 'react'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {playgroundSchemaDefinition} from '../playground-schema-definition'

type MermaidApi = {
  initialize: (config: Record<string, unknown>) => void
  parse: (code: string) => Promise<unknown>
  render: (
    id: string,
    code: string,
  ) => Promise<{svg: string; bindFunctions?: (el: HTMLElement) => void}>
}

let mermaidPromise: Promise<MermaidApi> | undefined

function loadMermaid(): Promise<MermaidApi> {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((module) => {
      const api = module.default as MermaidApi
      api.initialize({startOnLoad: false, securityLevel: 'loose'})
      return api
    })
  }
  return mermaidPromise
}

function extractSource(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return ''
  }
  const code = (node as {code?: unknown}).code
  if (!Array.isArray(code)) {
    return ''
  }
  const lines: Array<string> = []
  for (const block of code) {
    if (
      !block ||
      typeof block !== 'object' ||
      (block as {_type?: unknown})._type !== 'block'
    ) {
      lines.push('')
      continue
    }
    const children = (block as PortableTextTextBlock).children
    let text = ''
    if (Array.isArray(children)) {
      for (const child of children) {
        if (
          child &&
          typeof child === 'object' &&
          (child as {_type?: unknown})._type === 'span' &&
          typeof (child as {text?: unknown}).text === 'string'
        ) {
          text += (child as {text: string}).text
        }
      }
    }
    lines.push(text)
  }
  return lines.join('\n')
}

let renderId = 0
function nextRenderId(): string {
  renderId += 1
  return `pt-mermaid-${renderId}`
}

type ViewMode = 'diagram' | 'code'

function MermaidDiagram({
  source,
  onError,
}: {
  source: string
  onError: () => void
}): JSX.Element {
  const isEmpty = !source.trim()
  const [svg, setSvg] = useState<string | undefined>()
  const [error, setError] = useState<string | undefined>()
  const idRef = useRef<string | null>(null)
  if (idRef.current === null) {
    idRef.current = nextRenderId()
  }

  useEffect(() => {
    if (isEmpty) {
      return
    }
    let cancelled = false

    loadMermaid()
      .then(async (mermaid) => {
        if (cancelled) {
          return
        }
        try {
          await mermaid.parse(source)
          const result = await mermaid.render(idRef.current ?? '', source)
          if (cancelled) {
            return
          }
          setSvg(result.svg)
          setError(undefined)
        } catch (renderError) {
          if (cancelled) {
            return
          }
          const message =
            renderError instanceof Error
              ? renderError.message
              : String(renderError)
          setError(message)
          setSvg(undefined)
        }
      })
      .catch((loadError) => {
        if (cancelled) {
          return
        }
        const message =
          loadError instanceof Error ? loadError.message : String(loadError)
        setError(`Failed to load Mermaid: ${message}`)
        setSvg(undefined)
      })

    return () => {
      cancelled = true
    }
  }, [source, isEmpty])

  if (isEmpty) {
    return (
      <div className="p-4 text-slate-500 text-sm dark:text-slate-400">
        Empty diagram. Switch to code view to write Mermaid source.
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col gap-2 p-4 text-sm">
        <div className="font-medium text-rose-600 dark:text-rose-400">
          Mermaid render error
        </div>
        <pre className="whitespace-pre-wrap font-mono text-rose-700 text-xs dark:text-rose-300">
          {error}
        </pre>
        <button
          type="button"
          onClick={onError}
          className="self-start rounded border border-slate-300 px-2 py-1 text-slate-600 text-xs hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          Switch to code view
        </button>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="p-4 text-slate-500 text-sm dark:text-slate-400">
        Rendering…
      </div>
    )
  }

  return (
    <div
      className="flex justify-center p-4"
      dangerouslySetInnerHTML={{__html: svg}}
    />
  )
}

function MermaidContainerView({
  attributes,
  children,
  node,
  selected,
}: {
  attributes: Record<string, unknown>
  children: ReactElement
  node: unknown
  selected: boolean
}): JSX.Element {
  const source = useMemo(() => extractSource(node), [node])
  const [mode, setMode] = useState<ViewMode>(() =>
    source.trim() ? 'diagram' : 'code',
  )

  const toCode = useCallback(() => setMode('code'), [])
  const toDiagram = useCallback(() => setMode('diagram'), [])

  return (
    <div
      {...attributes}
      data-selected={selected ? '' : undefined}
      className="relative my-3 rounded-md border border-slate-200 bg-slate-50 transition-shadow data-[selected]:border-slate-400 data-[selected]:shadow-md dark:border-slate-700 dark:bg-slate-800/60 dark:data-[selected]:border-slate-500"
    >
      <div
        contentEditable={false}
        className="absolute top-2 right-2 z-10 flex gap-1"
      >
        <button
          type="button"
          onClick={mode === 'diagram' ? toCode : toDiagram}
          title={mode === 'diagram' ? 'Edit code' : 'Show diagram'}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-slate-600 text-xs hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-700"
        >
          {mode === 'diagram' ? (
            <Code2Icon aria-hidden className="h-3.5 w-3.5" />
          ) : (
            <WorkflowIcon aria-hidden className="h-3.5 w-3.5" />
          )}
        </button>
      </div>

      {mode === 'diagram' ? (
        <>
          <div contentEditable={false}>
            <MermaidDiagram source={source} onError={toCode} />
          </div>
          <div className="hidden">{children}</div>
        </>
      ) : (
        <pre className="overflow-x-auto p-3 pr-12 font-mono text-slate-700 text-sm leading-relaxed dark:text-slate-200">
          {children}
        </pre>
      )}
    </div>
  )
}

const mermaidContainer = defineContainer<typeof playgroundSchemaDefinition>({
  scope: '$..mermaid',
  field: 'code',
  render: ({attributes, children, node, selected}) => (
    <MermaidContainerView
      attributes={attributes}
      node={node}
      selected={selected}
    >
      {children}
    </MermaidContainerView>
  ),
})

export function MermaidPlugin(): JSX.Element {
  return <ContainerPlugin containers={[mermaidContainer]} />
}
