import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, useMemo, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import {isInline} from '../node-traversal/is-inline'
import {serializePath} from '../paths/serialize-path'
import type {
  ContainerConfig,
  LeafConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'
import {EditorActorContext} from './editor-actor-context'
import type {EditorSchema} from './editor-schema'
import {ParentContainerContext} from './parent-container-context'
import {RenderBlockObject} from './render.block-object'
import {RenderContainer} from './render.container'
import {RenderInlineObject} from './render.inline-object'
import {RenderTextBlock} from './render.text-block'
import {resolveElementDropPosition} from './resolve-element-drop-position'
import {
  useIsFocusedContainer,
  useIsSelectedContainer,
} from './selection-state-context'

/**
 * Reference-equality comparator for fixed-length tuples. Each slot is
 * compared via `Object.is`; the tuple is considered equal when every
 * slot's reference is unchanged. Lets a multi-slot `useSelector` skip
 * re-renders unless one of the slots actually changes.
 */
function tupleRefEqual<T extends readonly unknown[]>(
  previous: T,
  next: T,
): boolean {
  if (previous.length !== next.length) {
    return false
  }
  for (let i = 0; i < previous.length; i++) {
    if (!Object.is(previous[i], next[i])) {
      return false
    }
  }
  return true
}

/**
 * Find a positional override for `_type` in the parent's pre-resolved
 * `of` array. Returns the matching {@link ContainerConfig} or
 * {@link LeafConfig}, or `undefined` if no override exists.
 *
 * One-hop only - does not walk ancestors. Nested registrations beyond
 * the immediate parent only fire when the engine descends into the
 * matching container, at which point that container's `of` defines the
 * next hop.
 */
function findPositionalOverride(
  parentConfig: ContainerConfig | undefined,
  type: string,
): ContainerConfig | LeafConfig | TextBlockConfig | undefined {
  if (!parentConfig?.of) {
    return undefined
  }
  return parentConfig.of.find((entry) => {
    if ('container' in entry) {
      return entry.container.type === type
    }
    if ('textBlock' in entry) {
      return entry.textBlock.type === type
    }
    return entry.leaf.type === type
  })
}

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
  const parentContainer = useContext(ParentContainerContext)
  const slateStatic = useSlateStatic()
  const schema = props.schema
  const type = props.element._type

  // Positional override from the immediate parent's `of` array.
  const positionalOverride = findPositionalOverride(parentContainer, type)

  // Single live-subscribed lookup pulling all three maps. Tuple is
  // ref-stable when each map entry's reference is unchanged, so the
  // subscription only fires re-renders on real registration changes
  // for this `_type`.
  //
  // `globalLeafConfig`'s fallback path (no positional override, no global
  // container) is exercised implicitly by every test that renders a
  // schema-declared block-object via the engine default. See
  // `tests/container-rendering.test.tsx > 'gallery with void block objects'`
  // for an explicit positive case.
  const [globalContainerConfig, globalLeafConfig, textBlockConfig] =
    useSelector(
      editorActor,
      (state) =>
        [
          state.context.containers.get(type),
          state.context.leaves.get(type),
          state.context.textBlocks.get(type),
        ] as const,
      tupleRefEqual,
    )

  // Compose effective configs. Positional override wins over global.
  // Same `_type` cannot be BOTH a container and a leaf, so at most one
  // of `containerConfig` / `leafConfig` is set.
  //
  // The positional override (when present) is already fully resolved
  // the registration pass walked the `of` tree and attached the
  // resolved field at every level, so no per-render schema walk is
  // needed.
  const containerConfig = useMemo<ContainerConfig | undefined>(() => {
    if (positionalOverride && isContainerRegistration(positionalOverride)) {
      return positionalOverride
    }
    return globalContainerConfig
  }, [positionalOverride, globalContainerConfig])

  const effectiveTextBlockConfig = useMemo<TextBlockConfig | undefined>(() => {
    if (positionalOverride && isTextBlockRegistration(positionalOverride)) {
      return positionalOverride
    }
    return textBlockConfig
  }, [positionalOverride, textBlockConfig])

  const leafConfig = useMemo<LeafConfig | undefined>(() => {
    if (
      positionalOverride &&
      !isContainerRegistration(positionalOverride) &&
      !isTextBlockRegistration(positionalOverride)
    ) {
      return positionalOverride
    }
    if (containerConfig) {
      return undefined
    }
    return globalLeafConfig
  }, [positionalOverride, globalLeafConfig, containerConfig])

  if (containerConfig) {
    return (
      <ParentContainerContext.Provider value={containerConfig}>
        <RenderContainer
          attributes={props.attributes}
          element={props.element}
          containerConfig={containerConfig}
          path={props.path}
        >
          {props.children}
        </RenderContainer>
      </ParentContainerContext.Provider>
    )
  }

  if (isTextBlock({schema}, props.element)) {
    if (effectiveTextBlockConfig) {
      const {'data-slate-node': _sn, ...rest} = props.attributes
      return (
        <RenderTextBlockConfig
          attributes={{...rest, 'data-pt-block-type': 'text'}}
          textBlockConfig={effectiveTextBlockConfig}
          node={props.element}
          path={props.path}
          readOnly={props.readOnly}
        >
          {props.children}
        </RenderTextBlockConfig>
      )
    }
    if (parentContainer) {
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

  if (isInline(slateStatic, props.path)) {
    if (parentContainer && !leafConfig) {
      const {
        'data-slate-node': _sn,
        'data-slate-void': _sv,
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
        leafConfig={leafConfig}
        path={props.path}
        readOnly={props.readOnly}
        renderChild={props.renderChild}
        schema={schema}
      >
        {props.children}
      </RenderInlineObject>
    )
  }

  if (parentContainer && !leafConfig) {
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
      leafConfig={leafConfig}
      path={props.path}
      readOnly={props.readOnly}
      renderBlock={props.renderBlock}
      schema={schema}
    >
      {props.children}
    </RenderBlockObject>
  )
}

function isContainerRegistration(
  entry: ContainerConfig | LeafConfig | TextBlockConfig,
): entry is ContainerConfig {
  return 'container' in entry
}

function isTextBlockRegistration(
  entry: ContainerConfig | LeafConfig | TextBlockConfig,
): entry is TextBlockConfig {
  return 'textBlock' in entry
}

/**
 * Renders a text block via a registered `defineTextBlock` config.
 * Extracted into its own component so the per-slice selection hooks
 * (`useIsFocusedContainer` / `useIsSelectedContainer`) live at the top
 * of a component, not inside a conditional in `RenderElement`'s body.
 */
function RenderTextBlockConfig(props: {
  attributes: Omit<RenderElementProps['attributes'], 'data-pt-block-type'> & {
    'data-pt-block-type': 'text'
  }
  children: ReactElement
  node: PortableTextTextBlock
  path: Path
  readOnly: boolean
  textBlockConfig: TextBlockConfig
}) {
  const serializedPath = serializePath(props.path)
  const focused = useIsFocusedContainer(serializedPath)
  const selected = useIsSelectedContainer(serializedPath)
  return props.textBlockConfig.textBlock.render({
    attributes: props.attributes,
    children: props.children,
    focused,
    node: props.node,
    path: props.path,
    readOnly: props.readOnly,
    selected,
  })
}
