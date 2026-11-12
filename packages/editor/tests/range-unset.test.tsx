import {defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {defineContainer} from '../src'
import {getValue} from '../src/internal-utils/get-value'
import {NodePlugin} from '../src/plugins'
import {createTestEditor} from '../src/test/vitest'
import type {Operation} from '../src/types/operation'

const schemaDefinition = defineSchema({
  decorators: [{name: 'strong'}, {name: 'em'}],
  blockObjects: [
    {
      name: 'tagged',
      fields: [{name: 'tags', type: 'array', of: [{type: 'string'}]}],
    },
    {
      name: 'callout',
      fields: [
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'callout'}, {type: 'tagged'}],
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
                        {
                          name: 'content',
                          type: 'array',
                          of: [{type: 'block'}, {type: 'tagged'}],
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
    },
  ],
})

const containers = [
  defineContainer({type: 'callout', arrayField: 'content'}),
  defineContainer({
    type: 'table',
    arrayField: 'rows',
    of: [
      defineContainer({
        type: 'row',
        arrayField: 'cells',
        of: [defineContainer({type: 'cell', arrayField: 'content'})],
      }),
    ],
  }),
]

type Depth = 'root' | 'callout' | 'nested callout' | 'table cell'
type Shape = 'marks' | 'children' | 'tags'

const depths: Array<Depth> = ['root', 'callout', 'nested callout', 'table cell']
const shapes: Array<Shape> = ['marks', 'children', 'tags']
const segment = [1, ''] as [number, '']

function createFixture(depth: Depth, shape: Shape) {
  return {
    ...buildFixture(depth, shape, false),
    storedValue: buildFixture(depth, shape, true).value,
  }
}

function buildFixture(depth: Depth, shape: Shape, shrunk: boolean) {
  const keyGenerator = createTestKeyGenerator()
  const containerKeys = {
    outer: keyGenerator(),
    inner: keyGenerator(),
    row: keyGenerator(),
    cell: keyGenerator(),
  }
  const blockKey = keyGenerator()
  const spanKeys = [keyGenerator(), keyGenerator(), keyGenerator()]
  const textBlockKey = keyGenerator()
  const textSpanKey = keyGenerator()
  const taggedKey = keyGenerator()

  const textBlock = {
    _type: 'block',
    _key: textBlockKey,
    children: [{_type: 'span', _key: textSpanKey, text: 'foo', marks: []}],
    markDefs: [],
    style: 'normal',
  }
  const tagged = {
    _type: 'tagged',
    _key: taggedKey,
    tags: shrunk ? ['foo'] : ['foo', 'bar', 'baz'],
  }
  const markedBlock = {
    _type: 'block',
    _key: blockKey,
    children: [
      {
        _type: 'span',
        _key: spanKeys[0],
        text: 'foo',
        marks: shrunk ? ['strong'] : ['strong', 'em', 'strong'],
      },
    ],
    markDefs: [],
    style: 'normal',
  }
  const multiSpanBlock = {
    _type: 'block',
    _key: blockKey,
    children: [
      {_type: 'span', _key: spanKeys[0], text: 'foo', marks: []},
      ...(shrunk
        ? []
        : [
            {_type: 'span', _key: spanKeys[1], text: 'bar', marks: ['strong']},
            {_type: 'span', _key: spanKeys[2], text: 'baz', marks: ['em']},
          ]),
    ],
    markDefs: [],
    style: 'normal',
  }

  const content =
    shape === 'marks'
      ? [markedBlock]
      : shape === 'children'
        ? [multiSpanBlock]
        : [textBlock, tagged]

  const wrapped = {
    'root': {value: content, prefix: []},
    'callout': {
      value: [{_type: 'callout', _key: containerKeys.outer, content}],
      prefix: [{_key: containerKeys.outer}, 'content'],
    },
    'nested callout': {
      value: [
        {
          _type: 'callout',
          _key: containerKeys.outer,
          content: [{_type: 'callout', _key: containerKeys.inner, content}],
        },
      ],
      prefix: [
        {_key: containerKeys.outer},
        'content',
        {_key: containerKeys.inner},
        'content',
      ],
    },
    'table cell': {
      value: [
        {
          _type: 'table',
          _key: containerKeys.outer,
          rows: [
            {
              _type: 'row',
              _key: containerKeys.row,
              cells: [{_type: 'cell', _key: containerKeys.cell, content}],
            },
          ],
        },
      ],
      prefix: [
        {_key: containerKeys.outer},
        'rows',
        {_key: containerKeys.row},
        'cells',
        {_key: containerKeys.cell},
        'content',
      ],
    },
  }[depth]

  const unsetPath = (segment: unknown) =>
    shape === 'marks'
      ? [
          ...wrapped.prefix,
          {_key: blockKey},
          'children',
          {_key: spanKeys[0]},
          'marks',
          segment,
        ]
      : shape === 'children'
        ? [...wrapped.prefix, {_key: blockKey}, 'children', segment]
        : [...wrapped.prefix, {_key: taggedKey}, 'tags', segment]

  const typedSpanPath =
    shape === 'tags'
      ? [
          ...wrapped.prefix,
          {_key: textBlockKey},
          'children',
          {_key: textSpanKey},
        ]
      : [...wrapped.prefix, {_key: blockKey}, 'children', {_key: spanKeys[0]}]

  const arrayPath =
    shape === 'marks'
      ? [...typedSpanPath, 'marks']
      : shape === 'children'
        ? [...wrapped.prefix, {_key: blockKey}, 'children']
        : [...wrapped.prefix, {_key: taggedKey}, 'tags']

  return {
    value: wrapped.value,
    unsetPath,
    typedSpanPath,
    arrayPath,
  }
}

function sendRemoteUnset(
  editor: Awaited<ReturnType<typeof createTestEditor>>['editor'],
  path: Array<unknown>,
) {
  editor.send({
    type: 'apply',
    patches: [{type: 'unset', origin: 'remote', path: path as never}],
  })
}

function marker(key: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [{_type: 'span', _key: `${key}-span`, text: '', marks: []}],
  }
}

