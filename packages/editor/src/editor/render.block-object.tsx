import type {PortableTextObject} from '@portabletext/schema'
import {useRef, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Path} from '../engine/interfaces/path'
import type {RenderElementProps} from '../engine/react/components/editable'
import type {
  BlockObjectConfig,
  BlockObjectRenderProps,
} from '../renderers/renderer.types'
import type {BlockRenderProps, RenderBlockFunction} from '../types/editor'
import type {EditorSchema} from './editor-schema'
import type {LegacyRenderHooks} from './legacy-render-hooks'
import {renderDefaultBlockObject} from './render.default'
import {RenderDefaultBlockObject} from './render.default-object'
import {DropIndicator} from './render.drop-indicator'
import {useIsFocusedLeaf, useIsSelectedLeaf} from './selection-state-context'

export function RenderBlockObject(props: {
  attributes: RenderElementProps['attributes']
  blockObject: PortableTextObject | undefined
  dropPosition?: DropPosition['position']
  children: ReactElement
  element: PortableTextObject
  blockObjectConfig?: BlockObjectConfig
  path: Path
  readOnly: boolean
  legacy: LegacyRenderHooks
  schema: EditorSchema
}) {
  const blockObjectRef = useRef<HTMLDivElement>(null)

  const selected = useIsSelectedLeaf(props.path)
  const focused = useIsFocusedLeaf(props.path)

  const blockObjectSchemaType = props.schema.blockObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!blockObjectSchemaType) {
    console.error(
      `Unable to find Block Object "${props.element._type}" in Schema`,
    )
  }

  const blockObject = props.blockObject ?? {
    _key: props.element._key,
    _type: props.element._type,
  }

  if (props.blockObjectConfig) {
    const {
      'data-slate-node': _slateNode,
      'data-slate-void': _slateVoid,
      ...ptAttributes
    } = props.attributes
    const render = props.blockObjectConfig.blockObject.render
    const renderProps: BlockObjectRenderProps = {
      attributes: {
        ...ptAttributes,
        'data-pt-block': 'object',
      },
      children: props.children,
      node: props.element,
      path: props.path,
      readOnly: props.readOnly,
      renderDefault: renderDefaultBlockObject,
    }
    return render ? render(renderProps) : renderDefaultBlockObject(renderProps)
  }

  let innerContent: ReactElement
  if (props.legacy.renderBlock && blockObjectSchemaType) {
    innerContent = (
      <RenderBlock
        renderBlock={props.legacy.renderBlock}
        editorElementRef={blockObjectRef}
        focused={focused}
        path={[{_key: props.element._key}]}
        schemaType={blockObjectSchemaType}
        selected={selected}
        value={blockObject}
      >
        <RenderDefaultBlockObject blockObject={blockObject} />
      </RenderBlock>
    )
  } else {
    innerContent = <RenderDefaultBlockObject blockObject={blockObject} />
  }

  const attributes = {
    ...props.attributes,
    'className': 'pt-block pt-object-block',
    'data-block-key': props.element._key,
    'data-block-name': props.element._type,
    'data-block-type': 'object',
    'data-pt-block': 'object',
  }

  return (
    <div {...attributes}>
      {props.dropPosition === 'start' ? <DropIndicator /> : null}
      {props.children}
      <div
        ref={blockObjectRef}
        contentEditable={false}
        draggable={!props.readOnly}
      >
        {innerContent}
      </div>
      {props.dropPosition === 'end' ? <DropIndicator /> : null}
    </div>
  )
}

function RenderBlock({
  renderBlock,
  children,
  editorElementRef,
  focused,
  path,
  schemaType,
  selected,
  value,
}: {
  renderBlock: RenderBlockFunction
} & BlockRenderProps) {
  return renderBlock({
    children,
    editorElementRef,
    focused,
    path,
    schemaType,
    selected,
    value,
  })
}
