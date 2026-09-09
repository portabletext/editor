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
})
