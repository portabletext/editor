import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test, vi} from 'vitest'
import {cleanup} from 'vitest-browser-react'
import {defineSchema, type Editor, type PortableTextBlock} from '../src'
import {NodePlugin} from '../src/plugins/plugin.node'
import {defineContainer} from '../src/renderers/renderer.types'
import {isActiveDecorator} from '../src/selectors/selector.is-active-decorator'
import {createTestEditor} from '../src/test/vitest'

// Each iteration mounts a fresh editor and can take seconds, so the sample
// count is fixed instead of filling tinybench's default one-second budget.
const runOptions = {
  iterations: 10,
  time: 0,
  warmupIterations: 2,
  warmupTime: 0,
}

// `vi.waitFor` retries a failing assertion every 50ms by default, so a 1ms
// interval keeps polling overhead out of samples that need a retry.
const waitOptions = {timeout: 15_000, interval: 1}

const benchTimeout = 600_000

type TestEditor = Awaited<ReturnType<typeof createTestEditor>>

describe('Performance', () => {
  describe('Baseline', () => {
    test(
      'Inserting 1000 blocks in an empty editor',
      async ({bench}) => {
        let testEditor: TestEditor
        let blocks: Array<PortableTextBlock>

        await bench(
          'insert 1000 blocks in an empty editor',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              testEditor = await createTestEditor({keyGenerator})
              blocks = textBlocks(keyGenerator, 1000)
            },
            afterEach: cleanup,
          },
          async () => {
            const {editor, locator} = testEditor

            editor.send({type: 'insert.blocks', blocks, placement: 'auto'})

            await vi.waitFor(() => {
              expect(editor.getSnapshot().context.value.length).toBe(1000)
              expect(locator.getByText('b999')).toBeInTheDocument()
            }, waitOptions)
          },
        ).run(runOptions)
      },
      benchTimeout,
    )

    test(
      'Toggling a decorator at the end of a 1000-block document',
      async ({bench}) => {
        let editor: Editor

        await bench(
          'toggle a decorator 10 times at the end of a 1000-block document',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              const testEditor = await createTestEditor({
                keyGenerator,
                schemaDefinition: defineSchema({
                  decorators: [{name: 'strong'}],
                }),
              })
              editor = testEditor.editor
              const blocks = Array.from({length: 1000}, (_, index) =>
                textBlock(keyGenerator, `block ${index}`),
              )
              const lastBlock = blocks[999]!

              editor.send({type: 'insert.blocks', blocks, placement: 'auto'})

              await vi.waitFor(() => {
                expect(editor.getSnapshot().context.value.length).toBe(1000)
                expect(
                  testEditor.locator.getByText('block 999'),
                ).toBeInTheDocument()
              }, waitOptions)

              editor.send({type: 'focus'})
              editor.send({
                type: 'select',
                at: {
                  anchor: {path: spanPath(lastBlock), offset: 0},
                  focus: {path: spanPath(lastBlock), offset: 5},
                },
              })
            },
            afterEach: cleanup,
          },
          async () => {
            for (let toggleIndex = 0; toggleIndex < 10; toggleIndex++) {
              editor.send({type: 'decorator.toggle', decorator: 'strong'})

              await vi.waitFor(() => {
                expect(isActiveDecorator('strong')(editor.getSnapshot())).toBe(
                  toggleIndex % 2 === 0,
                )
              }, waitOptions)
            }
          },
        ).run(runOptions)
      },
      benchTimeout,
    )

    test(
      'Inserting 1000 blocks before an existing block',
      async ({bench}) => {
        let testEditor: TestEditor
        let blocks: Array<PortableTextBlock>
        let existingBlock: PortableTextBlock

        await bench(
          'insert 1000 blocks before an existing block',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              existingBlock = textBlock(keyGenerator, 'foo')
              testEditor = await createTestEditor({
                keyGenerator,
                initialValue: [existingBlock],
              })
              blocks = textBlocks(keyGenerator, 1000)
            },
            afterEach: cleanup,
          },
          async () => {
            const {editor, locator} = testEditor

            editor.send({
              type: 'insert.blocks',
              blocks,
              placement: 'before',
              at: {
                anchor: {path: [{_key: existingBlock._key}], offset: 0},
                focus: {path: [{_key: existingBlock._key}], offset: 0},
              },
            })

            await vi.waitFor(() => {
              expect(editor.getSnapshot().context.value.length).toBe(1001)
              expect(locator.getByText('b999')).toBeInTheDocument()
            }, waitOptions)
          },
        ).run(runOptions)
      },
      benchTimeout,
    )

    test(
      'Inserting 1000 blocks after an existing block',
      async ({bench}) => {
        let testEditor: TestEditor
        let blocks: Array<PortableTextBlock>
        let existingBlock: PortableTextBlock

        await bench(
          'insert 1000 blocks after an existing block',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              existingBlock = textBlock(keyGenerator, 'foo')
              testEditor = await createTestEditor({
                keyGenerator,
                initialValue: [existingBlock],
              })
              blocks = textBlocks(keyGenerator, 1000)
            },
            afterEach: cleanup,
          },
          async () => {
            const {editor, locator} = testEditor

            editor.send({
              type: 'insert.blocks',
              blocks,
              placement: 'after',
              at: {
                anchor: {path: [{_key: existingBlock._key}], offset: 0},
                focus: {path: [{_key: existingBlock._key}], offset: 0},
              },
            })

            await vi.waitFor(() => {
              expect(editor.getSnapshot().context.value.length).toBe(1001)
              expect(locator.getByText('b999')).toBeInTheDocument()
            }, waitOptions)
          },
        ).run(runOptions)
      },
      benchTimeout,
    )
  })

  describe('Deleting', () => {
    test(
      'Removing 1000 blocks via select all and delete',
      async ({bench}) => {
        let editor: Editor

        await bench(
          'remove 1000 blocks via select all and delete',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              const testEditor = await createTestEditor({keyGenerator})
              editor = testEditor.editor
              const blocks = textBlocks(keyGenerator, 1000)
              const firstBlock = blocks[0]!
              const lastBlock = blocks[999]!

              editor.send({type: 'insert.blocks', blocks, placement: 'auto'})

              await vi.waitFor(() => {
                expect(editor.getSnapshot().context.value.length).toBe(1000)
                expect(testEditor.locator.getByText('b999')).toBeInTheDocument()
              }, waitOptions)

              editor.send({
                type: 'select',
                at: {
                  anchor: {path: spanPath(firstBlock), offset: 0},
                  focus: {path: spanPath(lastBlock), offset: 'b999'.length},
                },
              })
            },
            afterEach: cleanup,
          },
          async () => {
            editor.send({type: 'delete'})

            await vi.waitFor(() => {
              expect(editor.getSnapshot().context.value.length).toBe(1)
            }, waitOptions)
          },
        ).run(runOptions)
      },
      benchTimeout,
    )

    test(
      'Backspacing through 20 empty blocks in a 1000-block document',
      async ({bench}) => {
        let editor: Editor

        await bench(
          'backspace through 20 empty blocks in a 1000-block document',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              const testEditor = await createTestEditor({keyGenerator})
              editor = testEditor.editor
              const blocks = textBlocks(keyGenerator, 1000)
              const middleBlock = blocks[500]!

              editor.send({type: 'insert.blocks', blocks, placement: 'auto'})

              await vi.waitFor(() => {
                expect(editor.getSnapshot().context.value.length).toBe(1000)
                expect(testEditor.locator.getByText('b999')).toBeInTheDocument()
              }, waitOptions)

              editor.send({
                type: 'select',
                at: {
                  anchor: {path: spanPath(middleBlock), offset: 0},
                  focus: {path: spanPath(middleBlock), offset: 0},
                },
              })

              for (let breakIndex = 0; breakIndex < 20; breakIndex++) {
                editor.send({type: 'insert.break'})
                await new Promise((resolve) =>
                  queueMicrotask(() => resolve(null)),
                )
              }

              await vi.waitFor(() => {
                expect(editor.getSnapshot().context.value.length).toBe(1020)
              }, waitOptions)
            },
            afterEach: cleanup,
          },
          async () => {
            for (
              let backspaceIndex = 0;
              backspaceIndex < 20;
              backspaceIndex++
            ) {
              editor.send({type: 'delete.backward', unit: 'character'})
              await new Promise((resolve) =>
                queueMicrotask(() => resolve(null)),
              )
            }

            await vi.waitFor(() => {
              expect(editor.getSnapshot().context.value.length).toBe(1000)
            }, waitOptions)
          },
        ).run(runOptions)
      },
      benchTimeout,
    )
  })

  describe('Containers', () => {
    const schemaDefinition = defineSchema({
      blockObjects: [
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
                              of: [{type: 'block'}],
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
    const tableContainer = defineContainer({
      type: 'table',
      arrayField: 'rows',
      render: ({children, node}) => (
        <table data-testid={node._key}>
          <tbody>{children}</tbody>
        </table>
      ),
    })
    const rowContainer = defineContainer({
      type: 'row',
      arrayField: 'cells',
      render: ({children}) => <tr>{children}</tr>,
    })
    const cellContainer = defineContainer({
      type: 'cell',
      arrayField: 'content',
      render: ({children}) => <td>{children}</td>,
    })
    const tablePlugin = (
      <NodePlugin nodes={[tableContainer, rowContainer, cellContainer]} />
    )

    test(
      'Inserting 1000 tables in an empty editor',
      async ({bench}) => {
        let testEditor: TestEditor
        let tables: Array<PortableTextBlock>

        await bench(
          'insert 1000 tables in an empty editor',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              testEditor = await createTestEditor({
                keyGenerator,
                schemaDefinition,
                children: tablePlugin,
              })
              tables = emptyTables(keyGenerator, 1000)
            },
            afterEach: cleanup,
          },
          async () => {
            const {editor, locator} = testEditor

            editor.send({
              type: 'insert.blocks',
              blocks: tables,
              placement: 'auto',
            })

            await vi.waitFor(() => {
              expect(editor.getSnapshot().context.value.length).toBe(1000)
              expect(locator.getByTestId(tables[999]!._key)).toBeInTheDocument()
            }, waitOptions)
          },
        ).run(runOptions)
      },
      benchTimeout,
    )

    test(
      'Inserting 1000 tables before an existing block',
      async ({bench}) => {
        let testEditor: TestEditor
        let tables: Array<PortableTextBlock>
        let existingBlock: PortableTextBlock

        await bench(
          'insert 1000 tables before an existing block',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              existingBlock = textBlock(keyGenerator, 'foo')
              testEditor = await createTestEditor({
                keyGenerator,
                schemaDefinition,
                initialValue: [existingBlock],
                children: tablePlugin,
              })
              tables = emptyTables(keyGenerator, 1000)
            },
            afterEach: cleanup,
          },
          async () => {
            const {editor, locator} = testEditor

            editor.send({
              type: 'insert.blocks',
              blocks: tables,
              placement: 'before',
              at: {
                anchor: {path: [{_key: existingBlock._key}], offset: 0},
                focus: {path: [{_key: existingBlock._key}], offset: 0},
              },
            })

            await vi.waitFor(() => {
              expect(editor.getSnapshot().context.value.length).toBe(1001)
              expect(locator.getByTestId(tables[999]!._key)).toBeInTheDocument()
            }, waitOptions)
          },
        ).run(runOptions)
      },
      benchTimeout,
    )

    test(
      'Inserting 1000 tables after an existing block',
      async ({bench}) => {
        let testEditor: TestEditor
        let tables: Array<PortableTextBlock>
        let existingBlock: PortableTextBlock

        await bench(
          'insert 1000 tables after an existing block',
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              existingBlock = textBlock(keyGenerator, 'foo')
              testEditor = await createTestEditor({
                keyGenerator,
                schemaDefinition,
                initialValue: [existingBlock],
                children: tablePlugin,
              })
              tables = emptyTables(keyGenerator, 1000)
            },
            afterEach: cleanup,
          },
          async () => {
            const {editor, locator} = testEditor

            editor.send({
              type: 'insert.blocks',
              blocks: tables,
              placement: 'after',
              at: {
                anchor: {path: [{_key: existingBlock._key}], offset: 0},
                focus: {path: [{_key: existingBlock._key}], offset: 0},
              },
            })

            await vi.waitFor(() => {
              expect(editor.getSnapshot().context.value.length).toBe(1001)
              expect(locator.getByTestId(tables[999]!._key)).toBeInTheDocument()
            }, waitOptions)
          },
        ).run(runOptions)
      },
      benchTimeout,
    )
  })

  describe('Deep nested containers', () => {
    const schemaDefinition = defineSchema({
      blockObjects: [
        {
          name: 'list',
          fields: [
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
    const listContainer = defineContainer({
      type: 'list',
      arrayField: 'items',
      render: ({children, node}) => (
        <ul data-testid={`list-${node._key}`}>{children}</ul>
      ),
    })
    const listItemContainer = defineContainer({
      type: 'list-item',
      arrayField: 'content',
      render: ({children, node}) => (
        <li data-testid={`li-${node._key}`}>{children}</li>
      ),
    })

    test(
      'Setting progressively deeper nested list values',
      async ({bench}) => {
        const indents = 30
        let testEditor: TestEditor
        let sinkContentPath: [
          {_key: string},
          'items',
          {_key: string},
          'content',
        ]
        let nestedValues: Array<{value: unknown; deepestListKey: string}>

        await bench(
          `set deepening nested list ${indents} times`,
          {
            beforeEach: async () => {
              const keyGenerator = createTestKeyGenerator()
              const root = keyGenerator()
              const sink = keyGenerator()
              const item = keyGenerator()
              const levelKeys = Array.from({length: indents}, () => ({
                list: keyGenerator(),
                listItem: keyGenerator(),
              }))
              const leafBlock = textBlock(keyGenerator, 'leaf')

              testEditor = await createTestEditor({
                keyGenerator,
                schemaDefinition,
                initialValue: [
                  {
                    _type: 'list',
                    _key: root,
                    items: [
                      {
                        _type: 'list-item',
                        _key: sink,
                        content: [textBlock(keyGenerator, 'sink')],
                      },
                      {
                        _type: 'list-item',
                        _key: item,
                        content: [textBlock(keyGenerator, 'item')],
                      },
                    ],
                  },
                ],
                children: (
                  <NodePlugin nodes={[listContainer, listItemContainer]} />
                ),
              })

              await expect
                .element(testEditor.locator.getByTestId(`li-${item}`))
                .toBeInTheDocument()

              sinkContentPath = [{_key: root}, 'items', {_key: sink}, 'content']
              nestedValues = Array.from({length: indents}, (_, indent) => ({
                value: nestedList(levelKeys.slice(0, indent + 1), leafBlock),
                deepestListKey: levelKeys[indent]!.list,
              }))
            },
            afterEach: cleanup,
          },
          async () => {
            const {editor, locator} = testEditor

            for (const {value, deepestListKey} of nestedValues) {
              editor.send({
                type: 'set',
                at: sinkContentPath,
                value: [value],
              } as never)

              await vi.waitFor(() => {
                expect(
                  locator.getByTestId(`list-${deepestListKey}`),
                ).toBeInTheDocument()
              }, waitOptions)
            }
          },
        ).run(runOptions)
      },
      benchTimeout,
    )
  })
})

function textBlock(
  keyGenerator: () => string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: keyGenerator(),
    children: [{_type: 'span', _key: keyGenerator(), text, marks: []}],
    markDefs: [],
    style: 'normal',
  }
}

function textBlocks(
  keyGenerator: () => string,
  count: number,
): Array<PortableTextBlock> {
  return Array.from({length: count}, (_, index) =>
    textBlock(keyGenerator, `b${index}`),
  )
}

function emptyTables(
  keyGenerator: () => string,
  count: number,
): Array<PortableTextBlock> {
  return Array.from({length: count}, () => ({
    _type: 'table',
    _key: keyGenerator(),
  }))
}

function spanPath(block: PortableTextBlock) {
  const span = (block.children as Array<{_key: string}>)[0]!

  return [{_key: block._key}, 'children', {_key: span._key}]
}

function nestedList(
  levelKeys: Array<{list: string; listItem: string}>,
  leafBlock: PortableTextBlock,
): unknown {
  let inner: unknown = leafBlock

  for (let level = levelKeys.length - 1; level >= 0; level--) {
    inner = {
      _type: 'list',
      _key: levelKeys[level]!.list,
      items: [
        {
          _type: 'list-item',
          _key: levelKeys[level]!.listItem,
          content: [inner],
        },
      ],
    }
  }

  return inner
}
