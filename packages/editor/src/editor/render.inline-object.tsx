import {useContext, useRef, type ReactElement} from 'react'
import {Range, type Element as SlateElement} from 'slate'
import {DOMEditor} from 'slate-dom'
import {
  useSelected,
  useSlateSelector,
  useSlateStatic,
  type RenderElementProps,
} from 'slate-react'
import {getPointBlock} from '../internal-utils/slate-utils'
import {findMatchingRenderer, useRenderers} from '../renderers/use-renderer'
import type {
  BlockChildRenderProps,
  PortableTextMemberSchemaTypes,
  RenderChildFunction,
} from '../types/editor'
import {EditorActorContext} from './editor-actor-context'
import type {EditorSchema} from './editor-schema'
import {getEditorSnapshot} from './editor-selector'
import {RenderDefaultInlineObject} from './render.default-object'

export function RenderInlineObject(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: SlateElement
  legacySchema: PortableTextMemberSchemaTypes
  readOnly: boolean
  renderChild?: RenderChildFunction
  schema: EditorSchema
}) {
  const inlineObjectRef = useRef<HTMLElement>(null)
  const slateEditor = useSlateStatic()
  const editorActor = useContext(EditorActorContext)
  const selected = useSelected()
  const focused = useSlateSelector(
    (editor) =>
      selected &&
      editor.selection !== null &&
      Range.isCollapsed(editor.selection),
  )

  // Get registered renderers
  const registeredRenderers = useRenderers('inline', props.element._type)

  // Lazy snapshot getter - only compute when guards need it
  const getSnapshot = () =>
    getEditorSnapshot({
      editorActorSnapshot: editorActor.getSnapshot(),
      slateEditorInstance: slateEditor,
    })

  const legacySchemaType = props.legacySchema.inlineObjects.find(
    (inlineObject) => inlineObject.name === props.element._type,
  )

  if (!legacySchemaType) {
    console.error(
      `Unable to find Inline Object "${props.element._type}" in Schema`,
    )
  }

  const path = DOMEditor.findPath(slateEditor, props.element)
  const [block] = getPointBlock({
    editor: slateEditor,
    point: {
      path,
      offset: 0,
    },
  })

  if (!block) {
    console.error(
      `Unable to find parent block of inline object ${props.element._key}`,
    )
  }

  const inlineObject = {
    _key: props.element._key,
    _type: props.element._type,
    ...('value' in props.element && typeof props.element.value === 'object'
      ? props.element.value
      : {}),
  }

  // Find matching renderer (first whose guard passes)
  const match = findMatchingRenderer(
    registeredRenderers,
    inlineObject,
    getSnapshot,
  )

  // If there's a matching renderer, use it (full DOM control)
  if (match) {
    const renderDefault = () => (
      <span
        {...props.attributes}
        draggable={!props.readOnly}
        className="pt-inline-object"
        data-child-key={inlineObject._key}
        data-child-name={inlineObject._type}
        data-child-type="object"
      >
        {props.children}
        <span ref={inlineObjectRef} style={{display: 'inline-block'}}>
          <RenderDefaultInlineObject inlineObject={inlineObject} />
        </span>
      </span>
    )

    const renderHidden = () => (
      <span {...props.attributes} style={{display: 'none'}}>
        {props.children}
      </span>
    )

    return match.renderer.renderer.render(
      {
        attributes: props.attributes,
        children: props.children,
        node: inlineObject,
        renderDefault,
        renderHidden,
      },
      match.guardResponse,
    )
  }

  return (
    <span
      {...props.attributes}
      draggable={!props.readOnly}
      className="pt-inline-object"
      data-child-key={inlineObject._key}
      data-child-name={inlineObject._type}
      data-child-type="object"
    >
      {props.children}
      <span ref={inlineObjectRef} style={{display: 'inline-block'}}>
        {props.renderChild && block && legacySchemaType ? (
          <RenderChild
            renderChild={props.renderChild}
            annotations={[]}
            editorElementRef={inlineObjectRef}
            selected={selected}
            focused={focused}
            path={[{_key: block._key}, 'children', {_key: props.element._key}]}
            schemaType={legacySchemaType}
            value={inlineObject}
            type={legacySchemaType}
          >
            <RenderDefaultInlineObject inlineObject={inlineObject} />
          </RenderChild>
        ) : (
          <RenderDefaultInlineObject inlineObject={inlineObject} />
        )}
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
  type,
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
    type,
  })
}