async function sendRemoteUnsetAndWaitForDelivery(
  editor: Awaited<ReturnType<typeof createTestEditor>>['editor'],
  path: Array<unknown>,
) {
  const markerKey = createTestKeyGenerator('marker-')()
  const remoteOperations: Array<Operation> = []

  editor.on('operation', ({operation, origin}) => {
    if (origin === 'remote') {
      remoteOperations.push(structuredClone(operation))
    }
  })

  editor.send({
    type: 'apply',
    patches: [
      {type: 'unset', origin: 'remote', path: path as never},
      {
        type: 'insert',
        origin: 'remote',
        path: [0],
        position: 'before',
        items: [marker(markerKey)],
      },
      {type: 'unset', origin: 'remote', path: [{_key: markerKey}]},
    ],
  })

  await vi.waitFor(() => {
    expect(remoteOperations).toEqual([
      {type: 'unset', path},
      {
        type: 'insert',
        path: [0],
        position: 'before',
        node: marker(markerKey),
      },
      {type: 'unset', path: [{_key: markerKey}]},
    ])
  })
}

describe('remote range unset', () => {
  for (const depth of depths) {
    for (const shape of shapes) {
      {
        test(`Scenario: ${shape} range at ${depth}: removes the range, keeps arrays and typing`, async () => {
          const fixture = createFixture(depth, shape)
          const {editor, locator} = await createTestEditor({
            schemaDefinition,
            initialValue: fixture.value,
            children: <NodePlugin nodes={containers} />,
          })

          sendRemoteUnset(editor, fixture.unsetPath(segment))

          await vi.waitFor(() => {
            expect(editor.getSnapshot().context.value).toEqual(
              fixture.storedValue,
            )
          })
          expect(
            Array.isArray(
              getValue(
                editor.getSnapshot().context.value,
                fixture.arrayPath as never,
              ),
            ),
          ).toBe(true)

          await userEvent.click(locator)
          editor.send({
            type: 'select',
            at: {
              anchor: {path: fixture.typedSpanPath as never, offset: 3},
              focus: {path: fixture.typedSpanPath as never, offset: 3},
            },
          })
          await userEvent.keyboard('x')

          await vi.waitFor(() => {
            expect(
              (
                getValue(
                  editor.getSnapshot().context.value,
                  fixture.typedSpanPath as never,
                ) as {text: string}
              ).text,
            ).toBe('foox')
          })
          expect(locator.element().textContent).toContain('foox')
        })
      }
    }
  }

  for (const depth of ['root', 'callout', 'table cell'] as const) {
    test(`Scenario: a string segment "1:" after marks at ${depth} leaves marks an array`, async () => {
      const fixture = createFixture(depth, 'marks')
      const {editor} = await createTestEditor({
        schemaDefinition,
        initialValue: fixture.value,
        children: <NodePlugin nodes={containers} />,
      })

      await sendRemoteUnsetAndWaitForDelivery(editor, fixture.unsetPath('1:'))

      expect(editor.getSnapshot().context.value).toEqual(fixture.value)
      expect(
        Array.isArray(
          getValue(
            editor.getSnapshot().context.value,
            fixture.arrayPath as never,
          ),
        ),
      ).toBe(true)
    })
  }

  describe('block ranges', () => {
    function blocks(keys: Array<string>) {
      return keys.map((key) => ({
        _type: 'block',
        _key: key,
        children: [{_type: 'span', _key: `${key}-span`, text: key, marks: []}],
        markDefs: [],
        style: 'normal',
      }))
    }

    test('Scenario: removes the root blocks a range covers', async () => {
      const keyGenerator = createTestKeyGenerator()
      const firstBlockKey = keyGenerator()
      const secondBlockKey = keyGenerator()
      const thirdBlockKey = keyGenerator()
      const {editor} = await createTestEditor({
        schemaDefinition,
        initialValue: blocks([firstBlockKey, secondBlockKey, thirdBlockKey]),
        children: <NodePlugin nodes={containers} />,
      })

      sendRemoteUnset(editor, [segment])

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'block',
            _key: firstBlockKey,
            children: [
              {
                _type: 'span',
                _key: `${firstBlockKey}-span`,
                text: firstBlockKey,
                marks: [],
              },
            ],
            markDefs: [],
            style: 'normal',
          },
        ])
      })
    })

    test('Scenario: removes the callout blocks a range covers', async () => {
      const keyGenerator = createTestKeyGenerator()
      const calloutKey = keyGenerator()
      const firstBlockKey = keyGenerator()
      const secondBlockKey = keyGenerator()
      const thirdBlockKey = keyGenerator()
      const {editor} = await createTestEditor({
        schemaDefinition,
        initialValue: [
          {
            _type: 'callout',
            _key: calloutKey,
            content: blocks([firstBlockKey, secondBlockKey, thirdBlockKey]),
          },
        ],
        children: <NodePlugin nodes={containers} />,
      })

      sendRemoteUnset(editor, [{_key: calloutKey}, 'content', segment])

      await vi.waitFor(() => {
        expect(editor.getSnapshot().context.value).toEqual([
          {
            _type: 'callout',
            _key: calloutKey,
            content: [
              {
                _type: 'block',
                _key: firstBlockKey,
                children: [
                  {
                    _type: 'span',
                    _key: `${firstBlockKey}-span`,
                    text: firstBlockKey,
                    marks: [],
                  },
                ],
                markDefs: [],
                style: 'normal',
              },
            ],
          },
        ])
      })
    })
  })

  test('Scenario: moves the caret to the end of the remaining span when its span is removed', async () => {
    const keyGenerator = createTestKeyGenerator()
    const calloutKey = keyGenerator()
    const blockKey = keyGenerator()
    const first = keyGenerator()
    const second = keyGenerator()
    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition,
      initialValue: [
        {
          _type: 'callout',
          _key: calloutKey,
          content: [
            {
              _type: 'block',
              _key: blockKey,
              children: [
                {_type: 'span', _key: first, text: 'foo', marks: []},
                {_type: 'span', _key: second, text: 'bar', marks: ['strong']},
              ],
              markDefs: [],
              style: 'normal',
            },
          ],
        },
      ],
      children: <NodePlugin nodes={containers} />,
    })

    const blockPath = [{_key: calloutKey}, 'content', {_key: blockKey}]

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: [...blockPath, 'children', {_key: second}], offset: 2},
        focus: {path: [...blockPath, 'children', {_key: second}], offset: 2},
      },
    })

    sendRemoteUnset(editor, [...blockPath, 'children', [1, '']])

    await vi.waitFor(() => {
      expect(editor.getSnapshot().context.selection).toEqual({
        anchor: {path: [...blockPath, 'children', {_key: first}], offset: 3},
        focus: {path: [...blockPath, 'children', {_key: first}], offset: 3},
        backward: false,
      })
    })
  })
})
