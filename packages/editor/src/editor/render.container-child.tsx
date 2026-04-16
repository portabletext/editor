import type {
  PortableTextChild,
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, useRef, type ReactElement} from 'react'
import {isInline} from '../node-traversal/is-inline'
import {serializePath} from '../paths/serialize-path'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import type {
  BlockChildRenderProps,
  BlockRenderProps,
  RenderBlockFunction,
  RenderChildFunction,
} from '../types/editor'
import {ContainerScopeContext} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import {RenderContainer} from './render.container'
import {
  RenderDefaultBlockObject,
  RenderDefaultInlineObject,
} from './render.default-object'
import {DropIndicator} from './render.drop-indicator'
import {buildScopedName, findByScope} from './scoped-config-lookup'
import {SelectionStateContext} from './selection-state-context'

type LegacyChildCallbacks = {
  dropPosition?: 'start' | 'end'
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
}

export function RenderContainerChild(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextTextBlock | PortableTextObject
  legacyCallbacks?: LegacyChildCallbacks
  path: Path
}) {
  const editorActor = useContext(EditorActorContext)
  const schema = editorActor.getSnapshot().context.schema
  const containerScope = useContext(ContainerScopeContext)
  const slateStatic = useSlateStatic()
  const elementRef = useRef<HTMLElement>(null)

  const scopedTypeName = buildScopedName(containerScope, props.element._type)

  const containerConfig = useSelector(editorActor, (s) =>
    findByScope(s.context.containerConfigs, scopedTypeName),
  )

  const isInlineObject = isInline(slateStatic, props.path)

  // Inline objects live inside text blocks, so their scope includes '.block.':
  // 'callout.block.stock-ticker' not 'callout.stock-ticker'
  const leafScopedName = isInlineObject
    ? buildScopedName(containerScope, `block.${props.element._type}`)
    : scopedTypeName

  const leafConfig = useSelector(editorActor, (s) =>
    findByScope(s.context.leafConfigs, leafScopedName),
  )

  if (containerConfig) {
    return (
      <RenderContainer
        attributes={props.attributes}
        element={props.element}
        containerConfig={containerConfig}
        path={props.path}
      >
        {props.children}
      </RenderContainer>
    )
  }

  if (isTextBlock({schema}, props.element)) {
    const {
      'data-slate-node': _slateNode,
      'data-pt-path': _ptPath,
      ...baseAttributes
    } = props.attributes
    const dataPath = serializePath(props.path)
    return (
      <div {...baseAttributes} data-pt-container="" data-pt-path={dataPath}>
        {props.children}
      </div>
    )
  }

  if (props.legacyCallbacks && !leafConfig) {
    return (
      <RenderLegacyObject
        attributes={props.attributes}
        callbacks={props.legacyCallbacks}
        element={props.element as PortableTextObject}
        isInlineObject={isInlineObject}
        path={props.path}
        schema={schema}
      >
        {props.children}
      </RenderLegacyObject>
    )
  }

  const dataPath = serializePath(props.path)
  const {
    'data-slate-node': _slateNode,
    'data-slate-void': _slateVoid,
    'data-slate-inline': _slateInline,
    'data-pt-path': _ptPath,
    ...baseAttributes
  } = props.attributes

  if (isInlineObject) {
    const inlineAttributes = {
      ...baseAttributes,
      'data-pt-leaf': '',
      'data-pt-path': dataPath,
      'contentEditable': false,
    }

    const inlineChildren = (
      <>
        {props.children}
        <span data-pt-spacer={''}>{'\uFEFF'}</span>
      </>
    )

    if (leafConfig) {
      const rendered = leafConfig.leaf.render({
        attributes: inlineAttributes,
        children: inlineChildren,
        node: props.element,
        path: props.path,
      })

      if (rendered !== null) {
        return rendered
      }
    }

    return (
      <span {...inlineAttributes} ref={elementRef}>
        <RenderDefaultInlineObject inlineObject={props.element} />
        {inlineChildren}
      </span>
    )
  }

  const blockObjectAttributes = {
    ...baseAttributes,
    'data-pt-leaf': '',
    'data-pt-path': dataPath,
    'contentEditable': false,
  }

  const blockObjectChildren = (
    <>
      {props.children}
      <div
        data-pt-spacer=""
        style={{
          height: '0',
          color: 'transparent',
          outline: 'none',
          position: 'absolute',
        }}
      >
        <span data-pt-leaf="">
          <span data-pt-zero-width="z" data-pt-length={0}>
            {'\uFEFF'}
          </span>
        </span>
      </div>
    </>
  )

  if (leafConfig) {
    const rendered = leafConfig.leaf.render({
      attributes: blockObjectAttributes,
      children: blockObjectChildren,
      node: props.element,
      path: props.path,
    })

    if (rendered !== null) {
      return rendered
    }
  }

  return (
    <div {...blockObjectAttributes}>
      <RenderDefaultBlockObject blockObject={props.element} />
      {blockObjectChildren}
    </div>
  )
}

