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
  BlockObjectConfig,
  ContainerConfig,
  InlineObjectConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import {EditorActorContext} from './editor-actor-context'
import type {EditorSchema} from './editor-schema'
import {
  findBlockPositionalOverride,
  findInlinePositionalOverride,
} from './find-positional-override'
import type {LegacyRenderHooks} from './legacy-render-hooks'
import {ParentContainerContext} from './parent-container-context'
import {ParentTextBlockContext} from './parent-text-block-context'
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

export function RenderElement(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  dropPosition?: DropPosition
  element: PortableTextTextBlock | PortableTextObject
  legacy: LegacyRenderHooks
  path: Path
  readOnly: boolean
  schema: EditorSchema
}) {
  const editorActor = useContext(EditorActorContext)
  const parentContainer = useContext(ParentContainerContext)
  const parentTextBlock = useContext(ParentTextBlockContext)
  const slateStatic = useSlateStatic()
  const schema = props.schema
  const type = props.element._type

  // Block-level positional override from the immediate parent
  // container's `of` array (container, textBlock, blockObject).
  const blockPositionalOverride = findBlockPositionalOverride(
    parentContainer,
    type,
  )
  // Inline-level positional override from the immediate parent text
  // block's `of` array (span, inlineObject).
  const inlinePositionalOverride = findInlinePositionalOverride(
    parentTextBlock,
    type,
  )

  // Single live-subscribed lookup pulling all four global maps. Tuple
  // is ref-stable when each map entry's reference is unchanged, so the
  // subscription only fires re-renders on real registration changes
  // for this `_type`. (Spans render through render.span.tsx; this
  // element-level dispatch does not look at the spans map.)
  const [
    globalContainerConfig,
    globalBlockObjectConfig,
    globalInlineObjectConfig,
    textBlockConfig,
  ] = useSelector(
    editorActor,
    (state) =>
      [
        state.context.containers.get(type),
        state.context.blockObjects.get(type),
        state.context.inlineObjects.get(type),
        state.context.textBlocks.get(type),
      ] as const,
    tupleRefEqual,
  )

  // Compose effective container config. Block-level positional
  // override wins. `render: null` on the override means "explicitly
  // use default at this position" — still wins over global.
  // `render: undefined` on a positional override falls through to
  // global; if no global exists, the positional config itself is
  // still the effective container (the engine default renders).
  const containerConfig = useMemo<ContainerConfig | undefined>(() => {
    if (blockPositionalOverride && 'container' in blockPositionalOverride) {
      if (blockPositionalOverride.container.render === undefined) {
        return globalContainerConfig ?? blockPositionalOverride
      }
      return blockPositionalOverride
    }
    return globalContainerConfig
  }, [blockPositionalOverride, globalContainerConfig])

  // Compose the active text-block scope value (provided via context to
  // inline children so they can read positional `of` overrides for
  // span + inlineObject). This is independent of which render fires:
  // a positional `render: null` still establishes a scope.
  const textBlockScope = useMemo<TextBlockConfig | undefined>(() => {
    if (blockPositionalOverride && 'textBlock' in blockPositionalOverride) {
      return blockPositionalOverride
    }
    return textBlockConfig
  }, [blockPositionalOverride, textBlockConfig])

  // Resolve which text-block config (if any) supplies a `render` at
  // this position. Mirrors the shape used by `containerConfig` /
  // `blockObjectConfig` / `inlineObjectConfig` / `useSpanConfig`: only
  // `render === undefined` is resolved here (falls through to global).
  // The `function` vs `null` split is handled at dispatch where the
  // tagged default for this position is emitted.
  const renderableTextBlockConfig = useMemo<TextBlockConfig | undefined>(() => {
    if (blockPositionalOverride && 'textBlock' in blockPositionalOverride) {
      if (blockPositionalOverride.textBlock.render === undefined) {
        return textBlockConfig
      }
      return blockPositionalOverride
    }
    return textBlockConfig
  }, [blockPositionalOverride, textBlockConfig])

  const blockObjectConfig = useMemo<BlockObjectConfig | undefined>(() => {
    if (blockPositionalOverride && 'blockObject' in blockPositionalOverride) {
      // Three modes: function → use; null → use default at this position;
      // undefined → fall through to global.
      if (blockPositionalOverride.blockObject.render === undefined) {
        // Fall through to global.
        return globalBlockObjectConfig
      }
      return blockPositionalOverride
    }
    if (containerConfig) {
      return undefined
    }
    return globalBlockObjectConfig
  }, [blockPositionalOverride, globalBlockObjectConfig, containerConfig])

  // Inline-object positional override comes from the parent TEXT
  // BLOCK's `of`, not the parent container's.
  const inlineObjectConfig = useMemo<InlineObjectConfig | undefined>(() => {
    if (
      inlinePositionalOverride &&
      'inlineObject' in inlinePositionalOverride
    ) {
      if (inlinePositionalOverride.inlineObject.render === undefined) {
        return globalInlineObjectConfig
      }
      return inlinePositionalOverride
    }
    if (containerConfig) {
      return undefined
    }
    return globalInlineObjectConfig
  }, [inlinePositionalOverride, globalInlineObjectConfig, containerConfig])

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
    const {'data-slate-node': _sn, ...rest} = props.attributes
    let rendered: ReactElement
    if (
      renderableTextBlockConfig &&
      typeof renderableTextBlockConfig.textBlock.render === 'function'
    ) {
      rendered = (
        <RenderTextBlockConfig
          attributes={{...rest, 'data-pt-block': 'text'}}
          render={renderableTextBlockConfig.textBlock.render}
          node={props.element}
          path={props.path}
          readOnly={props.readOnly}
        >
          {props.children}
        </RenderTextBlockConfig>
      )
    } else if (parentContainer) {
      // Default rendering at this position inside a container.
      rendered = (
        <div {...rest} data-pt-block="text">
          {props.children}
        </div>
      )
    } else {
      // Legacy top-level rendering.
      rendered = (
        <RenderTextBlock
          attributes={props.attributes}
          dropPosition={resolveElementDropPosition(
            props.dropPosition,
            props.path,
          )}
          element={props.element}
          legacy={props.legacy}
          path={props.path}
          readOnly={props.readOnly}
          schema={schema}
          textBlock={props.element}
        >
          {props.children}
        </RenderTextBlock>
      )
    }
    // Provide the active text-block scope to inline children so they
    // can read positional overrides for span + inlineObject from the
    // text block's `of`. Skip the provider when no scope exists.
    if (textBlockScope) {
      return (
        <ParentTextBlockContext.Provider value={textBlockScope}>
          {rendered}
        </ParentTextBlockContext.Provider>
      )
    }
    return rendered
  }

  if (isInline(slateStatic, props.path)) {
    if (parentContainer && !inlineObjectConfig) {
      const {
        'data-slate-node': _sn,
        'data-slate-void': _sv,
        ...rest
      } = props.attributes
      return (
        <span {...rest} data-pt-inline="object">
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
        inlineObjectConfig={inlineObjectConfig}
        legacy={props.legacy}
        path={props.path}
        readOnly={props.readOnly}
        schema={schema}
      >
        {props.children}
      </RenderInlineObject>
    )
  }

  if (parentContainer && !blockObjectConfig) {
    const {
      'data-slate-node': _sn,
      'data-slate-void': _sv,
      ...rest
    } = props.attributes
    return (
      <div {...rest} data-pt-block="object">
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
      blockObjectConfig={blockObjectConfig}
      legacy={props.legacy}
      path={props.path}
      readOnly={props.readOnly}
      schema={schema}
    >
      {props.children}
    </RenderBlockObject>
  )
}

/**
 * Renders a text block via a registered `defineTextBlock` config whose
 * `render` is a function. Extracted into its own component so the
 * per-slice selection hooks (`useIsFocusedContainer` /
 * `useIsSelectedContainer`) live at the top of a component, not inside
 * a conditional in `RenderElement`'s body.
 *
 * The dispatch in `RenderElement` filters out `null` / `undefined`
 * renders and emits the appropriate default itself (engine wrapper
 * inside a container, legacy renderer at top level).
 */
function RenderTextBlockConfig(props: {
  attributes: Omit<RenderElementProps['attributes'], 'data-pt-block'> & {
    'data-pt-block': 'text'
  }
  children: ReactElement
  node: PortableTextTextBlock
  path: Path
  readOnly: boolean
  render: NonNullable<TextBlockConfig['textBlock']['render']>
}) {
  const serializedPath = serializePath(props.path)
  const focused = useIsFocusedContainer(serializedPath)
  const selected = useIsSelectedContainer(serializedPath)
  return props.render({
    attributes: props.attributes,
    children: props.children,
    focused,
    node: props.node,
    path: props.path,
    readOnly: props.readOnly,
    selected,
  })
}
