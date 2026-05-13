import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import {getParent} from '../node-traversal/get-parent'
import {isInline as isInlinePath} from '../node-traversal/is-inline'
import type {ContainerConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import {ContainerScopeContext} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import type {EditorSchema} from './editor-schema'
import {RenderBlockObject} from './render.block-object'
import {RenderContainer} from './render.container'
import {RenderInlineObject} from './render.inline-object'
import {useLeafConfig} from './render.leaf-config'
import {RenderTextBlock} from './render.text-block'
import {resolveElementDropPosition} from './resolve-element-drop-position'

export function RenderElement(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  dropPosition?: DropPosition
  element: PortableTextTextBlock | PortableTextObject
  path: Path
  readOnly: boolean
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
  schema: EditorSchema
  spellCheck?: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const containerScope = useContext(ContainerScopeContext)
  const slateStatic = useSlateStatic()
  const schema = props.schema

  const globalContainerConfig = useSelector(
    editorActor,
    (state) =>
      // Internal cast: the public `Container` view is narrowed; runtime
      // values are the full `ContainerConfig` carrying the render
      // function.
      state.context.containers.get(props.element._type) as
        | ContainerConfig
        | undefined,
  )

  const globalLeafConfig = useLeafConfig(props.element)

  const parentEntry = getParent(slateStatic, props.path)
  const parentNode = parentEntry?.node as
    | PortableTextBlock
    | PortableTextObject
    | undefined
  const isInline = isInlinePath(slateStatic, props.path)

  // `renderChild` lookup: when the immediate structural parent is a
  // registered container that declares a render override for this
  // child's `_type`, prefer it over any global `defineContainer` /
  // `defineLeaf` registration. Direct-parent only (no ancestor walk).
  const parentContainerConfig = useSelector(editorActor, (state) =>
    parentNode
      ? (state.context.containers.get(parentNode._type) as
          | ContainerConfig
          | undefined)
      : undefined,
  )
  const renderChildOverride =
    parentContainerConfig?.container.renderChild?.[props.element._type]

  // Effective configs: if a `renderChild` override applies, synthesize
  // a config whose render is the override, preserving the structural
  // wrapping (container / block-object / inline-object) chosen by
  // global registration.
  const containerConfig: ContainerConfig | undefined =
    renderChildOverride && globalContainerConfig
      ? {
          ...globalContainerConfig,
          container: {
            ...globalContainerConfig.container,
            render: renderChildOverride,
          },
        }
      : globalContainerConfig
  const leafConfig =
    renderChildOverride && !globalContainerConfig
      ? globalLeafConfig
        ? {
            ...globalLeafConfig,
            leaf: {
              ...globalLeafConfig.leaf,
              render: renderChildOverride,
            },
          }
        : {
            // Synthesize a leaf-config from the override when this `_type`
            // has no global `defineContainer` / `defineLeaf` registration.
            // `renderChild` declares both existence-of-render and the
            // render itself, scoped to the parent.
            leaf: {
              type: props.element._type,
              render: renderChildOverride,
            },
          }
      : globalLeafConfig

  if (containerConfig) {
    return (
      <RenderContainer
        attributes={props.attributes}
        element={props.element}
        containerConfig={containerConfig}
        isInline={isInline}
        parent={parentNode}
        path={props.path}
      >
        {props.children}
      </RenderContainer>
    )
  }

  if (isTextBlock({schema}, props.element)) {
    if (containerScope) {
      const {'data-slate-node': _sn, ...rest} = props.attributes
      return (
        <div {...rest} data-pt-block-type="text">
          {props.children}
        </div>
      )
    }
    return (
      <RenderTextBlock
        attributes={props.attributes}
        dropPosition={resolveElementDropPosition(
          props.dropPosition,
          props.path,
        )}
        element={props.element}
        path={props.path}
        readOnly={props.readOnly}
        renderBlock={props.renderBlock}
        renderListItem={props.renderListItem}
        renderStyle={props.renderStyle}
        schema={schema}
        spellCheck={props.spellCheck}
        textBlock={props.element}
      >
        {props.children}
      </RenderTextBlock>
    )
  }

  if (isInline) {
    if (containerScope && !leafConfig) {
      const {
        'data-slate-node': _sn,
        'data-slate-void': _sv,
        'contentEditable': _ce,
        ...rest
      } = props.attributes
      return (
        <span {...rest} data-pt-child-type="object">
          {props.children}
          <span contentEditable={false}>
            [{props.element._type}: {props.element._key}]
          </span>
        </span>
      )
    }
    return (
      <RenderInlineObject
        attributes={props.attributes}
        element={props.element}
        isInline={isInline}
        leafConfig={leafConfig}
        parent={parentNode}
        path={props.path}
        readOnly={props.readOnly}
        renderChild={props.renderChild}
        schema={schema}
      >
        {props.children}
      </RenderInlineObject>
    )
  }

  if (containerScope && !leafConfig) {
    const {
      'data-slate-node': _sn,
      'data-slate-void': _sv,
      ...rest
    } = props.attributes
    return (
      <div {...rest} data-pt-block-type="object">
        {props.children}
        <div contentEditable={false}>
          [{props.element._type}: {props.element._key}]
        </div>
      </div>
    )
  }

  return (
    <RenderBlockObject
      attributes={props.attributes}
      blockObject={props.element}
      dropPosition={resolveElementDropPosition(props.dropPosition, props.path)}
      element={props.element}
      isInline={isInline}
      leafConfig={leafConfig}
      parent={parentNode}
      path={props.path}
      readOnly={props.readOnly}
      renderBlock={props.renderBlock}
      schema={schema}
    >
      {props.children}
    </RenderBlockObject>
  )
}