function RenderLegacyObject(props: {
  attributes: RenderElementProps['attributes']
  callbacks: LegacyChildCallbacks
  children: ReactElement
  element: PortableTextObject
  isInlineObject: boolean
  path: Path
  schema: import('./editor-schema').EditorSchema
}) {
  const {
    attributes,
    callbacks,
    children: slateChildren,
    element,
    isInlineObject,
    path,
    schema,
  } = props
  const {dropPosition, readOnly, renderBlock, renderChild} = callbacks
  const objectRef = useRef<HTMLElement>(null)
  const {selectedLeafPaths, focusedLeafPath} = useContext(SelectionStateContext)
  const serializedPath = serializePath(path)
  const selected = selectedLeafPaths.has(serializedPath)
  const focused = focusedLeafPath === serializedPath

  if (isInlineObject) {
    const inlineObjectSchemaType = schema.inlineObjects.find(
      (schemaType) => schemaType.name === element._type,
    )
    if (!inlineObjectSchemaType) {
      console.error(`Unable to find Inline Object "${element._type}" in Schema`)
    }
    const inlineObject = element as unknown as PortableTextChild
    return (
      <span
        {...attributes}
        className="pt-inline-object"
        data-child-key={inlineObject._key}
        data-child-name={inlineObject._type}
        data-child-type="object"
      >
        {slateChildren}
        <span
          ref={objectRef as React.Ref<HTMLSpanElement>}
          style={{display: 'inline-block'}}
          draggable={!readOnly}
        >
          {renderChild && inlineObjectSchemaType ? (
            <RenderChildCallback
              renderChild={renderChild}
              annotations={[]}
              editorElementRef={objectRef}
              selected={selected}
              focused={focused}
              path={path}
              schemaType={inlineObjectSchemaType}
              value={inlineObject}
            >
              <RenderDefaultInlineObject inlineObject={inlineObject} />
            </RenderChildCallback>
          ) : (
            <RenderDefaultInlineObject inlineObject={inlineObject} />
          )}
        </span>
      </span>
    )
  }

  const blockObjectSchemaType = schema.blockObjects.find(
    (schemaType) => schemaType.name === element._type,
  )
  if (!blockObjectSchemaType) {
    console.error(`Unable to find Block Object "${element._type}" in Schema`)
  }

  return (
    <div
      {...attributes}
      className="pt-block pt-object-block"
      data-block-key={element._key}
      data-block-name={element._type}
      data-block-type="object"
    >
      {dropPosition === 'start' ? <DropIndicator /> : null}
      {slateChildren}
      <div
        ref={objectRef as React.Ref<HTMLDivElement>}
        contentEditable={false}
        draggable={!readOnly}
      >
        {renderBlock && blockObjectSchemaType ? (
          <RenderBlockCallback
            renderBlock={renderBlock}
            editorElementRef={objectRef}
            focused={focused}
            path={[{_key: element._key}]}
            schemaType={blockObjectSchemaType}
            selected={selected}
            value={element}
          >
            <RenderDefaultBlockObject blockObject={element} />
          </RenderBlockCallback>
        ) : (
          <RenderDefaultBlockObject blockObject={element} />
        )}
      </div>
      {dropPosition === 'end' ? <DropIndicator /> : null}
    </div>
  )
}

function RenderBlockCallback({
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

function RenderChildCallback({
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
