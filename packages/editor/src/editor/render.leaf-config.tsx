import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
} from '@portabletext/schema'
import {useCallback, useContext} from 'react'
import type {Path} from '../engine/interfaces/path'
import {useRegistrationsSelector} from '../engine/react/hooks/use-engine-selector'
import type {
  AnnotationConfig,
  DecoratorConfig,
  SpanConfig,
} from '../renderers/renderer.types'
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
  const [globalSpan, globalSpanCatchAll] = useRegistrationsSelector(
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

/**
 * Hook: the engine's registered decorator map.
 *
 * Global-only: decorators have no positional (in-parent) override
 * layer, unlike containers/spans/inline-objects. The per-mark
 * exact-then-`'*'` lookup happens as a plain `Map` read against this
 * snapshot rather than as one hook call per mark: a span carries a
 * variable number of decorator marks, and hooks cannot be called a
 * variable number of times.
 */
export function useDecoratorConfigs(): ReadonlyMap<string, DecoratorConfig> {
  return useRegistrationsSelector((engine) => engine.decorators)
}

/**
 * Hook: the engine's registered annotation map.
 *
 * Global-only, for the same reason as {@link useDecoratorConfigs}: a
 * span's marks resolve to a variable number of annotation `markDef`s
 * per render.
 */
export function useAnnotationConfigs(): ReadonlyMap<string, AnnotationConfig> {
  return useRegistrationsSelector((engine) => engine.annotations)
}
