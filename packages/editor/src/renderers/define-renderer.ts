import type {Renderer} from './renderer.types'

/**
 * @internal
 */
export function defineRenderer<const TRenderer extends Renderer>(
  renderer: TRenderer,
): TRenderer {
  return renderer
}
