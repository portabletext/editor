import {applyAll, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {useEffect} from 'react'
import {afterAll, describe, test, vi} from 'vitest'
import {server} from 'vitest/browser'
import type {Editor} from '../src'
import {useEditor} from '../src/editor/use-editor'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import {
  loadContainers,
  loadDepths,
  loadSchemaDefinition,
  textBlock,
} from '../test-utils/load-depths'

const label = String(import.meta.env['VITE_R4C_LABEL'] ?? 'unlabeled')
const part = String(import.meta.env['VITE_R4C_PART'] ?? 'r4c')
const outPath = `/workspace/home/serif/v9/load-resync/r4c/rows-${part}-${label}.json`
const rows: Array<unknown> = []
afterAll(async () => {
  await server.commands.writeFile(outPath, JSON.stringify(rows, null, 2))
})

function Grab(props: {
  handle: {editor?: Editor}
  events: Array<unknown>
  load: Array<PortableTextBlock>
}) {
  const editor = useEditor()
  useEffect(() => {
    props.handle.editor = editor
    const subscription = editor.on('*', (event) => {
      if (event.type === 'change') {
        props.events.push({
          type: 'change',
          origin: event.origin,
          operations: event.operations.map((operation) => {
            const {inverse: _inverse, ...rest} = operation as never as Record<string, unknown>
            return rest
          }),
          patches: 'patches' in event ? event.patches : undefined,
        })
      } else if (event.type === 'patch') {
        props.events.push({type: 'patch', patch: event.patch})
      } else if (event.type === 'mutation') {
        props.events.push({type: 'mutation', patches: event.patches})
      } else if (event.type === 'ready' || event.type === 'invalid value') {
        props.events.push({type: event.type})
      }
    })
    editor.send({type: 'load', value: props.load})
    return () => subscription.unsubscribe()
  }, [editor, props.handle, props.events, props.load])
  return null
}

async function quiet(events: Array<unknown>, ms: number) {
  let last = -1
  let since = Date.now()
  await vi.waitFor(
    () => {
      if (events.length !== last) {
        last = events.length
        since = Date.now()
      }
      if (Date.now() - since < ms) throw new Error('not quiet')
    },
    {interval: 100, timeout: 15000},
  )
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function textsOf(value: unknown): Array<string> {
  const texts: Array<string> = []
  JSON.stringify(value, (_key, node) => {
    if (node && typeof node === 'object' && (node as {_type?: string})._type === 'span') {
      texts.push((node as {text: string}).text)
    }
    return node
  })
  return texts
}

function stripOrigin(patch: Patch): Patch {
  const {origin: _origin, ...rest} = patch as Patch & {origin?: string}
  return rest as Patch
}

const resyncCases = [
  {name: 'server copy', text: 'server copy'},
  {name: 'foo bar', text: 'foo bar'},
]

describe('R4c', () => {
  for (const depth of loadDepths.filter(
    (candidate) => candidate.name === 'root' || candidate.name === 'callout',
  )) {
    for (const resyncCase of resyncCases) {
      test(`${depth.name} / ${resyncCase.name}`, async () => {
        const events: Array<unknown> = []
        const handle: {editor?: Editor} = {}
        const wrapperKey = (name: string) => `w-${name}`
        const loaded = depth.wrap(
          [textBlock('a', 'as', 'foo')],
          wrapperKey,
        )
        const resyncValue = depth.wrap(
          [textBlock('a', 'as', resyncCase.text)],
          wrapperKey,
        ).value
        await createTestEditor({
          keyGenerator: createTestKeyGenerator('m-'),
          schemaDefinition: loadSchemaDefinition,
          children: (
            <>
              <NodePlugin nodes={loadContainers} />
              <Grab handle={handle} events={events} load={loaded.value} />
            </>
          ),
        })
        await vi.waitFor(() => {
          if (!handle.editor) throw new Error('no editor')
        })
        const editor = handle.editor!
        await vi.waitFor(() => {
          if (!textsOf(editor.getSnapshot().context.value).includes('foo'))
            throw new Error('not loaded')
        })
        await quiet(events, 1500)
        events.length = 0
        events.push({type: '--- loaded'})

        const spanPath = [...loaded.prefix, {_key: 'a'}, 'children', {_key: 'as'}]
        editor.send({
          type: 'select',
          at: {anchor: {path: spanPath, offset: 3}, focus: {path: spanPath, offset: 3}},
        })
        editor.send({type: 'insert.text', text: 'x'})
        events.push({type: '--- typed x'})
        const valueBeforeResync = clone(editor.getSnapshot().context.value)
        let thrown: string | undefined
        const warnings: Array<string> = []
        const originalWarn = console.warn
        console.warn = (...args: Array<unknown>) => {
          warnings.push(args.map(String).join(' '))
        }
        try {
          editor.send({type: 'resync', value: resyncValue})
        } catch (error) {
          thrown = String(error)
        }
        events.push({type: '--- resync sent'})
        await quiet(events, 1800)
        console.warn = originalWarn

        const editorValue = clone(editor.getSnapshot().context.value)
        let store: unknown = clone(resyncValue)
        let storeError: string | undefined
        for (const event of events as Array<{type: string; patches?: Array<Patch>}>) {
          if (event.type !== 'mutation') continue
          try {
            store = applyAll(store, (event.patches ?? []).map(stripOrigin))
          } catch (error) {
            storeError = String(error)
          }
        }
        const editorTexts = textsOf(editorValue)
        const storeTexts = textsOf(store)
        rows.push({
          row: `${depth.name} / ${resyncCase.name}`,
          valueBeforeResync,
          resyncValue,
          events,
          thrown,
          warnings,
          editorValue,
          store,
          storeError,
          editorTexts,
          storeTexts,
          xInEditor: editorTexts.some((text) => text.includes('x')),
          xInStore: storeTexts.some((text) => text.includes('x')),
          agree: JSON.stringify(editorValue) === JSON.stringify(store),
        })
      })
    }
  }
})
