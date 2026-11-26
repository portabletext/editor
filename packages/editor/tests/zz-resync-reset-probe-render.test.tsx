import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {createRoot} from 'react-dom/client'
import {afterEach, beforeEach, describe, onTestFinished, test, vi} from 'vitest'
import {cdp, commands, server, userEvent} from 'vitest/browser'
import {EditorProvider, PortableTextEditable, type Editor} from '../src'
import {EditorRefPlugin} from '../src/plugins/plugin.editor-ref'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineSpan, defineTextBlock} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {textBlock} from '../test-utils/load-depths'

type Mode = 'update value' | 'resync'
const modes: Array<Mode> = ['update value', 'resync']
const blockCount = 10_000
const repetitions = 5

const errors: Array<string> = []
let restoreConsole: (() => void) | undefined

beforeEach(() => {
  errors.length = 0
  const original = console.error
  console.error = (...args: Array<unknown>) => {
    errors.push(args.map((arg) => String(arg)).join(' ').slice(0, 200))
  }
  const onError = (event: ErrorEvent) => {
    errors.push(`window.onerror: ${event.message}`.slice(0, 200))
  }
  window.addEventListener('error', onError)
  restoreConsole = () => {
    console.error = original
    window.removeEventListener('error', onError)
  }
})

afterEach(() => {
  restoreConsole?.()
})

function frame() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  )
}

async function row(name: string, data: Record<string, unknown>) {
  await commands.writeFile(
    `.probe-rows/${name.replace(/ /g, '-')}.json`,
    JSON.stringify({...data, errors: [...errors]}),
  )
}

function median(numbers: Array<number>) {
  const sorted = [...numbers].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]!
}

const counters = {block: 0, span: 0}

const renderNodes = [
  defineTextBlock({
    type: 'block',
    render: (props) => {
      counters.block++
      return props.renderDefault(props)
    },
  }),
  defineSpan({
    type: 'span',
    render: (props) => {
      counters.span++
      return props.renderDefault(props)
    },
  }),
]

describe('resync reset probe: rendering', () => {
  const variants = ['all new objects', 'only the changed span cloned'] as const
  test.each(
    modes.flatMap((mode) => variants.map((variant) => ({mode, variant}))),
  )(
    'render $mode $variant',
    async ({mode, variant}) => {
      const keyGenerator = createTestKeyGenerator()
      const keys = Array.from({length: blockCount}, () => ({
        blockKey: keyGenerator(),
        spanKey: keyGenerator(),
      }))
      const target = Math.floor(blockCount / 2)
      let held: Array<PortableTextBlock> = keys.map(({blockKey, spanKey}) =>
        textBlock(blockKey, spanKey, 'foo'),
      )
      const lastKey = keys[blockCount - 1]!.blockKey
      const editorRef = React.createRef<Editor>()
      const container = document.body.appendChild(document.createElement('div'))
      const root = createRoot(container)
      onTestFinished(() => {
        root.unmount()
        container.remove()
      })
      root.render(
        <EditorProvider
          initialConfig={{
            keyGenerator,
            schemaDefinition: defineSchema({}),
            initialValue: held,
          }}
        >
          <EditorRefPlugin ref={editorRef} />
          <PortableTextEditable />
          <NodePlugin nodes={renderNodes} />
        </EditorProvider>,
      )
      await vi.waitFor(
        () => {
          if (!editorRef.current) {
            throw new Error('editor not mounted')
          }
        },
        {timeout: 30_000, interval: 50},
      )
      const editor = editorRef.current!
      const initialStart = performance.now()
      await vi.waitFor(
        () => {
          if (!document.querySelector(`[data-pt-path*="${lastKey}"]`)) {
            throw new Error('last block not drawn')
          }
        },
        {timeout: 120_000, interval: 50},
      )
      const initialDrawMs = performance.now() - initialStart
      await frame()

      const samples: Array<{
        blockRenders: number
        spanRenders: number
        settledBlockRenders: number
        settledSpanRenders: number
        paintMs: number
      }> = []
      for (let iteration = 0; iteration < repetitions; iteration++) {
        const text = `foo${iteration}`
        const next: Array<PortableTextBlock> =
          variant === 'all new objects'
            ? structuredClone(held)
            : held.map((block) => block)
        const original = next[target] as {
          children: Array<{_key: string; _type: string; text: string; marks: Array<string>}>
        } & PortableTextBlock
        next[target] = {
          ...original,
          children: [{...original.children[0]!, text}],
        } as PortableTextBlock
        if (variant === 'all new objects') {
          const clonedTarget = structuredClone(next[target]) as {
            children: Array<{text: string}>
          }
          clonedTarget.children[0]!.text = text
          next[target] = clonedTarget as unknown as PortableTextBlock
        }
        counters.block = 0
        counters.span = 0
        const start = performance.now()
        editor.send(
          mode === 'resync'
            ? {type: 'resync', value: next}
            : {type: 'update value', value: next},
        )
        await frame()
        const paintMs = performance.now() - start
        const blockRenders = counters.block
        const spanRenders = counters.span
        await frame()
        await frame()
        await frame()
        samples.push({
          blockRenders,
          spanRenders,
          settledBlockRenders: counters.block,
          settledSpanRenders: counters.span,
          paintMs: Math.round(paintMs),
        })
        held = next
      }
      await row(`render_${mode}_${variant}`, {
        kind: 'render',
        mode,
        variant,
        blockCount,
        initialDrawMs: Math.round(initialDrawMs),
        samples,
        medianPaintMs: median(samples.map((sample) => sample.paintMs)),
        valueIsLast: (
          editor.getSnapshot().context.value[target] as unknown as {
            children: Array<{text: string}>
          }
        ).children[0]!.text,
      })
    },
    600_000,
  )
})

