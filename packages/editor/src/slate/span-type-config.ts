/**
 * Module-level configuration for the span type name.
 *
 * The span type name is needed by Text.isText and Element.isElement to
 * discriminate between spans (Text nodes) and other elements. Since these
 * are static methods called from deep inside Slate's transforms with no
 * editor context, the span type name is stored at module level.
 *
 * Defaults to 'span' (the PT spec default). Set during editor
 * initialization via `setSpanTypeName()` to use the schema's span type
 * name.
 */

let spanTypeName = 'span'

export function getSpanTypeName(): string {
  return spanTypeName
}

export function setSpanTypeName(name: string): void {
  spanTypeName = name
}
