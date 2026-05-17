import type {
  RenderBlockFunction,
  RenderChildFunction,
  RenderListItemFunction,
  RenderStyleFunction,
} from '../types/editor'

/**
 * The legacy v6 render-callback bundle that the engine forwards to the
 * default text-block / block-object / inline-object renderers. None of
 * these are read by `RenderElement` itself; they are routed through to
 * the specific component that consumes each one.
 *
 * When v8 retires the legacy callbacks, this type and the prop drilling
 * around it disappear together.
 */
export type LegacyRenderHooks = {
  renderBlock?: RenderBlockFunction
  renderChild?: RenderChildFunction
  renderListItem?: RenderListItemFunction
  renderStyle?: RenderStyleFunction
}
