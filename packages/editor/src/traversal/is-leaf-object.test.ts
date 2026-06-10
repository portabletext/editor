import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {buildIndexMaps} from '../internal-utils/build-index-maps'
import type {
  ChildArrayField,
  RegisteredContainer,
} from '../schema/resolve-containers'
import {isLeafObject} from './is-leaf-object'
import {createNodeTraversalTestbed} from './node-traversal-testbed'

function buildBlockIndexMap(
  schema: any,
  containers: any,
  value: any,
): Map<string, number> {
  const blockIndexMap = new Map<string, number>()
  buildIndexMaps(
    {schema, value, containers},
    {blockIndexMap, listIndexMap: new Map<string, number>()},
  )
  return blockIndexMap
}

function registeredContainerFor(
  type: string,
  field: ChildArrayField,
): RegisteredContainer {
  return {kind: 'container', type, field}
}

describe(isLeafObject.name, () => {
  const testbed = createNodeTraversalTestbed()

  describe('root-level nodes', () => {
    test('text block is not void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.textBlock1, [{_key: 'k3'}]),
      ).toBe(false)
    })

    test('block object without container registration is void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.image, [{_key: 'k4'}]),
      ).toBe(true)
    })

    test('block object with container registration is not void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.table, [{_key: 'k26'}]),
      ).toBe(false)
    })

    test('code block with container registration is not void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.codeBlock, [{_key: 'k11'}]),
      ).toBe(false)
    })
  })

  describe('inline objects', () => {
    test('inline object at root level is void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.stockTicker1, [
          {_key: 'k3'},
          'children',
          {_key: 'k1'},
        ]),
      ).toBe(true)
    })

    test('inline object inside container is void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.stockTicker2, [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k14'},
          'children',
          {_key: 'k13'},
        ]),
      ).toBe(true)
    })
  })

  describe('nested container nodes', () => {
    test('row inside table is not void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.row1, [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
        ]),
      ).toBe(false)
    })

    test('cell inside table row is not void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.cell1, [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
        ]),
      ).toBe(false)
    })
  })

  describe('text nodes inside containers', () => {
    test('text block inside container is not void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.cellBlock1, [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k14'},
        ]),
      ).toBe(false)
    })

    test('span inside container is not void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.cellSpan1, [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
          'cells',
          {_key: 'k17'},
          'content',
          {_key: 'k14'},
          'children',
          {_key: 'k12'},
        ]),
      ).toBe(false)
    })

    test('text block inside code block is not void', () => {
      expect(
        isLeafObject(testbed.snapshot, testbed.codeLine1, [
          {_key: 'k11'},
          'code',
          {_key: 'k8'},
        ]),
      ).toBe(false)
    })
  })

  describe('block objects inside containers', () => {
    const image = {_key: 'img1', _type: 'image'}
    const span = {_key: 's1', _type: 'span', text: ''}
    const textBlock = {_key: 'b1', _type: 'block', children: [span]}
    const cell = {
      _key: 'c1',
      _type: 'cell',
      content: [textBlock, image],
    }
    const row = {_key: 'r1', _type: 'row', cells: [cell]}
    const table = {_key: 't1', _type: 'table', rows: [row]}

    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image'},
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
                                of: [{type: 'block'}, {type: 'image'}],
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

    const containers = new Map<string, RegisteredContainer>([
      [
        'table',
        registeredContainerFor('table', {
          name: 'rows',
          type: 'array',
          of: [{type: 'row'}],
        }),
      ],
      [
        'row',
        registeredContainerFor('row', {
          name: 'cells',
          type: 'array',
          of: [{type: 'cell'}],
        }),
      ],
      [
        'cell',
        registeredContainerFor('cell', {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}],
        }),
      ],
    ])

    const context = {
      context: {schema, containers, value: [table]},
      blockIndexMap: buildBlockIndexMap(schema, containers, [table]),
    }

    test('image inside cell is void', () => {
      expect(
        isLeafObject(context, image, [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'img1'},
        ]),
      ).toBe(true)
    })

    test('text block inside cell is not void', () => {
      expect(
        isLeafObject(context, textBlock, [
          {_key: 't1'},
          'rows',
          {_key: 'r1'},
          'cells',
          {_key: 'c1'},
          'content',
          {_key: 'b1'},
        ]),
      ).toBe(false)
    })
  })

  describe('gallery with void-only children', () => {
    const image1 = {_key: 'img1', _type: 'image'}
    const image2 = {_key: 'img2', _type: 'image'}
    const gallery = {
      _key: 'g1',
      _type: 'gallery',
      images: [image1, image2],
    }

    const schema = compileSchema(
      defineSchema({
        blockObjects: [
          {name: 'image'},
          {
            name: 'gallery',
            fields: [
              {
                name: 'images',
                type: 'array',
                of: [{type: 'image'}],
              },
            ],
          },
        ],
      }),
    )

    const containers = new Map<string, RegisteredContainer>([
      [
        'gallery',
        registeredContainerFor('gallery', {
          name: 'images',
          type: 'array',
          of: [{type: 'image'}],
        }),
      ],
    ])

    const context = {
      context: {schema, containers, value: [gallery]},
      blockIndexMap: buildBlockIndexMap(schema, containers, [gallery]),
    }

    test('gallery is not void', () => {
      expect(isLeafObject(context, gallery, [{_key: 'g1'}])).toBe(false)
    })

    test('image inside gallery is void', () => {
      expect(
        isLeafObject(context, image1, [{_key: 'g1'}, 'images', {_key: 'img1'}]),
      ).toBe(true)
    })

    test('root image and gallery image are both void', () => {
      const rootImage = {_key: 'ri1', _type: 'image'}
      const contextWithRootImage = {
        ...context,
        value: [rootImage, gallery],
      }

      expect(
        isLeafObject(contextWithRootImage, rootImage, [{_key: 'ri1'}]),
      ).toBe(true)

      expect(
        isLeafObject(contextWithRootImage, image1, [
          {_key: 'g1'},
          'images',
          {_key: 'img1'},
        ]),
      ).toBe(true)
    })
  })

  describe('empty containers', () => {
    test('all object nodes are void when no containers are registered', () => {
      const emptyContext = {
        ...testbed.snapshot,
        context: {...testbed.snapshot.context, containers: new Map()},
      }

      expect(isLeafObject(emptyContext, testbed.image, [{_key: 'k4'}])).toBe(
        true,
      )

      expect(isLeafObject(emptyContext, testbed.table, [{_key: 'k26'}])).toBe(
        true,
      )

      expect(
        isLeafObject(emptyContext, testbed.codeBlock, [{_key: 'k11'}]),
      ).toBe(true)
    })

    test('text blocks are never void regardless of container registration', () => {
      const emptyContext = {
        ...testbed.snapshot,
        context: {...testbed.snapshot.context, containers: new Map()},
      }

      expect(
        isLeafObject(emptyContext, testbed.textBlock1, [{_key: 'k3'}]),
      ).toBe(false)
    })
  })
})
