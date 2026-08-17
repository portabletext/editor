import type {PortableTextObject} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {Path} from '../engine/interfaces/path'
import type {RenderElementProps} from '../engine/react/components/editable'
import {serializePath} from '../paths/serialize-path'
import type {
  BlockObjectConfig,
  BlockObjectRenderProps,
} from '../renderers/renderer.types'
import type {EditorSchema} from './editor-schema'
import {renderDefaultBlockObject} from './render.default'
import {useIsFocusedLeaf, useIsSelectedLeaf} from './selection-state-context'

export function RenderBlockObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextObject
  blockObjectConfig?: BlockObjectConfig
  path: Path
  readOnly: boolean
  schema: EditorSchema
}) {
  const serializedPath = serializePath(props.path)
  const selected = useIsSelectedLeaf(serializedPath)
  const focused = useIsFocusedLeaf(serializedPath)

  const blockObjectSchemaType = props.schema.blockObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!blockObjectSchemaType) {
    console.error(
      `Unable to find Block Object "${props.element._type}" in Schema`,
    )
  }

  const render = props.blockObjectConfig?.blockObject.render
  const renderProps: BlockObjectRenderProps = {
    attributes: {
      ...props.attributes,
      'data-pt-block': 'object',
    },
    children: props.children,
    focused,
    node: props.element,
    path: props.path,
    readOnly: props.readOnly,
    renderDefault: renderDefaultBlockObject,
    selected,
  }
  return render ? render(renderProps) : renderDefaultBlockObject(renderProps)
}
