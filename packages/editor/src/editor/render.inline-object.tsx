import type {PortableTextObject} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {Path} from '../engine/interfaces/path'
import type {RenderElementProps} from '../engine/react/components/editable'
import {serializePath} from '../paths/serialize-path'
import type {
  InlineObjectConfig,
  InlineObjectRenderProps,
} from '../renderers/renderer.types'
import type {EditorSchema} from './editor-schema'
import {renderDefaultInlineObject} from './render.default'
import {useIsFocusedLeaf, useIsSelectedLeaf} from './selection-state-context'
import {useBlockSubSchema} from './use-block-sub-schema'

export function RenderInlineObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextObject
  inlineObjectConfig?: InlineObjectConfig
  path: Path
  readOnly: boolean
  schema: EditorSchema
}) {
  const subSchema = useBlockSubSchema(props.path)

  const inlineObjectSchemaType = subSchema.inlineObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!inlineObjectSchemaType) {
    console.error(
      `Unable to find Inline Object "${props.element._type}" in Schema`,
    )
  }

  const serializedPath = serializePath(props.path)
  const selected = useIsSelectedLeaf(serializedPath)
  const focused = useIsFocusedLeaf(serializedPath)

  const render = props.inlineObjectConfig?.inlineObject.render
  const renderProps: InlineObjectRenderProps = {
    attributes: {
      ...props.attributes,
      'data-pt-inline': 'object',
    },
    children: props.children,
    focused,
    node: props.element,
    path: props.path,
    readOnly: props.readOnly,
    renderDefault: renderDefaultInlineObject,
    selected,
  }
  return render ? render(renderProps) : renderDefaultInlineObject(renderProps)
}
