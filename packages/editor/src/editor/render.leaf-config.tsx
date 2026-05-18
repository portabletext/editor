import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext} from 'react'
import type {SpanConfig} from '../renderers/renderer.types'
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
    // Positional present: undefined render falls through to global;
    // function render is used at this position.
    if (positional.span.render === undefined) {
      return globalSpan
    }
    return positional
  }
  return globalSpan
}