const isChromium = server.browser === 'chromium'

function enableCompositionKeyEvents() {
  window.addEventListener(
    'compositionstart',
    () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'Unidentified',
          keyCode: 229,
        }),
      )
    },
    true,
  )
}

describe.skipIf(!isChromium)('resync reset probe: composition', () => {
  const imeCases = [
    {mode: 'none' as const, resyncCase: 'no resync (control)' as const},
    {mode: 'update value' as const, resyncCase: 'equal' as const},
    {mode: 'resync' as const, resyncCase: 'equal' as const},
    {mode: 'update value' as const, resyncCase: 'other block text changed' as const},
    {mode: 'resync' as const, resyncCase: 'other block text changed' as const},
  ]
  test.each(imeCases)(
    'composition $mode $resyncCase',
    async ({mode, resyncCase}) => {
      const keyGenerator = createTestKeyGenerator()
      const keys = Array.from({length: 3}, () => ({
        blockKey: keyGenerator(),
        spanKey: keyGenerator(),
      }))
      const initial = keys.map(({blockKey, spanKey}) =>
        textBlock(blockKey, spanKey, 'foo bar'),
      )
      const {editor, locator} = await createTestEditor({
        keyGenerator,
        schemaDefinition: defineSchema({}),
        initialValue: initial,
      })
      const spanPath = [
        {_key: keys[1]!.blockKey},
        'children',
        {_key: keys[1]!.spanKey},
      ]
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: spanPath, offset: 7},
          focus: {path: spanPath, offset: 7},
        },
      })
      await frame()
      enableCompositionKeyEvents()
      const compositionEvents: Array<string> = []
      for (const name of ['compositionstart', 'compositionupdate', 'compositionend']) {
        document.addEventListener(name, () => compositionEvents.push(name), true)
      }
      const session = cdp()
      await session.send('Input.imeSetComposition', {
        text: 'ｓ',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await frame()
      await session.send('Input.imeSetComposition', {
        text: 'す',
        selectionStart: 1,
        selectionEnd: 1,
      })
      await frame()
      const valueMidComposition = editor.getSnapshot().context.value
      const eventsBefore = compositionEvents.length

      if (mode !== 'none') {
        const next = structuredClone(valueMidComposition) as Array<PortableTextBlock>
        if (resyncCase === 'other block text changed') {
          ;(next[0] as unknown as {children: Array<{text: string}>}).children[0]!.text =
            'foo baz'
        }
        editor.send(
          mode === 'resync'
            ? {type: 'resync', value: next}
            : {type: 'update value', value: next},
        )
      }
      await frame()
      await frame()
      const compositionEventsAfterSync = compositionEvents.slice(eventsBefore)
      const domTextAfterSync = document.querySelector(
        `[data-pt-path*="${keys[1]!.blockKey}"]`,
      )?.textContent
      const valueAfterSync = editor.getSnapshot().context.value
      const selectionAfterSync = editor.getSnapshot().context.selection

      let continueError: string | undefined
      try {
        await session.send('Input.imeSetComposition', {
          text: 'すし',
          selectionStart: 2,
          selectionEnd: 2,
        })
        await frame()
        await session.send('Input.insertText', {text: 'すし'})
        await frame()
        await frame()
      } catch (error) {
        continueError = String(error)
      }
      await row(`composition_${mode}_${resyncCase}`, {
        kind: 'composition',
        mode,
        case: resyncCase,
        compositionEventsBeforeSync: eventsBefore,
        compositionEventsAfterSync,
        domTextAfterSync,
        valueAfterSync: JSON.stringify(
          valueAfterSync.map((block) =>
            (block as unknown as {children: Array<{text: string}>}).children.map(
              (child) => child.text,
            ),
          ),
        ),
        selectionAfterSync: JSON.stringify(selectionAfterSync?.anchor.offset),
        compositionEventsAll: compositionEvents,
        continueError,
        finalValue: JSON.stringify(
          editor.getSnapshot().context.value.map((block) =>
            (block as unknown as {children: Array<{text: string}>}).children.map(
              (child) => child.text,
            ),
          ),
        ),
      })
    },
    60_000,
  )
})

export type {Editor}
