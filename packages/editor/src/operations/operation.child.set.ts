import {toSlateRange} from '../internal-utils/to-slate-range'
import {Editor, Element, Transforms, type Descendant} from '../slate'
import type {OperationImplementation} from './operation.types'

export const childSetOperationImplementation: OperationImplementation<
  'child.set'
> = ({context, operation}) => {
  const location = toSlateRange({
    context: {
      schema: context.schema,
      value: operation.editor.value,
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

    Transforms.setNodes(
      operation.editor,
      {
        ...child,
        ...rest,
      },
      {at: childPath},
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

  if (Element.isElement(child)) {
    const definition = context.schema.inlineObjects.find(
      (definition) => definition.name === child._type,
    )

    if (!definition) {
      throw new Error(
        `Unable to find schema definition for Inline Object type ${child._type}`,
      )
    }

    const {_type, _key, ...rest} = operation.props
    const filteredProps: Record<string, unknown> = {}

    if (typeof _key === 'string') {
      filteredProps['_key'] = _key
    }

    for (const prop in rest) {
      if (definition.fields.some((field) => field.name === prop)) {
        filteredProps[prop] = rest[prop]
      }
    }

    // Slate's set_node rejects 'text' and 'children' in newProperties,
    // but inline objects can have user-defined fields with those names.
    // Split into set_node-safe props and text/children props.
    const safeProps: Record<string, unknown> = {}
    const unsafeProps: Record<string, unknown> = {}

    for (const key in filteredProps) {
      if (key === 'text' || key === 'children') {
        unsafeProps[key] = filteredProps[key]
      } else {
        safeProps[key] = filteredProps[key]
      }
    }

    if (Object.keys(safeProps).length > 0) {
      Transforms.setNodes(operation.editor, safeProps, {at: childPath})
    }

    if (Object.keys(unsafeProps).length > 0) {
      // Use remove_node + insert_node to replace the entire node
      const newNode = {...(child as Record<string, unknown>), ...unsafeProps}
      operation.editor.apply({
        type: 'remove_node',
        path: childPath,
        node: child as Descendant,
      })
      operation.editor.apply({
        type: 'insert_node',
        path: childPath,
        node: newNode as unknown as Descendant,
      })
    }

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${JSON.stringify(operation.at)}`,
  )
}
