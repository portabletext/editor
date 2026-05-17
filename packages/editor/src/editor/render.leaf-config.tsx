import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import type {ReactElement} from 'react'
import {useContext} from 'react'
import type {
  BlockObjectConfig,
  InlineObjectConfig,
  SpanConfig,
} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import {EditorActorContext} from './editor-actor-context'
import {findInlinePositionalOverride} from './find-positional-override'
import {ParentTextBlockContext} from './parent-text-block-context'

/**
 * Hook: resolve the registered span config for the span at `node`, or
 * `undefined` if none matches.
 *
 * Subscribes to the editor actor's `spans` map so the component
 * re-renders when spans register/unregister.
 *
 * One-hop type-keyed dispatch. Positional (in-parent) overrides via
 * `defineContainer`'s `of` array are resolved one level up by the
 * caller's parent.
 */
export function useSpanConfig(
  node: PortableTextBlock | PortableTextSpan | PortableTextObject,
  _path: Path,
): SpanConfig | undefined {
  const editorActor = useContext(EditorActorContext)
  const parentTextBlock = useContext(ParentTextBlockContext)
  const positional = findInlinePositionalOverride(parentTextBlock, node._type)
  const globalSpan = useSelector(editorActor, (state) =>
    state.context.spans.get(node._type),
  )
  if (positional && 'span' in positional) {
    // Three modes: function → use; null → use default at this
    // position; undefined → fall through to global.
    if (positional.span.render === undefined) {
      return globalSpan
    }
    return positional
  }
  return globalSpan
}

/**
 * Small child component that invokes the consumer's span render with
 * stable props.
 */
export function RenderSpanConfig(props: {
  spanConfig: SpanConfig
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextSpan
  path: Path
  selected: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const readOnly = useSelector(editorActor, (state) =>
    state.matches({'edit mode': 'read only'}),
  )
  const render = props.spanConfig.span.render
  if (typeof render !== 'function') {
    return <span {...props.attributes}>{props.children}</span>
  }
  return render({
    attributes: props.attributes,
    children: props.children,
    focused: props.focused,
    node: props.node,
    path: props.path,
    readOnly,
    selected: props.selected,
  })
}

/**
 * Small child component that invokes the consumer's block-object
 * render with stable props.
 */
export function RenderBlockObjectConfig(props: {
  blockObjectConfig: BlockObjectConfig
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextBlock | PortableTextObject
  path: Path
  selected: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const readOnly = useSelector(editorActor, (state) =>
    state.matches({'edit mode': 'read only'}),
  )
  const render = props.blockObjectConfig.blockObject.render
  if (typeof render !== 'function') {
    // Engine default — render the children inside an attribute-tagged
    // wrapper so consumer CSS still sees the data-pt-block attribute.
    return <div {...props.attributes}>{props.children}</div>
  }
  return render({
    attributes: props.attributes,
    children: props.children,
    focused: props.focused,
    node: props.node as PortableTextObject,
    path: props.path,
    readOnly,
    selected: props.selected,
  })
}

/**
 * Small child component that invokes the consumer's inline-object
 * render with stable props.
 */
export function RenderInlineObjectConfig(props: {
  inlineObjectConfig: InlineObjectConfig
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  node: PortableTextBlock | PortableTextObject
  path: Path
  selected: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const readOnly = useSelector(editorActor, (state) =>
    state.matches({'edit mode': 'read only'}),
  )
  const render = props.inlineObjectConfig.inlineObject.render
  if (typeof render !== 'function') {
    return <span {...props.attributes}>{props.children}</span>
  }
  return render({
    attributes: props.attributes,
    children: props.children,
    focused: props.focused,
    node: props.node as PortableTextObject,
    path: props.path,
    readOnly,
    selected: props.selected,
  })
}
