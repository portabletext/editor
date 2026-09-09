import {set, unset} from '@portabletext/patches'
import {
  isTextBlock,
  type PortableTextBlock,
  type PortableTextTextBlock,
} from '@portabletext/schema'
import type {EditorSchema} from '../editor/editor-schema'
import {hasUsableKey, nodeSegment} from '../paths/node-segment'
import {getRootAcceptedTypes} from '../schema/get-root-accepted-types'
import type {InvalidValueResolution} from '../types/editor'

interface Validation {
  valid: boolean
  resolution: InvalidValueResolution | null
  value: PortableTextBlock[] | undefined
}

/**
 * A keyless block has no identifier that survives across the single-block
 * slices the sync machine validates one at a time, so patches anchor on it
 * by its position within `value` instead.
 */
function describeBlockLocation(blk: PortableTextBlock, index: number): string {
  return hasUsableKey(blk._key)
    ? `with _key '${blk._key}'`
    : `at index '${index}'`
}

function describeEnclosingBlockLocation(
  blk: PortableTextBlock,
  index: number,
): string {
  return hasUsableKey(blk._key)
    ? `with _key '${blk._key}'`
    : `at index '${index}'`
}

export function validateValue(
  value: PortableTextBlock[] | undefined,
  types: EditorSchema,
  baseIndex = 0,
): Validation {
  let resolution: InvalidValueResolution | null = null
  let valid = true
  const validChildTypes = [
    types.span.name,
    ...types.inlineObjects.map((t) => t.name),
  ]
  const validBlockTypes = getRootAcceptedTypes(types)

  // Undefined is allowed
  if (value === undefined) {
    return {valid: true, resolution: null, value}
  }
  // Only lengthy arrays are allowed in the editor.
  if (!Array.isArray(value) || value.length === 0) {
    return {
      valid: false,
      resolution: {
        patches: [unset([])],
        description:
          'Editor value must be an array of Portable Text blocks, or undefined.',
        action: 'Unset the value',
        item: value,

        i18n: {
          description:
            'inputs.portable-text.invalid-value.not-an-array.description',
          action: 'inputs.portable-text.invalid-value.not-an-array.action',
        },
      },
      value,
    }
  }
  if (
    value.some((blk: PortableTextBlock, localIndex: number): boolean => {
      // `localIndex` is the position within the (possibly sliced) `value`;
      // `baseIndex` recovers the block's real position in the document.
      const index = baseIndex + localIndex
      // Is the block an object?
      if (typeof blk !== 'object' || blk === null) {
        resolution = {
          patches: [unset([index])],
          description: `Block must be an object, got ${String(blk)}`,
          action: `Unset invalid item`,
          item: blk,

          i18n: {
            description:
              'inputs.portable-text.invalid-value.not-an-object.description',
            action: 'inputs.portable-text.invalid-value.not-an-object.action',
            values: {index},
          },
        }
        return true
      }
      // Test that every block has valid _type
      if (!blk._type || !validBlockTypes.has(blk._type)) {
        // Special case where block type is set to default 'block', but the block type is named something else according to the schema.
        if (blk._type === 'block') {
          const currentBlockTypeName = types.block.name
          resolution = {
            patches: [
              set({...blk, _type: currentBlockTypeName}, [
                nodeSegment(blk, index),
              ]),
            ],
            description: `Block ${describeBlockLocation(blk, index)} has invalid type name '${blk._type}'. According to the schema, the block type name is '${currentBlockTypeName}'`,
            action: `Use type '${currentBlockTypeName}'`,
            item: blk,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.incorrect-block-type.description',
              action:
                'inputs.portable-text.invalid-value.incorrect-block-type.action',
              values: {key: blk._key, expectedTypeName: currentBlockTypeName},
            },
          }
          return true
        }

        // If the block has no `_type`, but aside from that is a valid Portable Text block
        if (
          !blk._type &&
          isTextBlock({schema: types}, {...blk, _type: types.block.name})
        ) {
          resolution = {
            patches: [
              set({...blk, _type: types.block.name}, [nodeSegment(blk, index)]),
            ],
            description: `Block ${describeBlockLocation(blk, index)} is missing a type name. According to the schema, the block type name is '${types.block.name}'`,
            action: `Use type '${types.block.name}'`,
            item: blk,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.missing-block-type.description',
              action:
                'inputs.portable-text.invalid-value.missing-block-type.action',
              values: {key: blk._key, expectedTypeName: types.block.name},
            },
          }
          return true
        }

        if (!blk._type) {
          resolution = {
            patches: [unset([nodeSegment(blk, index)])],
            description: `Block ${describeBlockLocation(blk, index)} is missing an _type property`,
            action: 'Remove the block',
            item: blk,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.missing-type.description',
              action: 'inputs.portable-text.invalid-value.missing-type.action',
              values: {key: blk._key},
            },
          }
          return true
        }

        resolution = {
          patches: [unset([nodeSegment(blk, index)])],
          description: `Block ${describeBlockLocation(blk, index)} has invalid _type '${blk._type}'`,
          action: 'Remove the block',
          item: blk,

          i18n: {
            description:
              'inputs.portable-text.invalid-value.disallowed-type.description',
            action: 'inputs.portable-text.invalid-value.disallowed-type.action',
            values: {key: blk._key, typeName: blk._type},
          },
        }
        return true
      }

      // Test regular text blocks
      if (blk._type === types.block.name) {
        const textBlock = blk as PortableTextTextBlock
        // Test that it has a valid children property (array)
        if (textBlock.children && !Array.isArray(textBlock.children)) {
          resolution = {
            patches: [set({children: []}, [nodeSegment(textBlock, index)])],
            description: `Text block ${describeBlockLocation(textBlock, index)} has a invalid required property 'children'.`,
            action: 'Reset the children property',
            item: textBlock,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.missing-or-invalid-children.description',
              action:
                'inputs.portable-text.invalid-value.missing-or-invalid-children.action',
              values: {key: textBlock._key},
            },
          }
          return true
        }
        // A missing or empty `children` array is mechanically fixable
        // (the engine inserts an empty span); only run child-level checks
        // when there's something to check.
        if (Array.isArray(textBlock.children)) {
          // Test every child
          if (
            textBlock.children.some((child, cIndex: number) => {
              if (typeof child !== 'object' || child === null) {
                resolution = {
                  patches: [
                    unset([nodeSegment(blk, index), 'children', cIndex]),
                  ],
                  description: `Child at index '${cIndex}' in block ${describeEnclosingBlockLocation(blk, index)} is not an object.`,
                  action: 'Remove the item',
                  item: blk,

                  i18n: {
                    description:
                      'inputs.portable-text.invalid-value.non-object-child.description',
                    action:
                      'inputs.portable-text.invalid-value.non-object-child.action',
                    values: {key: blk._key, index: cIndex},
                  },
                }
                return true
              }

              // A missing child `_key` is mechanically fixable; fall back to
              // the child's index so a later check on the same child doesn't
              // build a `{_key: undefined}` path segment.
              const childRef = nodeSegment(child, cIndex)

              // Verify that children have valid types
              if (!child._type) {
                resolution = {
                  patches: [
                    unset([nodeSegment(blk, index), 'children', childRef]),
                  ],
                  description: `Child with _key '${child._key}' in block ${describeEnclosingBlockLocation(blk, index)} is missing '_type' property.`,
                  action: 'Remove the object',
                  item: blk,

                  i18n: {
                    description:
                      'inputs.portable-text.invalid-value.missing-child-type.description',
                    action:
                      'inputs.portable-text.invalid-value.missing-child-type.action',
                    values: {key: blk._key, childKey: child._key},
                  },
                }
                return true
              }

              if (!validChildTypes.includes(child._type)) {
                resolution = {
                  patches: [
                    unset([nodeSegment(blk, index), 'children', childRef]),
                  ],
                  description: `Child with _key '${child._key}' in block ${describeEnclosingBlockLocation(blk, index)} has invalid '_type' property (${child._type}).`,
                  action: 'Remove the object',
                  item: blk,

                  i18n: {
                    description:
                      'inputs.portable-text.invalid-value.disallowed-child-type.description',
                    action:
                      'inputs.portable-text.invalid-value.disallowed-child-type.action',
                    values: {
                      key: blk._key,
                      childKey: child._key,
                      childType: child._type,
                    },
                  },
                }
                return true
              }

              // Verify that spans have .text property that is a string
              if (
                child._type === types.span.name &&
                typeof child.text !== 'string'
              ) {
                resolution = {
                  patches: [
                    set({...child, text: ''}, [
                      nodeSegment(blk, index),
                      'children',
                      childRef,
                    ]),
                  ],
                  description: `Child with _key '${child._key}' in block ${describeEnclosingBlockLocation(blk, index)} has missing or invalid text property!`,
                  action: `Write an empty text property to the object`,
                  item: blk,

                  i18n: {
                    description:
                      'inputs.portable-text.invalid-value.invalid-span-text.description',
                    action:
                      'inputs.portable-text.invalid-value.invalid-span-text.action',
                    values: {key: blk._key, childKey: child._key},
                  },
                }
                return true
              }
              return false
            })
          ) {
            valid = false
          }
        }
      }
      return false
    })
  ) {
    valid = false
  }
  return {valid, resolution, value}
}
