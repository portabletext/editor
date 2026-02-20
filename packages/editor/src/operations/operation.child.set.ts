import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Transforms} from '../slate'
import type {OperationImplementation} from './operation.types'

export const childSetOperationImplementation: OperationImplementation<
  'child.set'
> = ({context, operation}) => {
  const location = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.children,
      selection: {
        anchor: {path: operation.at, offset: 0},
        focus: {path: operation.at, offset: 0},
      },
    },
    blockIndexMap: operation.editor.blockIndexMap,
  })

  if (!location) {
    throw new Error(
      `Unable to convert ${JSON.stringify(operation.at)} into a Slate Range`,
    )
  }

  const childEntry = Editor.node(operation.editor, location, {depth: 2})
  const child = childEntry?.[0]
  const childPath = childEntry?.[1]

  if (!child || !childPath) {
    throw new Error(`Unable to find child at ${JSON.stringify(operation.at)}`)
  }

  if (operation.editor.isTextSpan(child)) {
    const {_type, text, ...rest} = operation.props

    // Pass only delta props to setNodes (not the full object spread)
    if (Object.keys(rest).length > 0) {
      Transforms.setNodes(operation.editor, rest, {at: childPath})
    }

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

  if (operation.editor.isElement(child)) {
    const definition = context.schema.inlineObjects.find(
      (definition) => definition.name === child._type,
    )

    if (!definition) {
      throw new Error(
        `Unable to find schema definition for Inline Object type ${child._type}`,
      )
    }

    const {_type, _key, ...rest} = operation.props

    // Filter to valid fields only
    for (const prop in rest) {
      if (!definition.fields.some((field) => field.name === prop)) {
        delete rest[prop]
      }
    }

    // Properties live directly on the node now (no value wrapper)
    // Split into safe props (through setNodes) and unsafe props
    // (text/children — Slate rejects these in set_node)
    const safeProps: Record<string, unknown> = {}
    const unsafeProps: Record<string, unknown> = {}

    if (typeof _key === 'string') {
      safeProps['_key'] = _key
    }

    for (const [key, val] of Object.entries(rest)) {
      if (key === 'text' || key === 'children') {
        unsafeProps[key] = val
      } else {
        safeProps[key] = val
      }
    }

    if (Object.keys(safeProps).length > 0) {
      Transforms.setNodes(operation.editor, safeProps, {at: childPath})
    }

    // For unsafe props, use remove_node + insert_node
    if (Object.keys(unsafeProps).length > 0) {
      const currentChild = Editor.node(operation.editor, childPath)?.[0]
      if (currentChild) {
        const updatedChild = {...currentChild, ...unsafeProps}
        Transforms.removeNodes(operation.editor, {at: childPath})
        Transforms.insertNodes(operation.editor, updatedChild, {
          at: childPath,
        })
      }
    }

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${JSON.stringify(operation.at)}`,
  )
}
