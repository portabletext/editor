import {applyAll, set} from '@portabletext/patches'
import type {PortableTextBlock} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {applySetNode} from '../internal-utils/apply-set-node'
import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor} from '../slate'
import type {ChildPath} from '../types/paths'
import {parseMarkDefs} from '../utils/parse-blocks'
import type {OperationImplementation} from './operation.types'

export const setOperationImplementation: OperationImplementation<'set'> = ({
  context,
  operation,
}) => {
  const path = operation.at

  if (path.length === 1) {
    setBlock({context, operation})
    return
  }

  if (path.length === 3 && path[1] === 'children') {
    setChild({context, operation, at: path as ChildPath})
    return
  }

  throw new Error(`Unsupported path for set operation: ${JSON.stringify(path)}`)
}

function setBlock({
  context,
  operation,
}: {
  context: Parameters<OperationImplementation<'set'>>[0]['context']
  operation: Parameters<OperationImplementation<'set'>>[0]['operation']
}) {
  const blockKey = operation.at[0]

  if (typeof blockKey !== 'object' || !('_key' in blockKey)) {
    throw new Error(
      `Expected keyed segment at path[0], got ${JSON.stringify(blockKey)}`,
    )
  }

  const blockIndex = operation.editor.blockIndexMap.get(blockKey._key)

  if (blockIndex === undefined) {
    throw new Error(
      `Unable to find block index for block at ${JSON.stringify(operation.at)}`,
    )
  }

  const slateBlock = operation.editor.children.at(blockIndex)

  if (!slateBlock) {
    throw new Error(`Unable to find block at ${JSON.stringify(operation.at)}`)
  }

  if (isTextBlock(context, slateBlock)) {
    const filteredProps: Record<string, unknown> = {}

    for (const key of Object.keys(operation.value)) {
      if (key === '_type' || key === 'children') {
        continue
      }

      if (key === 'style') {
        if (
          context.schema.styles.some(
            (style) => style.name === operation.value[key],
          )
        ) {
          filteredProps[key] = operation.value[key]
        }
        continue
      }

      if (key === 'listItem') {
        if (
          context.schema.lists.some(
            (list) => list.name === operation.value[key],
          )
        ) {
          filteredProps[key] = operation.value[key]
        }
        continue
      }

      if (key === 'level') {
        filteredProps[key] = operation.value[key]
        continue
      }

      if (key === 'markDefs') {
        const {markDefs} = parseMarkDefs({
          context,
          markDefs: operation.value[key],
          options: {validateFields: true},
        })
        filteredProps[key] = markDefs
        continue
      }

      if (context.schema.block.fields?.some((field) => field.name === key)) {
        filteredProps[key] = operation.value[key]
      }
    }

    applySetNode(operation.editor, filteredProps, [blockIndex])
  } else {
    const schemaDefinition = context.schema.blockObjects.find(
      (definition) => definition.name === slateBlock._type,
    )
    const filteredProps: Record<string, unknown> = {}

    for (const key of Object.keys(operation.value)) {
      if (key === '_type') {
        continue
      }

      if (key === '_key') {
        filteredProps[key] = operation.value[key]
        continue
      }

      if (schemaDefinition?.fields.some((field) => field.name === key)) {
        filteredProps[key] = operation.value[key]
      }
    }

    const patches = Object.entries(filteredProps).map(([key, value]) =>
      set(value, [key]),
    )

    const updatedSlateBlock = applyAll(slateBlock, patches)

    applySetNode(operation.editor, updatedSlateBlock, [blockIndex])
  }
}

function setChild({
  context,
  operation,
  at,
}: {
  context: Parameters<OperationImplementation<'set'>>[0]['context']
  operation: Parameters<OperationImplementation<'set'>>[0]['operation']
  at: ChildPath
}) {
  const location = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.children as Array<PortableTextBlock>,
      selection: {
        anchor: {path: at, offset: 0},
        focus: {path: at, offset: 0},
      },
    },
    blockIndexMap: operation.editor.blockIndexMap,
  })

  if (!location) {
    throw new Error(
      `Unable to convert ${JSON.stringify(at)} into a Slate Range`,
    )
  }

  const childEntry = Editor.node(operation.editor, location, {depth: 2})
  const child = childEntry?.[0]
  const childPath = childEntry?.[1]

  if (!child || !childPath) {
    throw new Error(`Unable to find child at ${JSON.stringify(at)}`)
  }

  if (operation.editor.isTextSpan(child)) {
    const {_type, text, ...rest} = operation.value

    applySetNode(
      operation.editor,
      {
        ...child,
        ...rest,
      },
      childPath,
    )

    if (typeof text === 'string') {
      if (child.text !== text) {
        operation.editor.apply({
          type: 'remove_text',
          path: childPath,
          offset: 0,
          text: child.text,
        })

        operation.editor.apply({
          type: 'insert_text',
          path: childPath,
          offset: 0,
          text,
        })
      }
    }

    return
  }

  if (operation.editor.isObjectNode(child)) {
    const definition = context.schema.inlineObjects.find(
      (definition) => definition.name === child._type,
    )

    if (!definition) {
      throw new Error(
        `Unable to find schema definition for Inline Object type ${child._type}`,
      )
    }

    const {_type, _key, ...rest} = operation.value

    for (const prop in rest) {
      if (!definition.fields.some((field) => field.name === prop)) {
        delete rest[prop]
      }
    }

    applySetNode(
      operation.editor,
      {
        ...child,
        _key: typeof _key === 'string' ? _key : child._key,
        ...rest,
      },
      childPath,
    )

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${JSON.stringify(at)}`,
  )
}
