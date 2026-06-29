import {compileSchema, defineSchema} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import type {EditorSchema} from '../editor/editor-schema'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import {defineContainer, type Container} from '../renderers/renderer.types'
import type {RegisteredContainer} from '../schema/container-types'
import {resolveContainerField} from '../schema/resolve-container-field'

/**
 * Container definitions for the testbed's table structure
 * (`table` → `rows`, `row` → `cells`, `cell` → `content`).
 */
export const tableContainers: ReadonlyArray<Container> = [
  {kind: 'container', type: 'table', arrayField: 'rows'},
  {kind: 'container', type: 'row', arrayField: 'cells'},
  {kind: 'container', type: 'cell', arrayField: 'content'},
]

/**
 * Container definition for the testbed's code block
 * (`code-block` → `code`).
 */
export const codeBlockContainer: Container = defineContainer({
  type: 'code-block',
  arrayField: 'code',
})

/**
 * Build the testbed's `containers` map from a set of container
 * registrations. Useful for tests that vary which containers are registered.
 */
export function resolveTestbedContainers(
  schema: EditorSchema,
  containers: ReadonlyArray<Container>,
): Map<string, RegisteredContainer> {
  const resolved = new Map<string, RegisteredContainer>()
  for (const container of containers) {
    const field = resolveContainerField(
      schema,
      container.type,
      container.arrayField,
    )
    if (!field) {
      throw new Error(
        `resolveTestbedContainers: field "${container.arrayField}" not found on type "${container.type}"`,
      )
    }
    resolved.set(container.type, {
      kind: 'container',
      type: container.type,
      field,
    })
  }
  return resolved
}

/**
 * A comprehensive test fixture for node traversal tests.
 *
 * Structure:
 *
 * root
 * ├── textBlock1                                [0]
 * │   ├── span1 "hello "                        [0, 0]
 * │   ├── stockTicker1 (inline object)          [0, 1]
 * │   └── span2 " world"                        [0, 2]
 * ├── image (block object, no children)         [1]
 * ├── textBlock2                                [2]
 * │   └── span3 "second block"                  [2, 0]
 * ├── codeBlock (block object)                  [3]
 * │   └── code
 * │       ├── codeLine1                         [3, 0]
 * │       │   └── codeSpan1                     [3, 0, 0]
 * │       └── codeLine2                         [3, 1]
 * │           └── codeSpan2                     [3, 1, 0]
 * └── table (nested block object)               [4]
 *     └── rows
 *         ├── row1                              [4, 0]
 *         │   ├── cell1                         [4, 0, 0]
 *         │   │   └── content
 *         │   │       ├── cellBlock1            [4, 0, 0, 0]
 *         │   │       │   ├── cellSpan1 "a "    [4, 0, 0, 0, 0]
 *         │   │       │   └── stockTicker2      [4, 0, 0, 0, 1]
 *         │   │       └── cellBlock2            [4, 0, 0, 1]
 *         │   │           └── cellSpan2 "b"     [4, 0, 0, 1, 0]
 *         │   └── cell2                         [4, 0, 1]
 *         │       └── content
 *         │           └── cellBlock3            [4, 0, 1, 0]
 *         │               └── cellSpan3 "c"     [4, 0, 1, 0, 0]
 *         └── row2                              [4, 1]
 *             └── cell3                         [4, 1, 0]
 *                 └── content
 *                     └── emptyBlock            [4, 1, 0, 0]
 *                         └── emptySpan ""      [4, 1, 0, 0, 0]
 */
export function createNodeTraversalTestbed() {
  const keyGenerator = createTestKeyGenerator()

  const link1 = {_key: 'mark1', _type: 'link', href: 'https://a'}
  const span1 = {
    _key: keyGenerator(),
    _type: 'span',
    text: 'hello ',
    marks: ['mark1'],
  }
  const stockTicker1 = {_key: keyGenerator(), _type: 'stock-ticker'}
  const span2 = {_key: keyGenerator(), _type: 'span', text: ' world'}
  const textBlock1 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [span1, stockTicker1, span2],
    markDefs: [link1],
  }

  const image = {_key: keyGenerator(), _type: 'image'}

  const span3 = {_key: keyGenerator(), _type: 'span', text: 'second block'}
  const textBlock2 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [span3],
  }

  const codeSpan1 = {_key: keyGenerator(), _type: 'span', text: 'const a = 1'}
  const codeLine1 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [codeSpan1],
  }
  const codeSpan2 = {
    _key: keyGenerator(),
    _type: 'span',
    text: 'console.log(a)',
  }
  const codeLine2 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [codeSpan2],
  }
  const codeBlock = {
    _key: keyGenerator(),
    _type: 'code-block',
    code: [codeLine1, codeLine2],
  }

  const cellSpan1 = {_key: keyGenerator(), _type: 'span', text: 'a '}
  const stockTicker2 = {_key: keyGenerator(), _type: 'stock-ticker'}
  const cellBlock1 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [cellSpan1, stockTicker2],
  }
  const cellSpan2 = {_key: keyGenerator(), _type: 'span', text: 'b'}
  const cellBlock2 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [cellSpan2],
  }
  const cell1 = {
    _key: keyGenerator(),
    _type: 'cell',
    content: [cellBlock1, cellBlock2],
  }

  const cellSpan3 = {_key: keyGenerator(), _type: 'span', text: 'c'}
  const cellBlock3 = {
    _key: keyGenerator(),
    _type: 'block',
    children: [cellSpan3],
  }
  const cell2 = {
    _key: keyGenerator(),
    _type: 'cell',
    content: [cellBlock3],
  }

  const row1 = {
    _key: keyGenerator(),
    _type: 'row',
    cells: [cell1, cell2],
  }

  const emptySpan = {_key: keyGenerator(), _type: 'span', text: ''}
  const emptyBlock = {
    _key: keyGenerator(),
    _type: 'block',
    children: [emptySpan],
  }
  const cell3 = {
    _key: keyGenerator(),
    _type: 'cell',
    content: [emptyBlock],
  }
  const row2 = {
    _key: keyGenerator(),
    _type: 'row',
    cells: [cell3],
  }

  const table = {
    _key: keyGenerator(),
    _type: 'table',
    rows: [row1, row2],
  }

  const schema = compileSchema(
    defineSchema({
      annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
      inlineObjects: [{name: 'stock-ticker'}],
      blockObjects: [
        {name: 'image'},
        {
          name: 'code-block',
          fields: [
            {
              name: 'code',
              type: 'array',
              of: [{type: 'block'}],
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
    }),
  )

  const value = [textBlock1, image, textBlock2, codeBlock, table]
  const containers = resolveTestbedContainers(schema, [
    codeBlockContainer,
    ...tableContainers,
  ])
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps(
    {schema, containers, value},
    {blockIndexMap, listIndexMap: new Map<string, number>()},
  )

  const context = {
    schema,
    containers,
    value,
    blockIndexMap,
  }

  const snapshot = {
    context: {schema, containers, value},
    blockIndexMap,
  }

  return {
    schema,
    context,
    snapshot,
    textBlock1,
    link1,
    span1,
    stockTicker1,
    span2,
    image,
    textBlock2,
    span3,
    codeBlock,
    codeLine1,
    codeSpan1,
    codeLine2,
    codeSpan2,
    table,
    row1,
    cell1,
    cellBlock1,
    cellSpan1,
    stockTicker2,
    cellBlock2,
    cellSpan2,
    cell2,
    cellBlock3,
    cellSpan3,
    row2,
    cell3,
    emptyBlock,
    emptySpan,
  }
}
