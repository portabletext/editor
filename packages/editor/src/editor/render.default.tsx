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
 */
export function renderDefaultBlockObject(
  props: BlockObjectRenderProps,
): ReactElement {
  return (
    <div {...props.attributes}>
      {props.children}
      <div contentEditable={false} style={{userSelect: 'none'}}>
        [{props.node._type}: {props.node._key}]
      </div>
    </div>
  )
}

/**
 * Engine-default wrapper for void inline objects. Renders the zero-width
 * editor children plus a non-editable `[_type: _key]` placeholder so the
 * object is visible before a consumer provides a custom `render`.
 */
export function renderDefaultInlineObject(
  props: InlineObjectRenderProps,
): ReactElement {
  return (
    <span {...props.attributes}>
      {props.children}
      <span contentEditable={false} style={{userSelect: 'none'}}>
        [{props.node._type}: {props.node._key}]
      </span>
    </span>
  )
}
