import type {Renderer} from './renderer.types'

/**
 * @internal
 * A helper wrapper that adds editor support, such as autocomplete and type
 * checking, for a renderer definition.
 *
 * @example
 * ```ts
 * import {defineRenderer} from '@portabletext/editor'
 *
 * const tableRenderer = defineRenderer({
 *   type: 'table',
 *   render: ({attributes, children, node}) => (
 *     <table {...attributes}>{children}</table>
 *   ),
 * })
 * ```
 */
export function defineRenderer<const TRenderer extends Renderer>(
  renderer: TRenderer,
): TRenderer {
  return renderer
}
