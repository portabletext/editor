import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import type {EditorSelection} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}],
        },
      ],
    },
    {
      name: 'table',
      fields: [
        {
          name: 'rows',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'row',
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  of: [
                    {
                      type: 'object',
                      name: 'cell',
                      fields: [
                        {name: 'content', type: 'array', of: [{type: 'block'}]},
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const nodes = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({type: 'table', arrayField: 'rows'}),
  defineContainer({type: 'row', arrayField: 'cells'}),
  defineContainer({type: 'cell', arrayField: 'content'}),
]

const depths = ['root', 'callout', 'nested callout', 'table cell'] as const

type Depth = (typeof depths)[number]

/**
 * Three text blocks "foo", "bar" and "baz" + bold "qux", placed at the given
 * depth.
 */
function createFixture(depth: Depth) {
  const keyGenerator = createTestKeyGenerator()
  const textBlock = (texts: Array<string>) => ({
    _key: keyGenerator(),
    _type: 'block',
    style: 'normal',
    markDefs: [],
    children: texts.map((text, index) => ({
      _key: keyGenerator(),
      _type: 'span',
      text,
      marks: index % 2 === 1 ? ['strong'] : [],
    })),
  })
  const blocks = [textBlock(['foo']), textBlock(['bar']), textBlock(['baz', 'qux'])]
  const outerKey = keyGenerator()
  const innerKey = keyGenerator()
  const cellKey = keyGenerator()

  let prefix: Array<unknown> = []
  let initialValue: Array<unknown> = blocks

  if (depth === 'callout') {
    prefix = [{_key: outerKey}, 'content']
    initialValue = [{_key: outerKey, _type: 'callout', content: blocks}]
  } else if (depth === 'nested callout') {
    prefix = [{_key: outerKey}, 'content', {_key: innerKey}, 'content']
    initialValue = [
      {
        _key: outerKey,
        _type: 'callout',
        content: [{_key: innerKey, _type: 'callout', content: blocks}],
      },
    ]
  } else if (depth === 'table cell') {
    prefix = [
      {_key: outerKey},
      'rows',
      {_key: innerKey},
      'cells',
      {_key: cellKey},
      'content',
    ]
    initialValue = [
      {
        _key: outerKey,
        _type: 'table',
        rows: [
          {
            _key: innerKey,
            _type: 'row',
            cells: [{_key: cellKey, _type: 'cell', content: blocks}],
          },
        ],
      },
    ]
  }

  const lastBlock = blocks[2]!
  const baz = lastBlock.children[0]!
  const qux = lastBlock.children[1]!
  const spanPath = (span: {_key: string}) =>
    [...prefix, {_key: lastBlock._key}, 'children', {_key: span._key}] as any

  return {
    keyGenerator,
    initialValue,
    qux,
    quxPath: spanPath(qux),
    // "b|az" + "qu|x": a range from inside "baz" to inside "qux"
    savedRange: {
      anchor: {path: spanPath(baz), offset: 1},
      focus: {path: spanPath(qux), offset: 2},
      backward: false,
    } satisfies EditorSelection,
    quxRange: {
      anchor: {path: spanPath(qux), offset: 0},
      focus: {path: spanPath(qux), offset: 3},
      backward: false,
    } satisfies EditorSelection,
    bazRange: {
      anchor: {path: spanPath(baz), offset: 1},
      focus: {path: spanPath(baz), offset: 2},
      backward: false,
    } satisfies EditorSelection,
  }
}

/**
 * The text of every text block, in document order, at any depth.
 */
function getTexts(value: unknown): Array<string> {
  const texts: Array<string> = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') {
      return
    }
    const record = node as Record<string, unknown>
    if (record['_type'] === 'block' && Array.isArray(record['children'])) {
      texts.push(
        record['children']
          .map((child: any) => (typeof child.text === 'string' ? child.text : ''))
          .join(''),
      )
      return
    }
    Object.values(record).forEach(walk)
  }
  walk(value)
  return texts
}

/**
 * The text of every bold span, in document order, at any depth.
 */
function getBoldTexts(value: unknown): Array<string> {
  const texts: Array<string> = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      node.forEach(walk)
      return
    }
    if (!node || typeof node !== 'object') {
      return
    }
    const record = node as Record<string, any>
    if (record['_type'] === 'span' && record['marks']?.includes('strong')) {
      texts.push(record['text'])
    }
    Object.values(record).forEach(walk)
  }
  walk(value)
  return texts
}

async function createEditor(depth: Depth) {
  const fixture = createFixture(depth)
  const result = await createTestEditor({
    keyGenerator: fixture.keyGenerator,
    schemaDefinition,
    initialValue: fixture.initialValue as any,
    children: <NodePlugin nodes={nodes} />,
  })
  return {fixture, ...result}
}

async function selectRange(
  editor: Awaited<ReturnType<typeof createEditor>>['editor'],
  at: EditorSelection,
) {
  editor.send({type: 'select', at})
  await vi.waitFor(() => {
    expect(editor.getSnapshot().context.selection).not.toBeNull()
  })
}

/**
 * Unbolding "qux" merges it into "baz", so the saved range now points at a
 * span that no longer exists.
 */
async function unboldQux(
  editor: Awaited<ReturnType<typeof createEditor>>['editor'],
  fixture: ReturnType<typeof createFixture>,
) {
  await selectRange(editor, fixture.quxRange)
  editor.send({type: 'decorator.remove', decorator: 'strong'})
  await vi.waitFor(() => {
    expect(getTexts(editor.getSnapshot().context.value)).toEqual([
      'foo',
      'bar',
      'bazqux',
    ])
    expect(
      JSON.stringify(editor.getSnapshot().context.value).includes(
        `"_key":"${fixture.qux._key}"`,
      ),
    ).toBe(false)
  })
}

async function pressBackspace(
  editor: Awaited<ReturnType<typeof createEditor>>['editor'],
) {
  editor.send({type: 'focus'})
  await userEvent.keyboard('{Backspace}')
}

describe('a saved range whose span has gone', () => {
  for (const depth of depths) {
    describe(depth, () => {
      test('Scenario: restoring it with select and pressing Backspace only edits its own block', async () => {
        const {editor, fixture} = await createEditor(depth)

        await unboldQux(editor, fixture)
        editor.send({type: 'select', at: fixture.savedRange})
        await new Promise((resolve) => setTimeout(resolve, 100))
        await pressBackspace(editor)

        expect(getTexts(editor.getSnapshot().context.value).slice(0, 2)).toEqual([
          'foo',
          'bar',
        ])
      })

      test('Scenario: deleting it only edits its own block', async () => {
        const {editor, fixture} = await createEditor(depth)

        await unboldQux(editor, fixture)
        editor.send({type: 'delete', at: fixture.savedRange})

        expect(getTexts(editor.getSnapshot().context.value).slice(0, 2)).toEqual([
          'foo',
          'bar',
        ])
      })

      test('Scenario: bolding it only edits its own block', async () => {
        const {editor, fixture} = await createEditor(depth)

        await unboldQux(editor, fixture)
        editor.send({
          type: 'decorator.add',
          decorator: 'strong',
          at: fixture.savedRange,
        })

        const boldTexts = getBoldTexts(editor.getSnapshot().context.value)
        expect(boldTexts).not.toContain('foo')
        expect(boldTexts).not.toContain('bar')
      })

      test('Scenario: passing it as the selection prop after a collaborator removed the span, then pressing Backspace, only edits its own block', async () => {
        const fixture = createFixture(depth)
        const options = {
          keyGenerator: fixture.keyGenerator,
          schemaDefinition,
          initialValue: fixture.initialValue as any,
          children: <NodePlugin nodes={nodes} />,
        }
        const {editor, rerender} = await createTestEditor(options)

        editor.send({
          type: 'patches',
          patches: [{type: 'unset', path: fixture.quxPath, origin: 'remote'}],
          snapshot: undefined,
        })
        await vi.waitFor(() => {
          expect(getTexts(editor.getSnapshot().context.value)).toEqual([
            'foo',
            'bar',
            'baz',
          ])
        })

        await rerender({
          ...options,
          editableProps: {selection: fixture.savedRange},
        })
        await pressBackspace(editor)

        expect(getTexts(editor.getSnapshot().context.value).slice(0, 2)).toEqual([
          'foo',
          'bar',
        ])
      })

      // The editor moves its own selection with every change, so these routes
      // never point at a span that has gone.

      test('Scenario: a collaborator removes the span under the selection, then Backspace', async () => {
        const {editor, fixture} = await createEditor(depth)

        await selectRange(editor, fixture.savedRange)
        editor.send({
          type: 'patches',
          patches: [{type: 'unset', path: fixture.quxPath, origin: 'remote'}],
          snapshot: undefined,
        })
        await vi.waitFor(() => {
          expect(getTexts(editor.getSnapshot().context.value)).toEqual([
            'foo',
            'bar',
            'baz',
          ])
        })
        await pressBackspace(editor)

        await vi.waitFor(() => {
          expect(getTexts(editor.getSnapshot().context.value)).toEqual([
            'foo',
            'bar',
            'b',
          ])
        })
      })

      test('Scenario: a collaborator removes the span under the selection, then bold', async () => {
        const {editor, fixture} = await createEditor(depth)

        await selectRange(editor, fixture.savedRange)
        editor.send({
          type: 'patches',
          patches: [{type: 'unset', path: fixture.quxPath, origin: 'remote'}],
          snapshot: undefined,
        })
        await vi.waitFor(() => {
          expect(getTexts(editor.getSnapshot().context.value)).toEqual([
            'foo',
            'bar',
            'baz',
          ])
        })
        editor.send({type: 'decorator.toggle', decorator: 'strong'})

        await vi.waitFor(() => {
          expect(getBoldTexts(editor.getSnapshot().context.value)).toEqual([
            'az',
          ])
        })
      })

      test('Scenario: unbold merges the span away, undo, redo, then Backspace', async () => {
        const {editor, fixture} = await createEditor(depth)

        await unboldQux(editor, fixture)
        editor.send({type: 'history.undo'})
        await vi.waitFor(() => {
          expect(getBoldTexts(editor.getSnapshot().context.value)).toEqual([
            'qux',
          ])
        })
        editor.send({type: 'history.redo'})
        await vi.waitFor(() => {
          expect(getBoldTexts(editor.getSnapshot().context.value)).toEqual([])
        })
        await pressBackspace(editor)

        await vi.waitFor(() => {
          expect(getTexts(editor.getSnapshot().context.value)).toEqual([
            'foo',
            'bar',
            'bazqu',
          ])
        })
      })

      test('Scenario: bold splits the span, undo, then Backspace', async () => {
        const {editor, fixture} = await createEditor(depth)

        await selectRange(editor, fixture.bazRange)
        editor.send({type: 'decorator.add', decorator: 'strong'})
        await vi.waitFor(() => {
          expect(getBoldTexts(editor.getSnapshot().context.value)).toEqual([
            'a',
            'qux',
          ])
        })
        editor.send({type: 'history.undo'})
        await vi.waitFor(() => {
          expect(getBoldTexts(editor.getSnapshot().context.value)).toEqual([
            'qux',
          ])
        })
        await pressBackspace(editor)

        await vi.waitFor(() => {
          expect(getTexts(editor.getSnapshot().context.value)).toEqual([
            'foo',
            'bar',
            'bzqux',
          ])
        })
      })
    })
  }
})
