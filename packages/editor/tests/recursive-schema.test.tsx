import {applyAll, type Patch} from '@portabletext/patches'
import {defineSchema, type PortableTextBlock} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {userEvent} from 'vitest/browser'
import {safeParse, safeStringify} from '../src/internal-utils/safe-json'
import {EventListenerPlugin} from '../src/plugins'
import {ContainerPlugin} from '../src/plugins/plugin.container'
import {defineContainer} from '../src/renderers/renderer.types'
import {createTestEditor} from '../src/test/vitest'
import {toTextspec} from '../test-utils/to-textspec'

/**
 * Tests for self-referential / recursive schemas.
 *
 * The schema declares a `list` block-object whose items are `list-item`
 * objects, and whose `list-item.content.of` references back to `list`.
 * This reproduces the kind of nesting markdown deserializers (and other
 * recursive sources) produce, where the runtime data is deeper than the
 * resolver's bounded schema walk can pre-emit candidates for.
 */

const recursiveListSchema = defineSchema({
  decorators: [{name: 'strong'}],
  blockObjects: [
    {
      name: 'list',
      fields: [
        {name: 'kind', type: 'string'},
        {
          name: 'items',
          type: 'array',
          of: [
            {
              type: 'object',
              name: 'list-item',
              fields: [
                {
                  name: 'content',
                  type: 'array',
                  of: [{type: 'block'}, {type: 'list'}],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
})

const listContainer = defineContainer<typeof recursiveListSchema>({
  scope: '$..list',
  field: 'items',
  render: ({attributes, children}) => (
    <ul data-testid="list" {...attributes}>
      {children}
    </ul>
  ),
})

const listItemContainer = defineContainer<typeof recursiveListSchema>({
  scope: '$..list.list-item',
  field: 'content',
  render: ({attributes, children}) => (
    <li data-testid="list-item" {...attributes}>
      {children}
    </li>
  ),
})

/**
 * Read a nested field from a PortableTextBlock, asserting it exists.
 * Keeps the deep-walk test code readable without type casts at every hop.
 */
function field<T>(node: unknown, key: string): T {
  const value = (node as Record<string, unknown>)[key]
  if (value === undefined) {
    throw new Error(`Expected field "${key}" to exist on node`)
  }
  return value as T
}

/**
 * Walk `[outer-list].items[0].content[1]` repeatedly to step `depth`
 * levels into a nested-list-of-list-items structure. Returns the
 * deepest list-item.
 */
function deepestListItem(
  outerList: PortableTextBlock,
  depth: number,
): PortableTextBlock {
  let cursor: PortableTextBlock = outerList
  for (let i = 0; i < depth; i++) {
    const items = field<Array<PortableTextBlock>>(cursor, 'items')
    const item = items[0]
    if (!item) {
      throw new Error(`No item at depth ${i + 1}`)
    }
    if (i === depth - 1) {
      return item
    }
    const content = field<Array<PortableTextBlock>>(item, 'content')
    const nestedList = content[1]
    if (!nestedList) {
      throw new Error(`No nested list at depth ${i + 1}`)
    }
    cursor = nestedList
  }
  throw new Error('unreachable')
}

/**
 * Build a list nested `depth` levels deep, where each level contains a
 * single list-item whose content holds a single text block (and, for
 * non-leaf levels, a nested list).
 *
 * For depth=3 the shape is:
 *   list[k1] -> items[k2] -> content[k3 text-block, k4 list[...]]
 */
function buildNestedList(
  keyGenerator: () => string,
  depth: number,
): PortableTextBlock {
  if (depth < 1) {
    throw new Error('depth must be >= 1')
  }

  const wrap = (level: number): PortableTextBlock => {
    const listKey = keyGenerator()
    const itemKey = keyGenerator()
    const textBlockKey = keyGenerator()
    const spanKey = keyGenerator()

    const content: Array<PortableTextBlock> = [
      {
        _type: 'block',
        _key: textBlockKey,
        children: [
          {
            _type: 'span',
            _key: spanKey,
            text: `level-${level}`,
            marks: [],
          },
        ],
        markDefs: [],
        style: 'normal',
      } as PortableTextBlock,
    ]

    if (level < depth) {
      content.push(wrap(level + 1))
    }

    return {
      _type: 'list',
      _key: listKey,
      kind: 'bullet',
      items: [
        {
          _type: 'list-item',
          _key: itemKey,
          content,
        } as PortableTextBlock,
      ],
    } as PortableTextBlock
  }

  return wrap(1)
}

describe('recursive schemas (lists in list-items in lists)', () => {
  test('Scenario: renders all three nesting levels as containers', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [buildNestedList(keyGenerator, 3)]

    const {locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: recursiveListSchema,
      initialValue,
      children: (
        <ContainerPlugin containers={[listContainer, listItemContainer]} />
      ),
    })

    await vi.waitFor(() => {
      expect(locator.getByTestId('list').elements()).toHaveLength(3)
      expect(locator.getByTestId('list-item').elements()).toHaveLength(3)
    })
  })

  test('Scenario: incoming `set` patch on a deep span text applies correctly', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [buildNestedList(keyGenerator, 3)]

    const {editor} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: recursiveListSchema,
      initialValue,
      children: (
        <ContainerPlugin containers={[listContainer, listItemContainer]} />
      ),
    })

    const outerList = editor.getSnapshot().context.value[0] as PortableTextBlock
    const outerItem = field<Array<PortableTextBlock>>(outerList, 'items')[0]!
    const middleList = field<Array<PortableTextBlock>>(outerItem, 'content')[1]!
    const middleItem = field<Array<PortableTextBlock>>(middleList, 'items')[0]!
    const innerList = field<Array<PortableTextBlock>>(middleItem, 'content')[1]!
    const innerItem = field<Array<PortableTextBlock>>(innerList, 'items')[0]!
    const innerTextBlock = field<Array<PortableTextBlock>>(
      innerItem,
      'content',
    )[0]!
    const innerSpan = field<Array<{_key: string; text: string}>>(
      innerTextBlock,
      'children',
    )[0]!

    editor.send({
      type: 'patches',
      patches: [
        {
          type: 'set',
          path: [
            {_key: outerList._key!},
            'items',
            {_key: outerItem._key!},
            'content',
            {_key: middleList._key!},
            'items',
            {_key: middleItem._key!},
            'content',
            {_key: innerList._key!},
            'items',
            {_key: innerItem._key!},
            'content',
            {_key: innerTextBlock._key!},
            'children',
            {_key: innerSpan._key},
            'text',
          ],
          value: 'remote-edit',
          origin: 'remote',
        },
      ],
      snapshot: undefined,
    })

    await vi.waitFor(() => {
      const updated = editor.getSnapshot().context.value[0] as PortableTextBlock
      const i3 = deepestListItem(updated, 3)
      const tb = field<Array<PortableTextBlock>>(i3, 'content')[0]!
      const span = field<Array<{text: string}>>(tb, 'children')[0]!
      expect(span.text).toBe('remote-edit')
    })
  })

  test('Scenario: typing at a deep span emits patches that round-trip through applyAll', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [buildNestedList(keyGenerator, 3)]

    const emittedPatches: Array<Patch> = []
    let remoteValue = safeParse(
      safeStringify(initialValue),
    ) as Array<PortableTextBlock>

    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: recursiveListSchema,
      initialValue,
      children: (
        <>
          <ContainerPlugin containers={[listContainer, listItemContainer]} />
          <EventListenerPlugin
            on={(event) => {
              if (event.type === 'patch') {
                const {origin: _, ...patch} = event.patch
                remoteValue = applyAll(remoteValue, [patch])
                emittedPatches.push(patch)
              }
            }}
          />
        </>
      ),
    })

    const outer = editor.getSnapshot().context.value[0] as PortableTextBlock
    const i3 = deepestListItem(outer, 3)
    const innerTextBlock = field<Array<PortableTextBlock>>(i3, 'content')[0]!
    const innerSpan = field<Array<{_key: string; text: string}>>(
      innerTextBlock,
      'children',
    )[0]!

    const outerItem = field<Array<PortableTextBlock>>(outer, 'items')[0]!
    const middleList = field<Array<PortableTextBlock>>(outerItem, 'content')[1]!
    const middleItem = field<Array<PortableTextBlock>>(middleList, 'items')[0]!
    const innerList = field<Array<PortableTextBlock>>(middleItem, 'content')[1]!

    const innerSpanPath = [
      {_key: outer._key!},
      'items',
      {_key: outerItem._key!},
      'content',
      {_key: middleList._key!},
      'items',
      {_key: middleItem._key!},
      'content',
      {_key: innerList._key!},
      'items',
      {_key: i3._key!},
      'content',
      {_key: innerTextBlock._key!},
      'children',
      {_key: innerSpan._key},
    ]

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: innerSpanPath, offset: innerSpan.text.length},
        focus: {path: innerSpanPath, offset: innerSpan.text.length},
      },
    })

    await userEvent.keyboard('!')

    await vi.waitFor(() => {
      expect(emittedPatches.length).toBeGreaterThan(0)
      // The remote value (built by applying patches in order) must equal
      // the editor's authoritative value.
      expect(remoteValue).toEqual(editor.getSnapshot().context.value)
    })
  })

  test('Scenario: Enter on empty trailing line in deepest list with empty previous sibling escapes one level out', async () => {
    // Build depth=3, then append two empty trailing text blocks to the
    // INNER list-item's content (after the existing text block + nested
    // list-or-block at content[1]). The escape should land as a sibling
    // of the inner list, inside the middle list-item's content.
    const initialValue: Array<PortableTextBlock> = [
      {
        _type: 'list',
        _key: 'L1',
        kind: 'bullet',
        items: [
          {
            _type: 'list-item',
            _key: 'I1',
            content: [
              {
                _type: 'block',
                _key: 'T1',
                children: [
                  {_type: 'span', _key: 'S1', text: 'outer', marks: []},
                ],
                markDefs: [],
                style: 'normal',
              },
              {
                _type: 'list',
                _key: 'L2',
                kind: 'bullet',
                items: [
                  {
                    _type: 'list-item',
                    _key: 'I2',
                    content: [
                      {
                        _type: 'block',
                        _key: 'T2',
                        children: [
                          {
                            _type: 'span',
                            _key: 'S2',
                            text: 'middle',
                            marks: [],
                          },
                        ],
                        markDefs: [],
                        style: 'normal',
                      },
                      {
                        _type: 'list',
                        _key: 'L3',
                        kind: 'bullet',
                        items: [
                          {
                            _type: 'list-item',
                            _key: 'I3',
                            content: [
                              {
                                _type: 'block',
                                _key: 'T3',
                                children: [
                                  {
                                    _type: 'span',
                                    _key: 'S3',
                                    text: 'inner',
                                    marks: [],
                                  },
                                ],
                                markDefs: [],
                                style: 'normal',
                              },
                              {
                                _type: 'block',
                                _key: 'EMPTY-PREV',
                                children: [
                                  {
                                    _type: 'span',
                                    _key: 'EMPTY-PREV-S',
                                    text: '',
                                    marks: [],
                                  },
                                ],
                                markDefs: [],
                                style: 'normal',
                              },
                              {
                                _type: 'block',
                                _key: 'EMPTY-LAST',
                                children: [
                                  {
                                    _type: 'span',
                                    _key: 'EMPTY-LAST-S',
                                    text: '',
                                    marks: [],
                                  },
                                ],
                                markDefs: [],
                                style: 'normal',
                              },
                            ],
                          } as PortableTextBlock,
                        ],
                      } as PortableTextBlock,
                    ],
                  } as PortableTextBlock,
                ],
              } as PortableTextBlock,
            ],
          } as PortableTextBlock,
        ],
      } as PortableTextBlock,
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: recursiveListSchema,
      initialValue,
      children: (
        <ContainerPlugin containers={[listContainer, listItemContainer]} />
      ),
    })

    const emptyLastSpanPath = [
      {_key: 'L1'},
      'items',
      {_key: 'I1'},
      'content',
      {_key: 'L2'},
      'items',
      {_key: 'I2'},
      'content',
      {_key: 'L3'},
      'items',
      {_key: 'I3'},
      'content',
      {_key: 'EMPTY-LAST'},
      'children',
      {_key: 'EMPTY-LAST-S'},
    ]

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: emptyLastSpanPath, offset: 0},
        focus: {path: emptyLastSpanPath, offset: 0},
      },
    })

    await userEvent.keyboard('{Enter}')

    // After Enter: both empty trailing blocks are removed from L3's
    // inner list-item content. A fresh text block is inserted as a
    // sibling of L3 inside I2's content (one level out from the deepest
    // list). I2.content should now be: [T2 ('middle'), L3 (with only T3
    // remaining), <new empty block>].
    await vi.waitFor(() => {
      const value = editor.getSnapshot().context.value
      expect(value).toHaveLength(1)
      const l1 = value[0] as unknown as {items: Array<PortableTextBlock>}
      const i1 = l1.items[0] as unknown as {
        content: Array<PortableTextBlock>
      }
      expect(i1.content).toHaveLength(2)
      const l2 = i1.content[1] as unknown as {
        items: Array<PortableTextBlock>
      }
      const i2 = l2.items[0] as unknown as {
        content: Array<PortableTextBlock>
      }
      // I2's content should be [T2, L3 (cleaned), new empty text block].
      expect(i2.content).toHaveLength(3)
      expect((i2.content[0] as PortableTextBlock)._key).toBe('T2')
      expect((i2.content[1] as PortableTextBlock)._key).toBe('L3')
      expect((i2.content[2] as PortableTextBlock)._type).toBe('block')
      const l3 = i2.content[1] as unknown as {
        items: Array<PortableTextBlock>
      }
      const i3 = l3.items[0] as unknown as {
        content: Array<PortableTextBlock>
      }
      // The two empty trailing blocks are gone; only T3 remains.
      expect(i3.content).toHaveLength(1)
      expect((i3.content[0] as PortableTextBlock)._key).toBe('T3')
    })
  })

  test('Scenario: typing at a deep position appends to the deep span', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [buildNestedList(keyGenerator, 3)]

    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: recursiveListSchema,
      initialValue,
      children: (
        <ContainerPlugin containers={[listContainer, listItemContainer]} />
      ),
    })

    const outer = editor.getSnapshot().context.value[0] as PortableTextBlock
    const outerItem = field<Array<PortableTextBlock>>(outer, 'items')[0]!
    const middleList = field<Array<PortableTextBlock>>(outerItem, 'content')[1]!
    const middleItem = field<Array<PortableTextBlock>>(middleList, 'items')[0]!
    const innerList = field<Array<PortableTextBlock>>(middleItem, 'content')[1]!
    const i3 = deepestListItem(outer, 3)
    const innerTextBlock = field<Array<PortableTextBlock>>(i3, 'content')[0]!
    const innerSpan = field<Array<{_key: string; text: string}>>(
      innerTextBlock,
      'children',
    )[0]!

    const innerSpanPath = [
      {_key: outer._key!},
      'items',
      {_key: outerItem._key!},
      'content',
      {_key: middleList._key!},
      'items',
      {_key: middleItem._key!},
      'content',
      {_key: innerList._key!},
      'items',
      {_key: i3._key!},
      'content',
      {_key: innerTextBlock._key!},
      'children',
      {_key: innerSpan._key},
    ]

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: innerSpanPath, offset: innerSpan.text.length},
        focus: {path: innerSpanPath, offset: innerSpan.text.length},
      },
    })

    await userEvent.keyboard('!')

    await vi.waitFor(() => {
      const out = editor.getSnapshot().context.value[0] as PortableTextBlock
      const item3 = deepestListItem(out, 3)
      const tb = field<Array<PortableTextBlock>>(item3, 'content')[0]!
      const span = field<Array<{text: string}>>(tb, 'children')[0]!
      expect(span.text).toBe('level-3!')
    })
  })

  test('Scenario: decorator toggle on a deep span emits a strong mark', async () => {
    const keyGenerator = createTestKeyGenerator()
    const initialValue = [buildNestedList(keyGenerator, 3)]

    const {editor, locator} = await createTestEditor({
      keyGenerator: createTestKeyGenerator(),
      schemaDefinition: recursiveListSchema,
      initialValue,
      children: (
        <ContainerPlugin containers={[listContainer, listItemContainer]} />
      ),
    })

    const outer = editor.getSnapshot().context.value[0] as PortableTextBlock
    const outerItem = field<Array<PortableTextBlock>>(outer, 'items')[0]!
    const middleList = field<Array<PortableTextBlock>>(outerItem, 'content')[1]!
    const middleItem = field<Array<PortableTextBlock>>(middleList, 'items')[0]!
    const innerList = field<Array<PortableTextBlock>>(middleItem, 'content')[1]!
    const i3 = deepestListItem(outer, 3)
    const innerTextBlock = field<Array<PortableTextBlock>>(i3, 'content')[0]!
    const innerSpan = field<Array<{_key: string; text: string}>>(
      innerTextBlock,
      'children',
    )[0]!

    const innerSpanPath = [
      {_key: outer._key!},
      'items',
      {_key: outerItem._key!},
      'content',
      {_key: middleList._key!},
      'items',
      {_key: middleItem._key!},
      'content',
      {_key: innerList._key!},
      'items',
      {_key: i3._key!},
      'content',
      {_key: innerTextBlock._key!},
      'children',
      {_key: innerSpan._key},
    ]

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: innerSpanPath, offset: 0},
        focus: {path: innerSpanPath, offset: innerSpan.text.length},
      },
    })

    editor.send({type: 'decorator.toggle', decorator: 'strong'})

    await vi.waitFor(() => {
      const out = editor.getSnapshot().context.value[0] as PortableTextBlock
      const item3 = deepestListItem(out, 3)
      const tb = field<Array<PortableTextBlock>>(item3, 'content')[0]!
      const span = field<Array<{marks: Array<string>}>>(tb, 'children')[0]!
      expect(span.marks).toEqual(['strong'])
    })
  })

  test('Scenario: pressing Enter from the deepest list-item escapes one level per pair of presses, all the way to root', async () => {
    // Build:
    //   - level-1
    //     - level-2
    //       - level-3
    //
    // Caret at end of "level-3". Repeated Enters trace this pattern:
    //   #1: inserts empty trailing block in I3 (deepest list-item)
    //   #2: inserts another empty in I3 (now empty-prev + empty-last)
    //   #3: ESCAPE to I2 — empties collapse, new block sibling of L3 in I2
    //   #4: inserts another empty in I2
    //   #5: ESCAPE to I1
    //   #6: inserts another empty in I1
    //   #7: ESCAPE to root (sibling of the outermost list)
    //
    // Total: 2 Enters + (3 Enters per level of escape) - 1 = 7 Enters to
    // escape from depth 3 to root. The pattern is deterministic at any depth.
    const keyGenerator = createTestKeyGenerator()
    const initialValue: Array<PortableTextBlock> = [
      buildNestedList(keyGenerator, 3),
    ]

    const {editor, locator} = await createTestEditor({
      keyGenerator,
      schemaDefinition: recursiveListSchema,
      initialValue,
      children: (
        <ContainerPlugin containers={[listContainer, listItemContainer]} />
      ),
    })

    // Walk the value to find the deepest span ('level-3') and place caret
    // at its end.
    const initialL1 = editor.getSnapshot().context.value[0] as PortableTextBlock
    const i1 = (initialL1 as unknown as {items: Array<PortableTextBlock>})
      .items[0]!
    const i1Content = (i1 as unknown as {content: Array<PortableTextBlock>})
      .content
    const l2 = i1Content[1] as PortableTextBlock
    const i2 = (l2 as unknown as {items: Array<PortableTextBlock>}).items[0]!
    const i2Content = (i2 as unknown as {content: Array<PortableTextBlock>})
      .content
    const l3 = i2Content[1] as PortableTextBlock
    const i3 = (l3 as unknown as {items: Array<PortableTextBlock>}).items[0]!
    const i3Content = (i3 as unknown as {content: Array<PortableTextBlock>})
      .content
    const t3 = i3Content[0] as PortableTextBlock
    const t3Children = (t3 as unknown as {children: Array<{_key: string}>})
      .children
    const s3 = t3Children[0]!

    const deepSpanPath = [
      {_key: initialL1._key!},
      'items',
      {_key: i1._key!},
      'content',
      {_key: l2._key!},
      'items',
      {_key: i2._key!},
      'content',
      {_key: l3._key!},
      'items',
      {_key: i3._key!},
      'content',
      {_key: t3._key!},
      'children',
      {_key: s3._key},
    ]

    await userEvent.click(locator)
    editor.send({
      type: 'select',
      at: {
        anchor: {path: deepSpanPath, offset: 'level-3'.length},
        focus: {path: deepSpanPath, offset: 'level-3'.length},
      },
    })

    async function pressEnter() {
      await userEvent.keyboard('{Enter}')
      await vi.waitFor(() => {
        editor.getSnapshot().context.value
      })
    }

    // #1: split inserts an empty trailing block in I3.
    await pressEnter()
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    B: level-1',
        '    LIST:',
        '      LIST-ITEM:',
        '        B: level-2',
        '        LIST:',
        '          LIST-ITEM:',
        '            B: level-3',
        '            B: |',
      ].join('\n'),
    )

    // #2: another empty trailing block in I3 (now empty-prev + empty-last).
    await pressEnter()
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    B: level-1',
        '    LIST:',
        '      LIST-ITEM:',
        '        B: level-2',
        '        LIST:',
        '          LIST-ITEM:',
        '            B: level-3',
        '            B: ',
        '            B: |',
      ].join('\n'),
    )

    // #3: ESCAPE — empties collapse, new sibling of L3 in I2.
    await pressEnter()
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    B: level-1',
        '    LIST:',
        '      LIST-ITEM:',
        '        B: level-2',
        '        LIST:',
        '          LIST-ITEM:',
        '            B: level-3',
        '        B: |',
      ].join('\n'),
    )

    // #4: another empty trailing block in I2.
    await pressEnter()
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    B: level-1',
        '    LIST:',
        '      LIST-ITEM:',
        '        B: level-2',
        '        LIST:',
        '          LIST-ITEM:',
        '            B: level-3',
        '        B: ',
        '        B: |',
      ].join('\n'),
    )

    // #5: ESCAPE to I1.
    await pressEnter()
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    B: level-1',
        '    LIST:',
        '      LIST-ITEM:',
        '        B: level-2',
        '        LIST:',
        '          LIST-ITEM:',
        '            B: level-3',
        '    B: |',
      ].join('\n'),
    )

    // #6: another empty trailing block in I1.
    await pressEnter()
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    B: level-1',
        '    LIST:',
        '      LIST-ITEM:',
        '        B: level-2',
        '        LIST:',
        '          LIST-ITEM:',
        '            B: level-3',
        '    B: ',
        '    B: |',
      ].join('\n'),
    )

    // #7: ESCAPE to root.
    await pressEnter()
    expect(toTextspec(editor.getSnapshot().context)).toEqual(
      [
        'LIST:',
        '  LIST-ITEM:',
        '    B: level-1',
        '    LIST:',
        '      LIST-ITEM:',
        '        B: level-2',
        '        LIST:',
        '          LIST-ITEM:',
        '            B: level-3',
        'B: |',
      ].join('\n'),
    )
  })
})
