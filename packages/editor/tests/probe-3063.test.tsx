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
const part = '3063'
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


const spanForms = [
  {name: 'one span', spans: [{text: 'foo'}]},
  {name: 'two spans', spans: [{text: 'foo'}, {text: 'bar'}]},
]

describe('EDEX-3063 through load', () => {
  for (const depth of loadDepths) {
    for (const form of spanForms) {
      test(`${depth.name} / ${form.name}`, async () => {
        const events: Array<unknown> = []
        const handle: {editor?: Editor} = {}
        const wrapperKey = (name: string) => `w-${name}`
        const block = {
          _type: 'block',
          _key: 'n',
          style: 'normal',
          markDefs: [],
          children: form.spans.map((span) => ({
            _type: 'span',
            ...span,
            marks: [],
          })),
        } as unknown as PortableTextBlock
        const loaded = depth.wrap([block], wrapperKey)
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
        const beforeTyping = events.length
        const engineValue = clone(editor.getSnapshot().context.value)
        const engineBlock = findBlock(engineValue, 'n')
        const firstSpanKey = (engineBlock?.children as Array<{_key?: string}>)?.[0]?._key
        events.push({type: '--- before typing', firstSpanKey})
        const spanPath = [...loaded.prefix, {_key: 'n'}, 'children', {_key: firstSpanKey}]
        editor.send({
          type: 'select',
          at: {anchor: {path: spanPath, offset: 0}, focus: {path: spanPath, offset: 0}},
        })
        editor.send({type: 'insert.text', text: 'y'})
        events.push({type: '--- typed y'})
        await quiet(events, 1800)

        const editorValue = clone(editor.getSnapshot().context.value)
        let store: unknown = clone(loaded.value)
        let storeError: string | undefined
        for (const event of events as Array<{type: string; patches?: Array<Patch>}>) {
          if (event.type !== 'mutation') continue
          try {
            store = applyAll(store, (event.patches ?? []).map(stripOrigin))
          } catch (error) {
            storeError = String(error)
          }
        }
        const sentPatches = (events as Array<{type: string; patch?: Patch; patches?: Array<Patch>}>).flatMap(
          (event) =>
            event.type === 'patch' && event.patch
              ? [{via: 'patch', patch: event.patch}]
              : event.type === 'mutation'
                ? (event.patches ?? []).map((patch) => ({via: 'mutation', patch}))
                : [],
        )
        const firstTyping = sentPatches.findIndex((entry) => entry.patch.type === 'diffMatchPatch')
        const keyPatchesBefore = sentPatches
          .slice(0, firstTyping === -1 ? sentPatches.length : firstTyping)
          .filter((entry) => JSON.stringify(entry.patch).includes('_key"') && (entry.patch.path ?? []).includes('_key' as never) || (entry.patch.type === 'set' && entry.patch.path.at(-1) === '_key'))
        const keyPatchesAnywhere = sentPatches.filter(
          (entry) => entry.patch.type === 'set' && entry.patch.path.at(-1) === '_key',
        )
        const storeBlock = findBlock(store, 'n')
        rows.push({
          row: `${depth.name} / ${form.name}`,
          loaded: loaded.value,
          engineValueAfterLoad: engineValue,
          firstSpanKey,
          eventsBeforeTypingCount: beforeTyping,
          events,
          editorValue,
          store,
          storeError,
          editorTexts: textsOf(editorValue),
          storeTexts: textsOf(store),
          yInEditor: textsOf(editorValue).some((text) => text.includes('y')),
          yInStore: textsOf(store).some((text) => text.includes('y')),
          keyPatchesAnywhere,
          keyPatchesBeforeTyping: keyPatchesAnywhere.filter(
            (entry) => sentPatches.indexOf(entry) < (firstTyping === -1 ? Infinity : firstTyping),
          ),
          typingPatchIndex: firstTyping,
          storeSpanKeys: (storeBlock?.children as Array<{_key?: string}> | undefined)?.map((child) => child._key ?? null),
          agree: JSON.stringify(editorValue) === JSON.stringify(store),
        })
      })
    }
  }
})

function findBlock(value: unknown, key: string): Record<string, unknown> | undefined {
  let found: Record<string, unknown> | undefined
  JSON.stringify(value, (_key, node) => {
    if (node && typeof node === 'object' && (node as {_key?: string})._key === key && (node as {_type?: string})._type === 'block') {
      found = node as Record<string, unknown>
    }
    return node
  })
  return found
}
