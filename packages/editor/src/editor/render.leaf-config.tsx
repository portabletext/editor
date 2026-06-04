import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
} from '@portabletext/schema'
import {useCallback, useContext} from 'react'
import type {Path} from '../engine/interfaces/path'
import {useEngineSelector} from '../engine/react/hooks/use-engine-selector'
import type {SpanConfig} from '../renderers/renderer.types'
import {findInlinePositionalOverride} from './find-positional-override'
import {ParentTextBlockContext} from './parent-text-block-context'
import {tupleRefEqual} from './tuple-ref-equal'

/**
 * Hook: resolve the registered span config for the span at `node`, or
 * `undefined` if none matches.
 *
 * Subscribes to the engine's `spans` map so the component re-renders
 * when spans register/unregister.
 *
 * One-hop type-keyed dispatch. Positional (in-parent) overrides via
 * `defineContainer`'s `of` array are resolved one level up by the
 * caller's parent.
 */
export function useSpanConfig(
  node: PortableTextBlock | PortableTextSpan | PortableTextObject,
  _path: Path,
): SpanConfig | undefined {
  const parentTextBlock = useContext(ParentTextBlockContext)
  const positional = findInlinePositionalOverride(parentTextBlock, node._type)
  const [globalSpan, globalSpanCatchAll] = useEngineSelector(
    useCallback(
      (engine) =>
        [engine.spans.get(node._type), engine.spans.get('*')] as const,
      [node._type],
    ),
    tupleRefEqual,
  )
  if (positional && 'span' in positional) {
    // Positional present: undefined render falls through to global;
    // function render is used at this position.
    if (positional.span.render === undefined) {
      return globalSpan ?? globalSpanCatchAll
    }
    return positional
  }
  return globalSpan ?? globalSpanCatchAll
}
