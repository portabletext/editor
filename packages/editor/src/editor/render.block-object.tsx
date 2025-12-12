import type {PortableTextObject} from '@portabletext/schema'
import {useContext, useRef, useState, type ReactElement} from 'react'
import {Range, type Element as SlateElement} from 'slate'
import {
  useSelected,
  useSlateSelector,
  useSlateStatic,
  type RenderElementProps,
} from 'slate-react'
import type {EventPositionBlock} from '../internal-utils/event-position'
import {findMatchingRenderer, useRenderers} from '../renderers/use-renderer'
import type {
  BlockRenderProps,
  PortableTextMemberSchemaTypes,
  RenderBlockFunction,
} from '../types/editor'
import {EditorActorContext} from './editor-actor-context'
import type {EditorSchema} from './editor-schema'
import {getEditorSnapshot} from './editor-selector'
import {RenderDefaultBlockObject} from './render.default-object'
import {DropIndicator} from './render.drop-indicator'
import {useCoreBlockElementBehaviors} from './use-core-block-element-behaviors'

export function RenderBlockObject(props: {
  attributes: RenderElementProps['attributes']
  blockObject: PortableTextObject | undefined
  children: ReactElement
  element: SlateElement
  legacySchema: PortableTextMemberSchemaTypes
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  schema: EditorSchema
}) {
  const [dragPositionBlock, setDragPositionBlock] =
    useState<EventPositionBlock>()
  const blockObjectRef = useRef<HTMLDivElement>(null)
  const slateEditor = useSlateStatic()
  const editorActor = useContext(EditorActorContext)
  const selected = useSelected()
  const focused = useSlateSelector(
    (editor) =>
      selected &&
      editor.selection !== null &&
      Range.isCollapsed(editor.selection),
  )

  useCoreBlockElementBehaviors({
    key: props.element._key,
    onSetDragPositionBlock: setDragPositionBlock,
  })

  // Get registered renderers
  const registeredRenderers = useRenderers('block', props.element._type)

  // Lazy snapshot getter - only compute when guards need it
  const getSnapshot = () =>
    getEditorSnapshot({
      editorActorSnapshot: editorActor.getSnapshot(),
      slateEditorInstance: slateEditor,
    })

  const legacySchemaType = props.legacySchema.blockObjects.find(
    (schemaType) => schemaType.name === props.element._type,
  )

  if (!legacySchemaType) {
    console.error(
      `Unable to find Block Object "${props.element._type}" in Schema`,
    )
  }

  const blockObject = props.blockObject ?? {
    _key: props.element._key,
    _type: props.element._type,
  }

  // Find matching renderer (first whose guard passes)
  const match = findMatchingRenderer(
    registeredRenderers,
    blockObject,
    getSnapshot,
  )

  // If there's a matching renderer, use it (full DOM control)
  if (match) {
    const renderDefault = () => (
      <div
        {...props.attributes}
        className="pt-block pt-object-block"
        data-block-key={props.element._key}
        data-block-name={props.element._type}
        data-block-type="object"
      >
        {dragPositionBlock === 'start' ? <DropIndicator /> : null}
        {props.children}
        <div
          ref={blockObjectRef}
          contentEditable={false}
          draggable={!props.readOnly}
        >
          <RenderDefaultBlockObject blockObject={blockObject} />
        </div>
        {dragPositionBlock === 'end' ? <DropIndicator /> : null}
      </div>
    )

    const renderHidden = () => (
      <div {...props.attributes} style={{display: 'none'}}>
        {props.children}
      </div>
    )

    return match.renderer.renderer.render(
      {
        attributes: props.attributes,
        children: props.children,
        node: blockObject,
        renderDefault,
        renderHidden,
      },
      match.guardResponse,
    )
  }

  return (
    <div
      {...props.attributes}
      className="pt-block pt-object-block"
      data-block-key={props.element._key}
      data-block-name={props.element._type}
      data-block-type="object"
    >
      {dragPositionBlock === 'start' ? <DropIndicator /> : null}
      {props.children}
      <div
        ref={blockObjectRef}
        contentEditable={false}
        draggable={!props.readOnly}
      >
        {props.renderBlock && legacySchemaType ? (
          <RenderBlock
            renderBlock={props.renderBlock}
            editorElementRef={blockObjectRef}
            focused={focused}
            path={[{_key: props.element._key}]}
            schemaType={legacySchemaType}
            selected={selected}
            type={legacySchemaType}
            value={blockObject}
          >
            <RenderDefaultBlockObject blockObject={blockObject} />
          </RenderBlock>
        ) : (
          <RenderDefaultBlockObject blockObject={blockObject} />
        )}
      </div>
      {dragPositionBlock === 'end' ? <DropIndicator /> : null}
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
  type,
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
    type,
    value,
  })
}
