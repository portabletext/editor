import {
  compileSchema,
  defineSchema,
  type PortableTextBlock,
} from '@portabletext/schema'
import {describe, expect, test} from 'vitest'
import {validateValue} from './validateValue'

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
})
