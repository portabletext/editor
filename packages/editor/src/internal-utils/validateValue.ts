import {insert, set, setIfMissing, unset} from '@portabletext/patches'
import {isTextBlock} from '@portabletext/schema'
import type {PortableTextSpan, PortableTextTextBlock} from '@sanity/types'
import {flatten, isPlainObject, uniq} from 'lodash'
import type {EditorContext} from '../editor/editor-snapshot'
import type {InvalidValueResolution} from '../types/editor'
import {isRecord, isTypedObject} from './asserters'

export interface Validation {
  valid: boolean
  resolution: InvalidValueResolution | null
}

export function validateBlock(
  context: Pick<EditorContext, 'schema' | 'keyGenerator'>,
  block: unknown,
  currentBlockIndex: number,
): Validation {
  let resolution: InvalidValueResolution | null = null
  let valid = true
  const validChildTypes = [
    context.schema.span.name,
    ...context.schema.inlineObjects.map((t) => t.name),
  ]
  const validBlockTypes = [
    context.schema.block.name,
    ...context.schema.blockObjects.map((t) => t.name),
  ]

  if (!isRecord(block)) {
    resolution = {
      patches: [unset([currentBlockIndex])],
      description: `Block must be an object, got ${String(block)}`,
      action: `Unset invalid item`,
      item: block,

      i18n: {
        description:
          'inputs.portable-text.invalid-value.not-an-object.description',
        action: 'inputs.portable-text.invalid-value.not-an-object.action',
        values: {index: currentBlockIndex},
      },
    }

    return {valid: false, resolution}
  }

  // Test that the block has a _key prop
  if (!block._key || typeof block._key !== 'string') {
    resolution = {
      patches: [
        set({...block, _key: context.keyGenerator()}, [currentBlockIndex]),
      ],
      description: `Block at index ${currentBlockIndex} is missing required _key.`,
      action: 'Set the block with a random _key value',
      item: block,

      i18n: {
        description:
          'inputs.portable-text.invalid-value.missing-key.description',
        action: 'inputs.portable-text.invalid-value.missing-key.action',
        values: {index: currentBlockIndex},
      },
    }

    return {valid: false, resolution}
  }

  // Test that the block has valid _type
  if (!isTypedObject(block) || !validBlockTypes.includes(block._type)) {
    // Special case where block type is set to default 'block', but the block type is named something else according to the schema.
    if (block._type === 'block') {
      const currentBlockTypeName = context.schema.block.name
      resolution = {
        patches: [
          set({...block, _type: currentBlockTypeName}, [{_key: block._key}]),
        ],
        description: `Block with _key '${block._key}' has invalid type name '${block._type}'. According to the schema, the block type name is '${currentBlockTypeName}'`,
        action: `Use type '${currentBlockTypeName}'`,
        item: block,

        i18n: {
          description:
            'inputs.portable-text.invalid-value.incorrect-block-type.description',
          action:
            'inputs.portable-text.invalid-value.incorrect-block-type.action',
          values: {key: block._key, expectedTypeName: currentBlockTypeName},
        },
      }

      return {valid: false, resolution}
    }

    block

    // If the block has no `_type`, but aside from that is a valid Portable Text block
    if (
      !block._type &&
      isTextBlock(context, {...block, _type: context.schema.block.name})
    ) {
      resolution = {
        patches: [
          set({...block, _type: context.schema.block.name}, [
            {_key: block._key},
          ]),
        ],
        description: `Block with _key '${block._key}' is missing a type name. According to the schema, the block type name is '${context.schema.block.name}'`,
        action: `Use type '${context.schema.block.name}'`,
        item: block,

        i18n: {
          description:
            'inputs.portable-text.invalid-value.missing-block-type.description',
          action:
            'inputs.portable-text.invalid-value.missing-block-type.action',
          values: {
            key: block._key,
            expectedTypeName: context.schema.block.name,
          },
        },
      }

      return {valid: false, resolution}
    }

    if (!block._type) {
      resolution = {
        patches: [unset([{_key: block._key}])],
        description: `Block with _key '${block._key}' is missing an _type property`,
        action: 'Remove the block',
        item: block,

        i18n: {
          description:
            'inputs.portable-text.invalid-value.missing-type.description',
          action: 'inputs.portable-text.invalid-value.missing-type.action',
          values: {key: block._key},
        },
      }

      return {valid: false, resolution}
    }

    resolution = {
      patches: [unset([{_key: block._key}])],
      description: `Block with _key '${block._key}' has invalid _type '${block._type}'`,
      action: 'Remove the block',
      item: block,

      i18n: {
        description:
          'inputs.portable-text.invalid-value.disallowed-type.description',
        action: 'inputs.portable-text.invalid-value.disallowed-type.action',
        values: {key: block._key, typeName: block._type as string},
      },
    }

    return {valid: false, resolution}
  }

  // Test regular text blocks
  if (block._type === context.schema.block.name) {
    const textBlock = block as unknown as PortableTextTextBlock
    // Test that it has a valid children property (array)
    if (textBlock.children && !Array.isArray(textBlock.children)) {
      resolution = {
        patches: [set({children: []}, [{_key: textBlock._key}])],
        description: `Text block with _key '${textBlock._key}' has a invalid required property 'children'.`,
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

      return {valid: false, resolution}
    }

    // Test that children is set and lengthy
    if (
      textBlock.children === undefined ||
      (Array.isArray(textBlock.children) && textBlock.children.length === 0)
    ) {
      const newSpan = {
        _type: context.schema.span.name,
        _key: context.keyGenerator(),
        text: '',
        marks: [],
      }
      resolution = {
        autoResolve: true,
        patches: [
          setIfMissing([], [{_key: block._key}, 'children']),
          insert([newSpan], 'after', [{_key: block._key}, 'children', 0]),
        ],
        description: `Children for text block with _key '${block._key}' is empty.`,
        action: 'Insert an empty text',
        item: block,

        i18n: {
          description:
            'inputs.portable-text.invalid-value.empty-children.description',
          action: 'inputs.portable-text.invalid-value.empty-children.action',
          values: {key: block._key},
        },
      }

      return {valid: false, resolution}
    }

    const allUsedMarks = uniq(
      flatten(
        textBlock.children
          .filter((cld) => cld._type === context.schema.span.name)
          .map((cld) => cld.marks || []),
      ) as string[],
    )

    // Test that all markDefs are in use (remove orphaned markDefs)
    if (Array.isArray(block.markDefs) && block.markDefs.length > 0) {
      const unusedMarkDefs: string[] = uniq(
        block.markDefs
          .map((def) => def._key)
          .filter((key) => !allUsedMarks.includes(key)),
      )
      if (unusedMarkDefs.length > 0) {
        resolution = {
          autoResolve: true,
          patches: unusedMarkDefs.map((markDefKey) =>
            unset([
              {_key: block._key as string},
              'markDefs',
              {_key: markDefKey},
            ]),
          ),
          description: `Block contains orphaned data (unused mark definitions): ${unusedMarkDefs.join(
            ', ',
          )}.`,
          action: 'Remove unused mark definition item',
          item: block,
          i18n: {
            description:
              'inputs.portable-text.invalid-value.orphaned-mark-defs.description',
            action:
              'inputs.portable-text.invalid-value.orphaned-mark-defs.action',
            values: {
              key: block._key,
              unusedMarkDefs: unusedMarkDefs.map((m) => m.toString()),
            },
          },
        }

        return {valid: false, resolution}
      }
    }

    // Test that every annotation mark used has a definition
    const annotationMarks = allUsedMarks.filter(
      (mark) =>
        !context.schema.decorators.map((dec) => dec.name).includes(mark),
    )
    const orphanedMarks = annotationMarks.filter(
      (mark) =>
        textBlock.markDefs === undefined ||
        !textBlock.markDefs.find((def) => def._key === mark),
    )
    if (orphanedMarks.length > 0) {
      const spanChildren = textBlock.children.filter(
        (cld) =>
          cld._type === context.schema.span.name &&
          Array.isArray(cld.marks) &&
          cld.marks.some((mark) => orphanedMarks.includes(mark)),
      ) as PortableTextSpan[]
      if (spanChildren) {
        const orphaned = orphanedMarks.join(', ')
        resolution = {
          autoResolve: true,
          patches: spanChildren.map((child) => {
            return set(
              (child.marks || []).filter(
                (cMrk) => !orphanedMarks.includes(cMrk),
              ),
              [
                {_key: block._key as string},
                'children',
                {_key: child._key},
                'marks',
              ],
            )
          }),
          description: `Block with _key '${block._key}' contains marks (${orphaned}) not supported by the current content model.`,
          action: 'Remove invalid marks',
          item: block,

          i18n: {
            description:
              'inputs.portable-text.invalid-value.orphaned-marks.description',
            action: 'inputs.portable-text.invalid-value.orphaned-marks.action',
            values: {
              key: block._key,
              orphanedMarks: orphanedMarks.map((m) => m.toString()),
            },
          },
        }

        return {valid: false, resolution}
      }
    }

    // Test every child
    if (
      textBlock.children.some((child, cIndex: number) => {
        if (!isPlainObject(child)) {
          resolution = {
            patches: [
              unset([{_key: block._key as string}, 'children', cIndex]),
            ],
            description: `Child at index '${cIndex}' in block with key '${block._key}' is not an object.`,
            action: 'Remove the item',
            item: block,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.non-object-child.description',
              action:
                'inputs.portable-text.invalid-value.non-object-child.action',
              values: {key: block._key as string, index: cIndex},
            },
          }

          return true
        }

        if (!child._key || typeof child._key !== 'string') {
          const newChild = {...child, _key: context.keyGenerator()}
          resolution = {
            autoResolve: true,
            patches: [
              set(newChild, [{_key: block._key as string}, 'children', cIndex]),
            ],
            description: `Child at index ${cIndex} is missing required _key in block with _key ${block._key}.`,
            action: 'Set a new random _key on the object',
            item: block,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.missing-child-key.description',
              action:
                'inputs.portable-text.invalid-value.missing-child-key.action',
              values: {key: block._key as string, index: cIndex},
            },
          }

          return true
        }

        // Verify that children have valid types
        if (!child._type) {
          resolution = {
            patches: [
              unset([
                {_key: block._key as string},
                'children',
                {_key: child._key},
              ]),
            ],
            description: `Child with _key '${child._key}' in block with key '${block._key}' is missing '_type' property.`,
            action: 'Remove the object',
            item: block,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.missing-child-type.description',
              action:
                'inputs.portable-text.invalid-value.missing-child-type.action',
              values: {key: block._key as string, childKey: child._key},
            },
          }

          return true
        }

        if (!validChildTypes.includes(child._type)) {
          resolution = {
            patches: [
              unset([
                {_key: block._key as string},
                'children',
                {_key: child._key},
              ]),
            ],
            description: `Child with _key '${child._key}' in block with key '${block._key}' has invalid '_type' property (${child._type}).`,
            action: 'Remove the object',
            item: block,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.disallowed-child-type.description',
              action:
                'inputs.portable-text.invalid-value.disallowed-child-type.action',
              values: {
                key: block._key as string,
                childKey: child._key,
                childType: child._type,
              },
            },
          }

          return true
        }

        // Verify that spans have .text property that is a string
        if (
          child._type === context.schema.span.name &&
          typeof child.text !== 'string'
        ) {
          resolution = {
            patches: [
              set({...child, text: ''}, [
                {_key: block._key as string},
                'children',
                {_key: child._key},
              ]),
            ],
            description: `Child with _key '${child._key}' in block with key '${block._key}' has missing or invalid text property!`,
            action: `Write an empty text property to the object`,
            item: block,

            i18n: {
              description:
                'inputs.portable-text.invalid-value.invalid-span-text.description',
              action:
                'inputs.portable-text.invalid-value.invalid-span-text.action',
              values: {key: block._key as string, childKey: child._key},
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

  return {valid, resolution}
}
