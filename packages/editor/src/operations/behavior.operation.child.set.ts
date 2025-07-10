import {Editor, Element, Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/to-slate-range'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const childSetOperationImplementation: BehaviorOperationImplementation<
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

    const value =
      'value' in child && typeof child.value === 'object' ? child.value : {}
    const {_type, _key, ...rest} = operation.props

    for (const prop in rest) {
      if (!definition.fields.some((field) => field.name === prop)) {
        delete rest[prop]
      }
    }

    Transforms.setNodes(
      operation.editor,
      {
        ...child,
        _key: typeof _key === 'string' ? _key : child._key,
        value: {
          ...value,
          ...rest,
        },
      },
      {at: childPath},
    )

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${JSON.stringify(operation.at)}`,
  )
}
