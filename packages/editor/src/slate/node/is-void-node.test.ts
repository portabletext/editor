import {compileSchema, defineSchema} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {createNodeTraversalTestbed} from '../../node-traversal/node-traversal-testbed'
import type {ChildArrayField} from '../../schema/resolve-containers'
import {isVoidNode} from './is-void-node'

describe(isVoidNode.name, () => {
  const testbed = createNodeTraversalTestbed()

  describe('root-level nodes', () => {
    test('text block is not void', () => {
      expect(
        isVoidNode(testbed.context, testbed.textBlock1, [{_key: 'k3'}]),
      ).toBe(false)
    })

    test('block object without container registration is void', () => {
      expect(isVoidNode(testbed.context, testbed.image, [{_key: 'k4'}])).toBe(
        true,
      )
    })

    test('block object with container registration is not void', () => {
      expect(isVoidNode(testbed.context, testbed.table, [{_key: 'k26'}])).toBe(
        false,
      )
    })

    test('code block with container registration is not void', () => {
      expect(
        isVoidNode(testbed.context, testbed.codeBlock, [{_key: 'k11'}]),
      ).toBe(false)
    })
  })

  describe('inline objects', () => {
    test('inline object at root level is void', () => {
      expect(
        isVoidNode(testbed.context, testbed.stockTicker1, [
          {_key: 'k3'},
          'children',
          {_key: 'k1'},
        ]),
      ).toBe(true)
    })

    test('inline object inside container is void', () => {
      expect(
        isVoidNode(testbed.context, testbed.stockTicker2, [
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
        isVoidNode(testbed.context, testbed.row1, [
          {_key: 'k26'},
          'rows',
          {_key: 'k21'},
        ]),
      ).toBe(false)
    })

    test('cell inside table row is not void', () => {
      expect(
        isVoidNode(testbed.context, testbed.cell1, [
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
        isVoidNode(testbed.context, testbed.cellBlock1, [
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
        isVoidNode(testbed.context, testbed.cellSpan1, [
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
        isVoidNode(testbed.context, testbed.codeLine1, [
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
                    type: 'row',
                    fields: [
                      {
                        name: 'cells',
                        type: 'array',
                        of: [
                          {
                            type: 'cell',
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

    const containers = new Map<string, ChildArrayField>([
      [
        'table',
        {
          name: 'rows',
          type: 'array',
          of: [{type: 'row'}],
        },
      ],
      [
        'table.row',
        {
          name: 'cells',
          type: 'array',
          of: [{type: 'cell'}],
        },
      ],
      [
        'table.row.cell',
        {
          name: 'content',
          type: 'array',
          of: [{type: 'block'}, {type: 'image'}],
        },
      ],
    ])

    const context = {schema, containers, value: [table]}

    test('image inside cell is void', () => {
      expect(
        isVoidNode(context, image, [
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
        isVoidNode(context, textBlock, [
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

    const containers = new Map<string, ChildArrayField>([
      [
        'gallery',
        {
          name: 'images',
          type: 'array',
          of: [{type: 'image'}],
        },
      ],
    ])

    const context = {schema, containers, value: [gallery]}

    test('gallery is not void', () => {
      expect(isVoidNode(context, gallery, [{_key: 'g1'}])).toBe(false)
    })

    test('image inside gallery is void', () => {
      expect(
        isVoidNode(context, image1, [{_key: 'g1'}, 'images', {_key: 'img1'}]),
      ).toBe(true)
    })

    test('root image and gallery image are both void', () => {
      const rootImage = {_key: 'ri1', _type: 'image'}
      const contextWithRootImage = {
        ...context,
        value: [rootImage, gallery],
      }

      expect(isVoidNode(contextWithRootImage, rootImage, [{_key: 'ri1'}])).toBe(
        true,
      )

      expect(
        isVoidNode(contextWithRootImage, image1, [
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
        ...testbed.context,
        containers: new Map(),
      }

      expect(isVoidNode(emptyContext, testbed.image, [{_key: 'k4'}])).toBe(true)

      expect(isVoidNode(emptyContext, testbed.table, [{_key: 'k26'}])).toBe(
        true,
      )

      expect(isVoidNode(emptyContext, testbed.codeBlock, [{_key: 'k11'}])).toBe(
        true,
      )
    })

    test('text blocks are never void regardless of container registration', () => {
      const emptyContext = {
        ...testbed.context,
        containers: new Map(),
      }

      expect(isVoidNode(emptyContext, testbed.textBlock1, [{_key: 'k3'}])).toBe(
        false,
      )
    })
  })
})
