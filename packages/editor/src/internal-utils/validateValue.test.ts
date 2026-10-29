import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {createTestKeyGenerator} from '@portabletext/test'
import {describe, expect, test} from 'vitest'
import {validateValue} from './validateValue'

const schema = compileSchema(
  defineSchema({
    annotations: [{name: 'link'}],
    blockObjects: [{name: 'image'}],
    inlineObjects: [{name: 'stock-ticker'}],
  }),
)

describe(validateValue.name, () => {
  test('A keyless block anchors its resolution patch on its index, not a `{_key: undefined}` segment that would match the first keyless block', () => {
    const schema = compileSchema(defineSchema({}))
    const firstKeylessBlock = {
      _type: 'block',
      children: [{_type: 'span', text: 'foo', marks: []}],
    } as unknown as PortableTextBlock
    const secondKeylessBlock = {
      _type: 'not-a-real-type',
      children: [{_type: 'span', text: 'bar', marks: []}],
    } as unknown as PortableTextBlock

    const validation = validateValue(
      [firstKeylessBlock, secondKeylessBlock],
      schema,
    )

    expect(validation).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: [1]}],
        description: "Block at index '1' has invalid _type 'not-a-real-type'",
        action: 'Remove the block',
        item: secondKeylessBlock,
        i18n: {
          description:
            'inputs.portable-text.invalid-value.disallowed-type.description',
          action: 'inputs.portable-text.invalid-value.disallowed-type.action',
          values: {key: undefined, typeName: 'not-a-real-type'},
        },
      },
      value: [firstKeylessBlock, secondKeylessBlock],
    })
  })

  test('A keyless child with an unknown `_type` anchors its description and i18n params on its index, not `undefined`', () => {
    const schema = compileSchema(defineSchema({}))
    const block = {
      _type: 'block',
      _key: 'b1',
      children: [
        {_type: 'span', _key: 's1', text: 'foo', marks: []},
        {_type: 'not-a-real-type'},
      ],
    } as unknown as PortableTextBlock

    const validation = validateValue([block], schema)

    expect(validation).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: [{_key: 'b1'}, 'children', 1]}],
        description:
          "Child at index '1' in block with _key 'b1' has invalid '_type' property (not-a-real-type).",
        action: 'Remove the object',
        item: block,
        i18n: {
          description:
            'inputs.portable-text.invalid-value.disallowed-child-type.description',
          action:
            'inputs.portable-text.invalid-value.disallowed-child-type.action',
          values: {key: 'b1', childKey: 1, childType: 'not-a-real-type'},
        },
      },
      value: [block],
    })
  })

  test('an undefined value is valid', () => {
    expect(validateValue(undefined, schema)).toEqual({
      valid: true,
      resolution: null,
      value: undefined,
    })
  })

  test('a value that is not an array is unset', () => {
    const value = {foo: 'bar'} as unknown as Array<PortableTextBlock>

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: []}],
        description:
          'Editor value must be an array of Portable Text blocks, or undefined.',
        action: 'Unset the value',
        item: {foo: 'bar'},
        i18n: {
          description:
            'inputs.portable-text.invalid-value.not-an-array.description',
          action: 'inputs.portable-text.invalid-value.not-an-array.action',
        },
      },
      value: {foo: 'bar'},
    })
  })

  test('an empty array is unset', () => {
    expect(validateValue([], schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: []}],
        description:
          'Editor value must be an array of Portable Text blocks, or undefined.',
        action: 'Unset the value',
        item: [],
        i18n: {
          description:
            'inputs.portable-text.invalid-value.not-an-array.description',
          action: 'inputs.portable-text.invalid-value.not-an-array.action',
        },
      },
      value: [],
    })
  })

  test('a block that is not an object is unset by index', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const value = [
      textBlock(blockKey, spanKey, 'foo'),
      null,
    ] as unknown as Array<PortableTextBlock>

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: [1]}],
        description: 'Block must be an object, got null',
        action: 'Unset invalid item',
        item: null,
        i18n: {
          description:
            'inputs.portable-text.invalid-value.not-an-object.description',
          action: 'inputs.portable-text.invalid-value.not-an-object.action',
          values: {index: 1},
        },
      },
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
        },
        null,
      ],
    })
  })

  test("a block typed 'block' is retyped to the schema's text block name", () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const value = [textBlock(blockKey, spanKey, 'foo')]

    expect(
      validateValue(
        value,
        compileSchema(defineSchema({block: {name: 'text'}})),
      ),
    ).toEqual({
      valid: false,
      resolution: {
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}],
            value: {
              _type: 'text',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
              markDefs: [],
            },
          },
        ],
        description:
          "Block with _key 'k0' has invalid type name 'block'. According to the schema, the block type name is 'text'",
        action: "Use type 'text'",
        item: {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
        },
        i18n: {
          description:
            'inputs.portable-text.invalid-value.incorrect-block-type.description',
          action:
            'inputs.portable-text.invalid-value.incorrect-block-type.action',
          values: {key: 'k0', expectedTypeName: 'text'},
        },
      },
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo', marks: []}],
          markDefs: [],
        },
      ],
    })
  })

  test('a block with no _type but with children gets the text block type', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const value = [
      {
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo'}],
      },
    ] as unknown as Array<PortableTextBlock>

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}],
            value: {
              _type: 'block',
              _key: 'k0',
              children: [{_type: 'span', _key: 'k1', text: 'foo'}],
            },
          },
        ],
        description:
          "Block with _key 'k0' is missing a type name. According to the schema, the block type name is 'block'",
        action: "Use type 'block'",
        item: {
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo'}],
        },
        i18n: {
          description:
            'inputs.portable-text.invalid-value.missing-block-type.description',
          action:
            'inputs.portable-text.invalid-value.missing-block-type.action',
          values: {key: 'k0', expectedTypeName: 'block'},
        },
      },
      value: [
        {
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo'}],
        },
      ],
    })
  })

  test('a block with no _type and no children is removed', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const value = [
      {_key: blockKey, src: 'foo'},
    ] as unknown as Array<PortableTextBlock>

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: [{_key: 'k0'}]}],
        description: "Block with _key 'k0' is missing an _type property",
        action: 'Remove the block',
        item: {_key: 'k0', src: 'foo'},
        i18n: {
          description:
            'inputs.portable-text.invalid-value.missing-type.description',
          action: 'inputs.portable-text.invalid-value.missing-type.action',
          values: {key: 'k0'},
        },
      },
      value: [{_key: 'k0', src: 'foo'}],
    })
  })

  test('a block with a _type the schema does not know is removed', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const value = [{_type: 'video', _key: blockKey}]

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: [{_key: 'k0'}]}],
        description: "Block with _key 'k0' has invalid _type 'video'",
        action: 'Remove the block',
        item: {_type: 'video', _key: 'k0'},
        i18n: {
          description:
            'inputs.portable-text.invalid-value.disallowed-type.description',
          action: 'inputs.portable-text.invalid-value.disallowed-type.action',
          values: {key: 'k0', typeName: 'video'},
        },
      },
      value: [{_type: 'video', _key: 'k0'}],
    })
  })

  test('a text block whose children is not an array is set to an object with empty children at the block path', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const value = [
      {_type: 'block', _key: blockKey, children: 'foo'},
    ] as unknown as Array<PortableTextBlock>

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'set', path: [{_key: 'k0'}], value: {children: []}}],
        description:
          "Text block with _key 'k0' has a invalid required property 'children'.",
        action: 'Reset the children property',
        item: {_type: 'block', _key: 'k0', children: 'foo'},
        i18n: {
          description:
            'inputs.portable-text.invalid-value.missing-or-invalid-children.description',
          action:
            'inputs.portable-text.invalid-value.missing-or-invalid-children.action',
          values: {key: 'k0'},
        },
      },
      value: [{_type: 'block', _key: 'k0', children: 'foo'}],
    })
  })

  test('a child that is not an object is removed by index', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 'foo'}, 'bar'],
      },
    ] as unknown as Array<PortableTextBlock>

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: [{_key: 'k0'}, 'children', 1]}],
        description:
          "Child at index '1' in block with _key 'k0' is not an object.",
        action: 'Remove the item',
        item: {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo'}, 'bar'],
        },
        i18n: {
          description:
            'inputs.portable-text.invalid-value.non-object-child.description',
          action: 'inputs.portable-text.invalid-value.non-object-child.action',
          values: {key: 'k0', index: 1},
        },
      },
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 'foo'}, 'bar'],
        },
      ],
    })
  })

  test('a child with no _type is removed', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const childKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_key: childKey, text: 'foo'}],
      },
    ] as unknown as Array<PortableTextBlock>

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', {_key: 'k1'}]},
        ],
        description:
          "Child with _key 'k1' in block with _key 'k0' is missing '_type' property.",
        action: 'Remove the object',
        item: {
          _type: 'block',
          _key: 'k0',
          children: [{_key: 'k1', text: 'foo'}],
        },
        i18n: {
          description:
            'inputs.portable-text.invalid-value.missing-child-type.description',
          action:
            'inputs.portable-text.invalid-value.missing-child-type.action',
          values: {key: 'k0', childKey: 'k1'},
        },
      },
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_key: 'k1', text: 'foo'}],
        },
      ],
    })
  })

  test('a child with a _type the schema does not know is removed', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const childKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'emoji', _key: childKey}],
      },
    ]

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [
          {type: 'unset', path: [{_key: 'k0'}, 'children', {_key: 'k1'}]},
        ],
        description:
          "Child with _key 'k1' in block with _key 'k0' has invalid '_type' property (emoji).",
        action: 'Remove the object',
        item: {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'emoji', _key: 'k1'}],
        },
        i18n: {
          description:
            'inputs.portable-text.invalid-value.disallowed-child-type.description',
          action:
            'inputs.portable-text.invalid-value.disallowed-child-type.action',
          values: {key: 'k0', childKey: 'k1', childType: 'emoji'},
        },
      },
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'emoji', _key: 'k1'}],
        },
      ],
    })
  })

  test('a span whose text is not a string gets empty text', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'span', _key: spanKey, text: 42, marks: []}],
      },
    ] as unknown as Array<PortableTextBlock>

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [
          {
            type: 'set',
            path: [{_key: 'k0'}, 'children', {_key: 'k1'}],
            value: {_type: 'span', _key: 'k1', text: '', marks: []},
          },
        ],
        description:
          "Child with _key 'k1' in block with _key 'k0' has missing or invalid text property!",
        action: 'Write an empty text property to the object',
        item: {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 42, marks: []}],
        },
        i18n: {
          description:
            'inputs.portable-text.invalid-value.invalid-span-text.description',
          action: 'inputs.portable-text.invalid-value.invalid-span-text.action',
          values: {key: 'k0', childKey: 'k1'},
        },
      },
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'span', _key: 'k1', text: 42, marks: []}],
        },
      ],
    })
  })

  test('text blocks, block objects and inline objects the schema knows are valid', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const spanKey = keyGenerator()
    const linkKey = keyGenerator()
    const stockTickerKey = keyGenerator()
    const imageKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: blockKey,
        children: [
          {_type: 'span', _key: spanKey, text: 'foo', marks: [linkKey]},
          {_type: 'stock-ticker', _key: stockTickerKey},
        ],
        markDefs: [{_type: 'link', _key: linkKey}],
      },
      {_type: 'image', _key: imageKey},
    ]

    expect(validateValue(value, schema)).toEqual({
      valid: true,
      resolution: null,
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [
            {_type: 'span', _key: 'k1', text: 'foo', marks: ['k2']},
            {_type: 'stock-ticker', _key: 'k3'},
          ],
          markDefs: [{_type: 'link', _key: 'k2'}],
        },
        {_type: 'image', _key: 'k4'},
      ],
    })
  })

  test('validation stops at the first invalid block', () => {
    const keyGenerator = createTestKeyGenerator()
    const videoKey = keyGenerator()
    const audioKey = keyGenerator()
    const value = [
      {_type: 'video', _key: videoKey},
      {_type: 'audio', _key: audioKey},
    ]

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: [{_key: 'k0'}]}],
        description: "Block with _key 'k0' has invalid _type 'video'",
        action: 'Remove the block',
        item: {_type: 'video', _key: 'k0'},
        i18n: {
          description:
            'inputs.portable-text.invalid-value.disallowed-type.description',
          action: 'inputs.portable-text.invalid-value.disallowed-type.action',
          values: {key: 'k0', typeName: 'video'},
        },
      },
      value: [
        {_type: 'video', _key: 'k0'},
        {_type: 'audio', _key: 'k1'},
      ],
    })
  })

  test('an invalid child does not stop validation, so a later invalid block replaces its resolution', () => {
    const keyGenerator = createTestKeyGenerator()
    const blockKey = keyGenerator()
    const childKey = keyGenerator()
    const videoKey = keyGenerator()
    const value = [
      {
        _type: 'block',
        _key: blockKey,
        children: [{_type: 'emoji', _key: childKey}],
      },
      {_type: 'video', _key: videoKey},
    ]

    expect(validateValue(value, schema)).toEqual({
      valid: false,
      resolution: {
        patches: [{type: 'unset', path: [{_key: 'k2'}]}],
        description: "Block with _key 'k2' has invalid _type 'video'",
        action: 'Remove the block',
        item: {_type: 'video', _key: 'k2'},
        i18n: {
          description:
            'inputs.portable-text.invalid-value.disallowed-type.description',
          action: 'inputs.portable-text.invalid-value.disallowed-type.action',
          values: {key: 'k2', typeName: 'video'},
        },
      },
      value: [
        {
          _type: 'block',
          _key: 'k0',
          children: [{_type: 'emoji', _key: 'k1'}],
        },
        {_type: 'video', _key: 'k2'},
      ],
    })
  })
})

function textBlock(
  blockKey: string,
  spanKey: string,
  text: string,
): PortableTextBlock {
  return {
    _type: 'block',
    _key: blockKey,
    children: [{_type: 'span', _key: spanKey, text, marks: []}],
    markDefs: [],
  }
}
