import {applyAll} from '@portabletext/patches'
import {Editor, Element, Transforms} from 'slate'
import {toSlateRange} from '../internal-utils/to-slate-range'
import type {BehaviorOperationImplementation} from './behavior.operations'

export const childUnsetOperationImplementation: BehaviorOperationImplementation<
  'child.unset'
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
    if (operation.props.includes('text')) {
      operation.editor.apply({
        type: 'remove_text',
        path: childPath,
        offset: 0,
        text: child.text,
      })
    }

    const newNode: Record<string, unknown> = {}

    for (const prop of operation.props) {
      if (prop === '_type') {
        // It's not allowed to unset the _type of a span
        continue
      }

      if (prop === '_key') {
        newNode._key = context.keyGenerator()
        continue
      }

      newNode[prop] = null
    }

    Transforms.setNodes(operation.editor, newNode, {at: childPath})

    return
  }

  if (Element.isElement(child)) {
    const value =
      'value' in child && typeof child.value === 'object' ? child.value : {}
    const patches = operation.props.map((prop) => ({
      type: 'unset' as const,
      path: [prop],
    }))
    const newValue = applyAll(value, patches)

    Transforms.setNodes(
      operation.editor,
      {
        ...child,
        _key: operation.props.includes('_key')
          ? context.keyGenerator()
          : child._key,
        value: newValue,
      },
      {at: childPath},
    )

    return
  }

  throw new Error(
    `Unable to determine the type of child at ${JSON.stringify(operation.at)}`,
  )
}
