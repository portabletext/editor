import {applyAll, type Patch} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {arrayToJSONMatchPath, Mutation} from '@sanity/mutator'
import {afterAll, describe, test, vi} from 'vitest'
import {server} from 'vitest/browser'
import type {Editor} from '../src'
import {useEditor} from '../src/editor/use-editor'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import {
  createWrapperKeys,
  loadContainers,
  loadDepths,
  loadSchemaDefinition,
  textBlock,
} from '../test-utils/load-depths'
import {LoadOnMount, type LoadRecord} from '../test-utils/load-on-mount'
import {useEffect} from 'react'

const label = String(import.meta.env['VITE_M2_LABEL'] ?? 'unlabeled')
const outPath = `/workspace/home/serif/v9/load-resync/m2-shape/rows-${label}.json`
const rows: Array<unknown> = []

const a = textBlock('a', 'a-span', 'foo')
const b = textBlock('b', 'b-span', 'bar')

const combinedLeaf: Array<unknown> = [
  {
    _type: 'block',
    _key: 'a',
    style: 'normal',
    markDefs: [],
    children: [],
  },
  {
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: 'a-span-b', text: 'foo', marks: []}],
  },
  textBlock('a', 'a-span-c', 'bar'),
  'baz',
]

const leaves: Array<{name: string; leaf: Array<unknown>}> = [
  {name: '[a, null, b]', leaf: [a, null, b]},
  {name: "[a, 'bar', b]", leaf: [a, 'bar', b]},
  {name: 'combined', leaf: combinedLeaf},
  {name: '[null, a, b]', leaf: [null, a, b]},
  {name: '[a, b, null]', leaf: [a, b, null]},
  {name: "['bar', a, b]", leaf: ['bar', a, b]},
  {name: "[a, b, 'bar']", leaf: [a, b, 'bar']},
]

afterAll(async () => {
  await server.commands.writeFile(outPath, JSON.stringify(rows, null, 2))
})

describe('probe m2 shape', () => {
  const cases = (['load', 'resync'] as const).flatMap((route) =>
    loadDepths.flatMap((depth) =>
      leaves.map((leaf) => ({route, depth, leaf})),
    ),
  )

  test.each(cases)(
    '$route $depth.name $leaf.name',
    async ({route, depth, leaf}) => {
      const wrapperKey = createWrapperKeys((() => {
        let count = 0
        return () => `w-${count++}`
      })())
      const sent = depth.wrap(leaf.leaf as never, wrapperKey).value
      const base = depth.wrap([a], wrapperKey).value
      const row = await runRow({
        route,
        loaded: route === 'load' ? sent : base,
        resyncValue: route === 'resync' ? sent : undefined,
      })
      rows.push({
        row: `${route} / ${depth.name} / ${leaf.name}`,
        route,
        depth: depth.name,
        leaf: leaf.name,
        sent,
        ...row,
      })
    },
  )

  test('control: first load, keyless child', async () => {
    const value = [
      {
        ...textBlock('a', '', ''),
        children: [{_type: 'span', text: 'foo', marks: []}],
      },
    ]
    const row = await runRow({route: 'load', loaded: value as never})
    rows.push({row: 'control load keyless child', route: 'load', sent: value, ...row})
  })

  test('control: resync, duplicate block keys', async () => {
    const base = [textBlock('a', 'a-span', 'foo')]
    const sent = [
      textBlock('a', 'a-span', 'foo'),
      textBlock('d', 'd-span', 'bar'),
      textBlock('d', 'e-span', 'baz'),
    ]
    const row = await runRow({route: 'resync', loaded: base, resyncValue: sent})
    rows.push({row: 'control resync duplicate keys', route: 'resync', sent, ...row})
  })
})

