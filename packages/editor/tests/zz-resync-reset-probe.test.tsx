import type {PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import React from 'react'
import {afterEach, beforeEach, describe, test, vi} from 'vitest'
import {commands, userEvent} from 'vitest/browser'
import type {
  Editor,
  EditorSelection,
  RangeDecoration,
  RangeDecorationOnMovedDetails,
} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {createTestEditor} from '../src/test/vitest'
import {
  createWrapperKeys,
  loadContainers,
  loadDepths,
  loadSchemaDefinition,
  textBlock,
} from '../test-utils/load-depths'

type Mode = 'update value' | 'resync'
const modes: Array<Mode> = ['update value', 'resync']
const positions = ['first', 'middle', 'last'] as const
const resyncCases = ['a-equal', 'b-text', 'c-moved', 'd-span-gone'] as const
type ResyncCase = (typeof resyncCases)[number]
const depths = loadDepths.filter((depth) => depth.name !== 'nested callout')
const matrix = modes.flatMap((mode) =>
  depths.flatMap((depth) =>
    positions.flatMap((position) =>
      resyncCases.map((resyncCase) => ({mode, depth, position, resyncCase})),
    ),
  ),
)

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

let rowCounter = 0
async function row(data: Record<string, unknown>) {
  rowCounter++
  const name = [data['kind'], data['mode'], data['depth'], data['position'], data['case']]
    .filter(Boolean)
    .join('_')
    .replace(/ /g, '-')
  await commands.writeFile(
    `.probe-rows/${name}.json`,
    JSON.stringify({...data, errors: [...errors]}),
  )
}

function summarizePoint(point: {path: Array<unknown>; offset: number}) {
  const keys = point.path
    .filter(
      (segment): segment is {_key: string} =>
        typeof segment === 'object' && segment !== null,
    )
    .map((segment) => segment._key)
  return `${keys.slice(-2).join('/')}:${point.offset}`
}

function summarizeSelection(selection: EditorSelection | null | undefined) {
  if (!selection) {
    return null
  }
  return `${summarizePoint(selection.anchor)}..${summarizePoint(selection.focus)}`
}

function leafBlocks(value: Array<PortableTextBlock>, prefix: Array<unknown>) {
  let node: unknown = value
  for (const segment of prefix) {
    if (typeof segment === 'string') {
      node = (node as Record<string, unknown>)[segment]
    } else if (typeof segment === 'object' && segment !== null) {
      node = (node as Array<{_key: string}>).find(
        (child) => child._key === (segment as {_key: string})._key,
      )
    }
  }
  return node as Array<PortableTextBlock>
}

function summarizeValue(
  value: Array<PortableTextBlock>,
  prefix: Array<unknown>,
) {
  return leafBlocks(value, prefix)
    .map((block) => {
      const children = (block as {children?: Array<{_key: string; text: string}>})
        .children
      return `${block._key}=${(children ?? []).map((child) => `${child._key}:${child.text}`).join('+')}`
    })
    .join(' | ')
}

function domSelection() {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || !selection.anchorNode) {
    return null
  }
  return {
    text: selection.anchorNode.textContent,
    offset: selection.anchorOffset,
    focusOffset: selection.focusOffset,
  }
}

function setup(options: {
  depth: (typeof loadDepths)[number]
  position: (typeof positions)[number]
  decoration?: {
    onMoved: (details: RangeDecorationOnMovedDetails) => void
  }
}) {
  const keyGenerator = createTestKeyGenerator()
  const wrapperKey = createWrapperKeys(keyGenerator)
  const keys = Array.from({length: 3}, () => ({
    blockKey: keyGenerator(),
    spanKey: keyGenerator(),
  }))
  const target = positions.indexOf(options.position)
  const siblings = keys.map(({blockKey, spanKey}) =>
    textBlock(blockKey, spanKey, 'foo bar'),
  )
  const {value, prefix} = options.depth.wrap(siblings, wrapperKey)
  const spanPath = [
    ...prefix,
    {_key: keys[target]!.blockKey},
    'children',
    {_key: keys[target]!.spanKey},
  ]
  const replacementSpanKey = keyGenerator()

  function valueFor(resyncCase: ResyncCase): Array<PortableTextBlock> {
    const wrap = (blocks: Array<PortableTextBlock>) =>
      options.depth.wrap(blocks, wrapperKey).value
    if (resyncCase === 'a-equal') {
      return wrap(structuredClone(siblings))
    }
    if (resyncCase === 'b-text') {
      return wrap(
        siblings.map((sibling, index) =>
          index === target
            ? textBlock(keys[index]!.blockKey, keys[index]!.spanKey, 'foXYo bar')
            : structuredClone(sibling),
        ),
      )
    }
    if (resyncCase === 'c-moved') {
      const moved = structuredClone(siblings)
      const [block] = moved.splice(target, 1)
      if (position(options.position) === 'last') {
        moved.unshift(block!)
      } else {
        moved.push(block!)
      }
      return wrap(moved)
    }
    return wrap(
      siblings.map((sibling, index) =>
        index === target
          ? textBlock(keys[index]!.blockKey, replacementSpanKey, 'foo bar')
          : structuredClone(sibling),
      ),
    )
  }

  const decorations: Array<RangeDecoration> = options.decoration
    ? [
        {
          component: ({children}) => (
            <span data-testid="probe-decoration">{children}</span>
          ),
          selection: {
            anchor: {path: spanPath, offset: 4},
            focus: {path: spanPath, offset: 7},
          },
          onMoved: options.decoration.onMoved,
        },
      ]
    : []

  return {value, prefix, spanPath, valueFor, decorations, keys, target}
}

