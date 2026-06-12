import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useCallback, useContext, useMemo, type ReactElement} from 'react'
import type {DropPosition} from '../behaviors/behavior.core.drop-position'
import type {Path} from '../engine/interfaces/path'
import type {RenderElementProps} from '../engine/react/components/editable'
import {useEngineSelector} from '../engine/react/hooks/use-engine-selector'
import {useEngineStatic} from '../engine/react/hooks/use-engine-static'
import {serializePath} from '../paths/serialize-path'
import type {
  BlockObjectConfig,
  ContainerConfig,
  InlineObjectConfig,
  TextBlockConfig,
} from '../renderers/renderer.types'
import {isInline} from '../traversal/is-inline'
import type {EditorSchema} from './editor-schema'
import {
  findBlockPositionalOverride,
  findInlinePositionalOverride,
} from './find-positional-override'
import type {LegacyRenderHooks} from './legacy-render-hooks'
import {NewPipelineContext} from './new-pipeline-context'
import {ParentContainerContext} from './parent-container-context'
import {ParentTextBlockContext} from './parent-text-block-context'
import {RenderBlockObject} from './render.block-object'
import {RenderContainer} from './render.container'
import {renderDefaultTextBlock} from './render.default'
import {RenderInlineObject} from './render.inline-object'
import {RenderTextBlock} from './render.text-block'
import {resolveElementDropPosition} from './resolve-element-drop-position'
import {
  useIsFocusedContainer,
  useIsSelectedContainer,
} from './selection-state-context'
import {tupleRefEqual} from './tuple-ref-equal'

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
  const parentContainer = useContext(ParentContainerContext)
  const parentTextBlock = useContext(ParentTextBlockContext)
  const isInNewPipeline = useContext(NewPipelineContext)
  const engineStatic = useEngineStatic()
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
    globalBlockObjectCatchAll,
    globalInlineObjectConfig,
    globalInlineObjectCatchAll,
    textBlockConfig,
    textBlockCatchAll,
  ] = useEngineSelector(
    useCallback(
      (engine) =>
        [
          engine.containers.get(type),
          engine.blockObjects.get(type),
          engine.blockObjects.get('*'),
          engine.inlineObjects.get(type),
          engine.inlineObjects.get('*'),
          engine.textBlocks.get(type),
          engine.textBlocks.get('*'),
        ] as const,
      [type],
    ),
    tupleRefEqual,
  )

  // Compose effective container config. Block-level positional
  // override wins. `render: undefined` on a positional override falls
  // through to global; if no global exists, the positional config
  // itself is still the effective container (the engine default
  // renders, because the structural commitment - it's a container
  // with this arrayField - is separable from the rendering choice).
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
  // span + inlineObject). Independent of which render fires - the
  // positional registration's `of` array still scopes inline content.
  const textBlockScope = useMemo<TextBlockConfig | undefined>(() => {
    if (blockPositionalOverride && 'textBlock' in blockPositionalOverride) {
      return blockPositionalOverride
    }
    return textBlockConfig ?? textBlockCatchAll
  }, [blockPositionalOverride, textBlockConfig, textBlockCatchAll])

  // Resolve which text-block config (if any) supplies a `render` at
  // this position. Mirrors the shape used by `containerConfig` /
  // `blockObjectConfig` / `inlineObjectConfig` / `useSpanConfig`:
  // `render === undefined` falls through to global; a function render
  // is used at this position.
  const renderableTextBlockConfig = useMemo<TextBlockConfig | undefined>(() => {
    if (blockPositionalOverride && 'textBlock' in blockPositionalOverride) {
      if (blockPositionalOverride.textBlock.render === undefined) {
        return textBlockConfig ?? textBlockCatchAll
      }
      return blockPositionalOverride
    }
    return textBlockConfig ?? textBlockCatchAll
  }, [blockPositionalOverride, textBlockConfig, textBlockCatchAll])

  const blockObjectConfig = useMemo<BlockObjectConfig | undefined>(() => {
    if (blockPositionalOverride && 'blockObject' in blockPositionalOverride) {
      // Positional undefined render falls through to global; function
      // render is used at this position.
      if (blockPositionalOverride.blockObject.render === undefined) {
        return globalBlockObjectConfig ?? globalBlockObjectCatchAll
      }
      return blockPositionalOverride
    }
    if (containerConfig) {
      return undefined
    }
    return globalBlockObjectConfig ?? globalBlockObjectCatchAll
  }, [
    blockPositionalOverride,
    globalBlockObjectConfig,
    globalBlockObjectCatchAll,
    containerConfig,
  ])

  // Inline-object positional override comes from the parent TEXT
  // BLOCK's `of`, not the parent container's.
  const inlineObjectConfig = useMemo<InlineObjectConfig | undefined>(() => {
    if (
      inlinePositionalOverride &&
      'inlineObject' in inlinePositionalOverride
    ) {
      if (inlinePositionalOverride.inlineObject.render === undefined) {
        return globalInlineObjectConfig ?? globalInlineObjectCatchAll
      }
      return inlinePositionalOverride
    }
    if (containerConfig) {
      return undefined
    }
    return globalInlineObjectConfig ?? globalInlineObjectCatchAll
  }, [
    inlinePositionalOverride,
    globalInlineObjectConfig,
    globalInlineObjectCatchAll,
    containerConfig,
  ])

  if (containerConfig) {
    return (
      <ParentContainerContext.Provider value={containerConfig}>
        <RenderContainer
          attributes={props.attributes}
          element={props.element}
          containerConfig={containerConfig}
          path={props.path}
          readOnly={props.readOnly}
        >
          {props.children}
        </RenderContainer>
      </ParentContainerContext.Provider>
    )
  }

  if (isTextBlock({schema}, props.element)) {
    const {'data-slate-node': _sn, ...rest} = props.attributes
    let rendered: ReactElement | null
    if (renderableTextBlockConfig?.textBlock.render) {
      rendered = (
        <RenderTextBlockConfig
          attributes={{...rest, 'data-pt-block': 'text'}}
          dropPosition={resolveElementDropPosition(
            props.dropPosition,
            props.path,
          )}
          render={renderableTextBlockConfig.textBlock.render}
          node={props.element}
          path={props.path}
          readOnly={props.readOnly}
        >
          {props.children}
        </RenderTextBlockConfig>
      )
    } else if (isInNewPipeline) {
      // Default rendering at this position inside a new-pipeline
      // subtree. Same shape as `renderDefault` returns when a
      // registered text-block omits `render`.
      rendered = renderDefaultTextBlock({
        attributes: {...rest, 'data-pt-block': 'text'},
        children: props.children,
      })
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

  if (isInline(engineStatic.snapshot, props.path)) {
    if (isInNewPipeline && !inlineObjectConfig) {
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

  if (isInNewPipeline && !blockObjectConfig) {
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
 * The dispatch in `RenderElement` filters: a `function` render flows
 * here; a config with no `render` resolves to global or to the
 * legacy pipeline at top level.
 */
function RenderTextBlockConfig(props: {
  attributes: Omit<RenderElementProps['attributes'], 'data-pt-block'> & {
    'data-pt-block': 'text'
  }
  children: ReactElement
  dropPosition?: DropPosition['position']
  node: PortableTextTextBlock
  path: Path
  readOnly: boolean
  render: NonNullable<TextBlockConfig['textBlock']['render']>
}) {
  const serializedPath = serializePath(props.path)
  const focused = useIsFocusedContainer(serializedPath)
  const selected = useIsSelectedContainer(serializedPath)
  const listIndex = useEngineSelector((editor) =>
    editor.listIndexMap.get(props.node._key),
  )
  const renderDefault = renderDefaultTextBlock
  return props.render({
    attributes: props.attributes,
    children: props.children,
    dropPosition: props.dropPosition,
    focused,
    listIndex,
    node: props.node,
    path: props.path,
    readOnly: props.readOnly,
    renderDefault,
    selected,
  })
}