async function runRow(input: {
  route: 'load' | 'resync'
  loaded: Array<PortableTextBlock>
  resyncValue?: Array<PortableTextBlock>
}) {
  const errors: Array<string> = []
  const onError = (event: ErrorEvent) => errors.push(`uncaught: ${event.message}`)
  const onRejection = (event: PromiseRejectionEvent) =>
    errors.push(`unhandledrejection: ${String(event.reason)}`)
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onRejection)
  const consoleError = console.error
  console.error = (...args: Array<unknown>) => {
    errors.push(`console.error: ${args.map(describeArg).join(' ')}`)
  }

  const records: Array<LoadRecord> = []
  const handle: {editor?: Editor} = {}
  const keyGenerator = createTestKeyGenerator('m-')

  try {
    await createTestEditor({
      keyGenerator,
      schemaDefinition: loadSchemaDefinition,
      children: (
        <>
          <NodePlugin nodes={loadContainers} />
          <LoadOnMount loads={[input.loaded]} records={records} />
          <Grab handle={handle} />
        </>
      ),
    })

    await vi.waitFor(() => {
      if (!records.some((record) => record.type === 'ready')) {
        throw new Error('not ready')
      }
    })

    if (input.route === 'resync' && input.resyncValue) {
      handle.editor?.send({type: 'resync', value: input.resyncValue})
    }

    const editor = handle.editor!
    const finalValue = editor.getSnapshot().context.value
    const readyRecord = records.find((record) => record.type === 'ready')
    const readyValue =
      readyRecord?.type === 'ready' ? readyRecord.value : undefined

    const events = records.map((record) =>
      record.type === 'ready'
        ? {type: 'ready'}
        : record.event.type === 'change'
          ? {
              type: 'change',
              origin: record.event.origin,
              correction:
                'correction' in record.event
                  ? record.event.correction
                  : undefined,
              operations: record.event.operations.map(stripInverse),
              patches:
                'patches' in record.event ? record.event.patches : undefined,
            }
          : {type: record.event.type},
    )

    const changes = records.flatMap((record) =>
      record.type === 'event' && record.event.type === 'change'
        ? [record.event]
        : [],
    )

    let opsFold: unknown
    let opsFoldError: string | undefined
    try {
      opsFold = changes.reduce<unknown>(
        (value, change) =>
          change.operations.reduce<unknown>(
            (current, operation) =>
              applyOperation(current, operation as never),
            value,
          ),
        structuredClone(readyValue),
      )
    } catch (error) {
      opsFoldError = String(error)
    }

    const sentValue = input.resyncValue ?? input.loaded
    const localPatches = changes.flatMap((change) =>
      change.origin === 'local' ? [change.patches] : [],
    )
    let patchFold: unknown
    let patchFoldError: string | undefined
    try {
      patchFold = localPatches.reduce<unknown>(
        (value, patches) => applyAll(value as never, patches),
        structuredClone(sentValue),
      )
    } catch (error) {
      patchFoldError = String(error)
    }

    let mutatorFold: unknown
    let mutatorFoldError: string | undefined
    try {
      mutatorFold = localPatches.reduce<unknown>(
        (value, patches) => applyWithMutator(value, patches),
        structuredClone(sentValue),
      )
    } catch (error) {
      mutatorFoldError = String(error)
    }

    return {
      events,
      readyValue,
      finalValue,
      opsFold,
      opsFoldError,
      opsFoldEqual: opsFoldError ? false : same(opsFold, finalValue),
      patchFold,
      patchFoldError,
      patchFoldEqual: patchFoldError ? false : same(patchFold, finalValue),
      mutatorFold,
      mutatorFoldError,
      mutatorFoldEqual: mutatorFoldError ? false : same(mutatorFold, finalValue),
      errors,
    }
  } catch (error) {
    return {
      events: records.map((record) =>
        record.type === 'ready' ? {type: 'ready'} : {type: record.event.type},
      ),
      threw: String(error),
      errors,
    }
  } finally {
    console.error = consoleError
    window.removeEventListener('error', onError)
    window.removeEventListener('unhandledrejection', onRejection)
  }
}

function Grab(props: {handle: {editor?: Editor}}) {
  const editor = useEditor()
  useEffect(() => {
    props.handle.editor = editor
  }, [editor, props.handle])
  return null
}

function describeArg(arg: unknown): string {
  return arg instanceof Error ? `${arg.name}: ${arg.message}` : String(arg)
}