function position(name: (typeof positions)[number]) {
  return name
}

async function mount(fixture: ReturnType<typeof setup>) {
  const {editor, locator} = await createTestEditor({
    keyGenerator: createTestKeyGenerator('z'),
    schemaDefinition: loadSchemaDefinition,
    initialValue: fixture.value,
    children: <NodePlugin nodes={loadContainers} />,
    editableProps:
      fixture.decorations.length > 0
        ? {rangeDecorations: fixture.decorations}
        : undefined,
  })
  return {editor, locator}
}

function send(editor: Editor, mode: Mode, value: Array<PortableTextBlock>) {
  editor.send(
    mode === 'resync'
      ? {type: 'resync', value}
      : {type: 'update value', value},
  )
}

describe('resync reset probe: caret', () => {
  test.each(matrix)(
    'caret $mode $depth.name $position $resyncCase',
    async ({mode, depth, position, resyncCase}) => {
      const fixture = setup({depth, position})
      const {editor, locator} = await mount(fixture)
      await userEvent.click(locator)
      editor.send({
        type: 'select',
        at: {
          anchor: {path: fixture.spanPath, offset: 4},
          focus: {path: fixture.spanPath, offset: 4},
        },
      })
      await frame()
      const before = summarizeSelection(editor.getSnapshot().context.selection)
      const nextValue = fixture.valueFor(resyncCase)

      send(editor, mode, nextValue)
      await frame()
      await frame()

      const snapshot = editor.getSnapshot().context
      const selectionAfter = summarizeSelection(snapshot.selection)
      const dom = domSelection()
      const valueMatches =
        summarizeValue(snapshot.value, fixture.prefix) ===
        summarizeValue(nextValue, fixture.prefix)
      const valueAfterResync = summarizeValue(snapshot.value, fixture.prefix)

      await userEvent.keyboard('Z')
      await frame()
      const typed = editor.getSnapshot().context
      await row({
        kind: 'caret',
        mode,
        depth: depth.name,
        position,
        case: resyncCase,
        selectionBefore: before,
        selectionAfter,
        dom,
        valueMatches,
        valueAfterResync,
        selectionAfterTyping: summarizeSelection(typed.selection),
        valueAfterTyping: summarizeValue(typed.value, fixture.prefix),
      })
    },
  )
})

describe('resync reset probe: range decorations', () => {
  test.each(matrix)(
    'decoration $mode $depth.name $position $resyncCase',
    async ({mode, depth, position, resyncCase}) => {
      const moved: Array<string> = []
      const fixture = setup({
        depth,
        position,
        decoration: {
          onMoved: (details) => {
            moved.push(
              `${details.origin}:${summarizeSelection(details.newSelection)}`,
            )
          },
        },
      })
      const {editor} = await mount(fixture)
      await vi.waitFor(() => {
        if (document.querySelectorAll('[data-testid="probe-decoration"]').length === 0) {
          throw new Error('decoration not rendered yet')
        }
      })
      const textsBefore = [
        ...document.querySelectorAll('[data-testid="probe-decoration"]'),
      ].map((element) => element.textContent)
      const nextValue = fixture.valueFor(resyncCase)

      send(editor, mode, nextValue)
      await frame()
      await frame()
      await frame()

      await row({
        kind: 'decoration',
        mode,
        depth: depth.name,
        position,
        case: resyncCase,
        rendersBefore: textsBefore,
        rendersAfter: [
          ...document.querySelectorAll('[data-testid="probe-decoration"]'),
        ].map((element) => element.textContent),
        onMoved: moved,
        valueMatches:
          summarizeValue(editor.getSnapshot().context.value, fixture.prefix) ===
          summarizeValue(nextValue, fixture.prefix),
      })
    },
  )
})

const changeCases = ['a-equal', 'b-text', 'd-span-gone', 'non-object'] as const

describe('resync reset probe: change events', () => {
  test.each(
    modes.flatMap((mode) =>
      depths
        .filter((depth) => depth.name === 'root' || depth.name === 'callout')
        .flatMap((depth) =>
          changeCases.map((changeCase) => ({mode, depth, changeCase})),
        ),
    ),
  )(
    'change $mode $depth.name $changeCase',
    async ({mode, depth, changeCase}) => {
      const fixture = setup({depth, position: 'middle'})
      const {editor} = await mount(fixture)
      await frame()
      const events: Array<unknown> = []
      editor.on('*', (event) => {
        if (event.type === 'operation') {
          return
        }
        events.push(event)
      })
      const nextValue =
        changeCase === 'non-object'
          ? nonObjectValue(fixture, depth)
          : fixture.valueFor(
              changeCase === 'a-equal'
                ? 'a-equal'
                : changeCase === 'b-text'
                  ? 'b-text'
                  : 'd-span-gone',
            )

      send(editor, mode, nextValue)
      await frame()
      await frame()

      await row({
        kind: 'change',
        mode,
        depth: depth.name,
        case: changeCase,
        events: JSON.parse(JSON.stringify(events)),
      })
    },
  )
})

function nonObjectValue(
  fixture: ReturnType<typeof setup>,
  depth: (typeof loadDepths)[number],
): Array<PortableTextBlock> {
  const wrapperKey = createWrapperKeys(createTestKeyGenerator('w'))
  void wrapperKey
  const clone = structuredClone(fixture.value)
  const leaf = leafBlocks(clone, fixture.prefix) as Array<unknown>
  leaf.splice(1, 0, 'stray')
  void depth
  return clone
}
