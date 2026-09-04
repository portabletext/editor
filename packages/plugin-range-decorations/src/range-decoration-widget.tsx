import type {CSSProperties, ReactNode} from 'react'

/**
 * @beta
 */
export interface RangeDecorationWidgetProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  title?: string
  [dataAttribute: `data-${string}`]: unknown
}

/**
 * A safe inline anchor for decoration chrome that isn't document text: a
 * `contentEditable={false}`, zero-width `span`, so it doesn't perturb text
 * metrics or the DOM-to-model offset mapping the editor's caret handling
 * depends on. `position: relative` gives absolutely-positioned content
 * that visually escapes the box (a presence dot, a comment marker)
 * something to anchor to. The skeleton sets `pointerEvents: 'none'` so
 * clicks reach the text underneath; interactive innards opt back in with
 * `style={{pointerEvents: 'auto'}}`.
 *
 * `children` here is the widget's own chrome, not the decorated document
 * text: a `RegistrableRangeDecoration.render`'s `children` must stay
 * outside this component, as a sibling, never nested inside it.
 *
 * Always renders a `span`: block content inside a paragraph shatters the
 * block's DOM.
 *
 * `style` and `className` override the skeleton, last write wins, except
 * `contentEditable`, which is fixed and isn't part of this component's
 * props.
 *
 * @beta
 */
export function RangeDecorationWidget(props: RangeDecorationWidgetProps) {
  const {children, className, style, ...dataAttributes} = props

  return (
    <span
      contentEditable={false}
      style={{
        display: 'inline-block',
        width: 0,
        // An inline-block with no height collapses to a zero-height box,
        // which hides border-drawn chrome (a caret line) and strands
        // absolutely-positioned children at the baseline.
        height: '1em',
        pointerEvents: 'none',
        // WebKit maps clicks near the line start onto the nearest
        // selectable position; a selectable non-editable island traps the
        // caret where keystrokes are silently dropped.
        userSelect: 'none',
        position: 'relative',
        verticalAlign: 'text-bottom',
        ...style,
      }}
      className={className}
      {...dataAttributes}
    >
      {children}
    </span>
  )
}
