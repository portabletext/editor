import type {ReactElement} from 'react'
import type {
  BlockObjectRenderProps,
  InlineObjectRenderProps,
} from '../renderers/renderer.types'

/**
 * Engine-default wrapper for Container nodes. Spreads engine-emitted
 * `attributes` (including `data-pt-*` markers) on a `<div>` and
 * renders the children. Used both as the fallback when no `render`
 * is provided and as the `renderDefault` prop on `ContainerRenderProps`.
 */
export function renderDefaultContainer(props: {
  attributes: Record<string, unknown>
  children: ReactElement
}): ReactElement {
  return <div {...props.attributes}>{props.children}</div>
}

/**
 * Engine-default wrapper for TextBlock nodes. Spreads engine-emitted
 * `attributes` (including `data-pt-block="text"`) on a `<div>` and
 * renders the children.
 */
export function renderDefaultTextBlock(props: {
  attributes: Record<string, unknown>
  children: ReactElement
}): ReactElement {
  return <div {...props.attributes}>{props.children}</div>
}

/**
 * Engine-default wrapper for Span nodes. Spreads engine-emitted
 * `attributes` on a `<span>` and renders the children.
 */
export function renderDefaultSpan(props: {
  attributes: Record<string, unknown>
  children: ReactElement
}): ReactElement {
  return <span {...props.attributes}>{props.children}</span>
}

/**
 * Engine-default wrapper for void block objects. Renders the zero-width
 * editor children plus a non-editable `[_type: _key]` placeholder so the
 * object is visible before a consumer provides a custom `render`.
 *
 * Inner sibling-of-spacer wrapper carries `contentEditable={false}` (so
 * caret can't land in the placeholder) and `draggable={!readOnly}` (so
 * the void block is draggable). Mirrors the legacy block-object DOM
 * shape: outer stays editable so the engine's spacer caret anchor works;
 * both `contentEditable` and `draggable` live on the same sibling node.
 */
export function renderDefaultBlockObject(
  props: BlockObjectRenderProps,
): ReactElement {
  return (
    <div {...props.attributes}>
      {props.children}
      <div
        contentEditable={false}
        draggable={!props.readOnly}
        style={{userSelect: 'none'}}
      >
        [{props.node._type}: {props.node._key}]
      </div>
    </div>
  )
}

/**
 * Engine-default wrapper for void inline objects. Renders the zero-width
 * editor children plus a non-editable `[_type: _key]` placeholder so the
 * object is visible before a consumer provides a custom `render`.
 *
 * Outer span auto-receives `contentEditable={false}` via
 * `object-node.tsx`'s `isInline && !readOnly` branch (engine-applied for
 * inline voids). The inner sibling-of-spacer wrapper carries only
 * `draggable={!readOnly}`; non-editability inherits from the outer via
 * DOM `contentEditable` inheritance. Mirrors the legacy inline-object
 * DOM shape.
 */
export function renderDefaultInlineObject(
  props: InlineObjectRenderProps,
): ReactElement {
  return (
    <span {...props.attributes}>
      {props.children}
      <span draggable={!props.readOnly} style={{userSelect: 'none'}}>
        [{props.node._type}: {props.node._key}]
      </span>
    </span>
  )
}
