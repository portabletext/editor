import {
  defineSchema,
  type PortableTextObject,
  type PortableTextSpan,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import {describe, expectTypeOf, test} from 'vitest'
import {createRenderers, defineRenderer} from './define-renderer'

const schemaDefinition = defineSchema({
  blockObjects: [{name: 'code', fields: [{name: 'code', type: 'string'}]}],
  annotations: [{name: 'link', fields: [{name: 'href', type: 'string'}]}],
  inlineObjects: [{name: 'image', fields: [{name: 'src', type: 'string'}]}],
})

describe(createRenderers.name, () => {
  const {defineRenderer} = createRenderers(schemaDefinition)

  test('text block', () => {
    defineRenderer({
      type: 'block',
      name: 'block',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<PortableTextTextBlock>()

        return renderDefault()
      },
    })
  })

  test('code block', () => {
    defineRenderer({
      type: 'block',
      name: 'code',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<
          PortableTextObject & {_type: 'code'} & {code: string} & object
        >()

        return renderDefault()
      },
    })
  })

  test('span', () => {
    defineRenderer({
      type: 'inline',
      name: 'span',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<PortableTextSpan>()

        return renderDefault()
      },
    })
  })

  test('inline image', () => {
    defineRenderer({
      type: 'inline',
      name: 'image',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<
          PortableTextObject & {_type: 'image'} & {src: string} & object
        >()

        return renderDefault()
      },
    })
  })

  test('decorator', () => {
    defineRenderer({
      type: 'decorator',
      name: 'bold',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<string>()

        return renderDefault()
      },
    })
  })

  test('annotation', () => {
    defineRenderer({
      type: 'annotation',
      name: 'link',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<
          PortableTextObject & {_type: 'link'} & {href: string} & object
        >()

        return renderDefault()
      },
    })
  })
})

describe(defineRenderer.name, () => {
  test('text block', () => {
    defineRenderer({
      type: 'block',
      name: 'block',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<PortableTextTextBlock>()

        return renderDefault()
      },
    })
  })

  test('span', () => {
    defineRenderer({
      type: 'inline',
      name: 'span',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<PortableTextSpan>()

        return renderDefault()
      },
    })
  })

  test('decorator', () => {
    defineRenderer({
      type: 'decorator',
      name: 'bold',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<string>()

        return renderDefault()
      },
    })
  })

  test('annotation', () => {
    defineRenderer({
      type: 'annotation',
      name: 'link',
      render: ({node, renderDefault}) => {
        // Without schema, node is generic PortableTextObject
        expectTypeOf(node).toEqualTypeOf<PortableTextObject>()

        return renderDefault()
      },
    })
  })
})

describe('createRenderers without schema', () => {
  const {defineRenderer} = createRenderers()

  test('text block', () => {
    defineRenderer({
      type: 'block',
      name: 'block',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<PortableTextTextBlock>()

        return renderDefault()
      },
    })
  })

  test('span', () => {
    defineRenderer({
      type: 'inline',
      name: 'span',
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<PortableTextSpan>()

        return renderDefault()
      },
    })
  })

  test('inline object without schema inference', () => {
    defineRenderer({
      type: 'inline',
      name: 'image',
      render: ({node, renderDefault}) => {
        // Without schema, node is generic PortableTextObject
        expectTypeOf(node).toEqualTypeOf<PortableTextObject>()

        return renderDefault()
      },
    })
  })
})

describe('guard pattern', () => {
  const {defineRenderer} = createRenderers(schemaDefinition)

  test('guard with true return', () => {
    defineRenderer({
      type: 'block',
      name: 'block',
      guard: ({node, snapshot}) => {
        expectTypeOf(node).toEqualTypeOf<PortableTextTextBlock>()
        expectTypeOf(snapshot.context.value).toBeArray()
        return true
      },
      render: ({renderDefault}, guardResponse) => {
        expectTypeOf(guardResponse).toEqualTypeOf<true>()
        return renderDefault()
      },
    })
  })

  test('guard with object return', () => {
    defineRenderer({
      type: 'block',
      name: 'block',
      guard: ({node}) => {
        if (node.style === 'code') {
          return {language: 'typescript' as const}
        }
        return false
      },
      render: ({renderDefault}, guardResponse) => {
        expectTypeOf(guardResponse).toEqualTypeOf<{language: 'typescript'}>()
        return renderDefault()
      },
    })
  })

  test('guard node type matches renderer type', () => {
    // Block object guard should have block object node type
    defineRenderer({
      type: 'block',
      name: 'code',
      guard: ({node}) => {
        expectTypeOf(node).toEqualTypeOf<
          PortableTextObject & {_type: 'code'} & {code: string} & object
        >()
        return true
      },
      render: ({node, renderDefault}) => {
        expectTypeOf(node).toEqualTypeOf<
          PortableTextObject & {_type: 'code'} & {code: string} & object
        >()
        return renderDefault()
      },
    })
  })

  test('guard with decorator', () => {
    defineRenderer({
      type: 'decorator',
      name: 'bold',
      guard: ({node}) => {
        expectTypeOf(node).toEqualTypeOf<string>()
        return true
      },
      render: ({node, renderDefault}, guardResponse) => {
        expectTypeOf(node).toEqualTypeOf<string>()
        expectTypeOf(guardResponse).toEqualTypeOf<true>()
        return renderDefault()
      },
    })
  })

  test('no guard defaults to true', () => {
    defineRenderer({
      type: 'block',
      name: 'block',
      render: ({renderDefault}, guardResponse) => {
        // When no guard is provided, guardResponse defaults to true
        expectTypeOf(guardResponse).toEqualTypeOf<true>()
        return renderDefault()
      },
    })
  })
})