function stripInverse(operation: unknown) {
  const {inverse: _inverse, ...rest} = operation as Record<string, unknown>
  return rest
}

function same(left: unknown, right: unknown) {
  return stable(left) === stable(right)
}

function stable(value: unknown): string {
  return JSON.stringify(value, (_key, entry) =>
    entry && typeof entry === 'object' && !Array.isArray(entry)
      ? Object.fromEntries(
          Object.entries(entry).sort(([left], [right]) =>
            left < right ? -1 : 1,
          ),
        )
      : entry,
  )
}

type Segment = string | number | {_key: string}

function applyOperation(
  value: unknown,
  operation: {
    type: string
    path: Array<Segment>
    node?: unknown
    position?: 'before' | 'after'
    value?: unknown
    offset?: number
    text?: string
  },
): unknown {
  const root = structuredClone(value) as Array<unknown>
  const path = operation.path
  const last = path[path.length - 1]!
  const parent = walk(root, path.slice(0, -1)) as Record<string, unknown>
  switch (operation.type) {
    case 'insert': {
      const array = parent as unknown as Array<unknown>
      const index = indexOf(array, last)
      array.splice(operation.position === 'after' ? index + 1 : index, 0, operation.node)
      return root
    }
    case 'unset': {
      if (typeof last === 'string') {
        delete parent[last]
      } else {
        const array = parent as unknown as Array<unknown>
        array.splice(indexOf(array, last), 1)
      }
      return root
    }
    case 'set': {
      if (typeof last === 'string') {
        parent[last] = operation.value
      } else {
        const array = parent as unknown as Array<unknown>
        array[indexOf(array, last)] = operation.value
      }
      return root
    }
    case 'insert.text':
    case 'remove.text': {
      const span = walk(root, path) as {text: string}
      span.text =
        operation.type === 'insert.text'
          ? span.text.slice(0, operation.offset) +
            operation.text +
            span.text.slice(operation.offset)
          : span.text.slice(0, operation.offset) +
            span.text.slice((operation.offset ?? 0) + (operation.text?.length ?? 0))
      return root
    }
  }
  throw new Error(`unsupported operation ${operation.type}`)
}

function walk(root: unknown, path: Array<Segment>): unknown {
  let current: unknown = root
  for (const segment of path) {
    if (typeof segment === 'string') {
      current = (current as Record<string, unknown>)[segment]
    } else {
      const array = current as Array<unknown>
      current = array[indexOf(array, segment)]
    }
  }
  return current
}

function indexOf(array: Array<unknown>, segment: Segment): number {
  if (typeof segment === 'number') {
    return segment
  }
  if (typeof segment === 'string') {
    throw new Error('string segment in an array')
  }
  const index = array.findIndex(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      (entry as {_key?: string})._key === segment._key,
  )
  if (index === -1) {
    throw new Error(`no entry with _key ${segment._key}`)
  }
  return index
}

function applyWithMutator(value: unknown, patches: Array<Patch>): unknown {
  let document: {_id: string; _type: string; value: unknown} | null = {
    _id: 'doc',
    _type: 'doc',
    value,
  }
  for (const patch of patches) {
    const jsonPath = arrayToJSONMatchPath(['value', ...patch.path] as never)
    const body =
      patch.type === 'set'
        ? {set: {[jsonPath]: patch.value}}
        : patch.type === 'setIfMissing'
          ? {setIfMissing: {[jsonPath]: patch.value}}
          : patch.type === 'unset'
            ? {unset: [jsonPath]}
            : patch.type === 'insert'
              ? {insert: {[patch.position]: jsonPath, items: patch.items}}
              : patch.type === 'diffMatchPatch'
                ? {diffMatchPatch: {[jsonPath]: patch.value}}
                : patch.type === 'inc'
                  ? {inc: {[jsonPath]: patch.value}}
                  : {dec: {[jsonPath]: patch.value}}
    document = Mutation.applyAll(document as never, [
      new Mutation({mutations: [{patch: {id: 'doc', ...body}} as never]}),
    ]) as typeof document
  }
  return document?.value
}
