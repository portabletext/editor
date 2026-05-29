import type {PortableTextChild, PortableTextObject} from '@portabletext/schema'
import {useRef, type ReactElement} from 'react'
import type {Path} from '../engine/interfaces/path'
import {serializePath} from '../paths/serialize-path'
import type {
  InlineObjectConfig,
  InlineObjectRenderProps,
} from '../renderers/renderer.types'
import type {BlockChildRenderProps, RenderChildFunction} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import type {LegacyRenderHooks} from './legacy-render-hooks'
import type {RenderElementProps} from './render-props-types'
import {renderDefaultInlineObject} from './render.default'
import {RenderDefaultInlineObject} from './render.default-object'
import {useIsFocusedLeaf, useIsSelectedLeaf} from './selection-state-context'
import {useBlockSubSchema} from './use-block-sub-schema'

export function RenderInlineObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextObject
  inlineObjectConfig?: InlineObjectConfig
  legacy: LegacyRenderHooks
  path: Path
  readOnly: boolean
  schema: EditorSchema
}) {
  const inlineObjectRef = useRef<HTMLElement>(null)

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

  const inlineObject = props.element as unknown as PortableTextChild

  if (props.inlineObjectConfig) {
    // `props.attributes` is already shaped by `object-node.tsx`'s
    // `NewPipelineContext` read: clean `data-pt-*` when inside a new-
    // pipeline subtree, legacy + PT when the parent text block is
    // legacy. The registered render runs in both modes; only the
    // attribute shape inherits.
    const render = props.inlineObjectConfig.inlineObject.render
    const renderProps: InlineObjectRenderProps = {
      attributes: {
        ...props.attributes,
        'data-pt-inline': 'object',
      },
      children: props.children,
      focused,
      node: props.element as PortableTextObject,
      path: props.path,
      readOnly: props.readOnly,
      renderDefault: renderDefaultInlineObject,
      selected,
    }
    return render ? render(renderProps) : renderDefaultInlineObject(renderProps)
  }

  let innerContent: ReactElement
  if (props.legacy.renderChild && inlineObjectSchemaType) {
    innerContent = (
      <RenderChild
        renderChild={props.legacy.renderChild}
        annotations={[]}
        editorElementRef={inlineObjectRef}
        selected={selected}
        focused={focused}
        path={props.path}
        schemaType={inlineObjectSchemaType}
        value={inlineObject}
      >
        <RenderDefaultInlineObject inlineObject={inlineObject} />
      </RenderChild>
    )
  } else {
    innerContent = <RenderDefaultInlineObject inlineObject={inlineObject} />
  }

  const attributes = {
    ...props.attributes,
    'className': 'pt-inline-object',
    'data-child-key': inlineObject._key,
    'data-child-name': inlineObject._type,
    'data-child-type': 'object',
    'data-pt-inline': 'object',
  }

  return (
    <span {...attributes}>
      {props.children}
      <span
        ref={inlineObjectRef}
        style={{display: 'inline-block'}}
        draggable={!props.readOnly}
      >
        {innerContent}
      </span>
    </span>
  )
}

function RenderChild({
  renderChild,
  annotations,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
}: {
  renderChild: RenderChildFunction
} & BlockChildRenderProps) {
  return renderChild({
    annotations,
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
  })
}
