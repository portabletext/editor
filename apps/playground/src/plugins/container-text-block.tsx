import type {TextBlockRenderProps} from '@portabletext/editor'
import {useListIndex} from '@portabletext/plugin-list-index'
import {createElement, type JSX} from 'react'
import {BlockDropIndicator} from './block-drop-indicator'

type StyleConfig = {tag: keyof JSX.IntrinsicElements; className: string}

/**
 * The text-block render shared by every container (callout, fact-box, cell).
 * Containers render through the `defineTextBlock` pipeline, which emits only
 * `data-pt-*` attributes and no drop-indicator chrome, so each container would
 * otherwise repeat the same three concerns: re-emit the `data-list-*`
 * attributes the playground's counter CSS keys off (with the index from
 * `useListIndex`, the one value `node` cannot supply), pick the element for the
 * block style, and draw the {@link BlockDropIndicator}. They differ only in
 * which styles they allow, so that is the single parameter.
 *
 * The block element is `relative` so the absolutely-positioned indicator
 * aligns to it.
 */
export function ContainerTextBlock(props: {
  attributes: TextBlockRenderProps['attributes']
  children: TextBlockRenderProps['children']
  node: TextBlockRenderProps['node']
  path: TextBlockRenderProps['path']
  styles: {normal: StyleConfig} & Record<string, StyleConfig>
}): JSX.Element {
  const listIndex = useListIndex(props.path)

  if (props.node.listItem !== undefined) {
    return (
      <div
        {...props.attributes}
        data-list-item={props.node.listItem}
        data-level={props.node.level}
        data-list-index={listIndex}
        className="relative my-1"
      >
        {props.children}
        <BlockDropIndicator path={props.path} />
      </div>
    )
  }

  const style =
    props.styles[props.node.style ?? 'normal'] ?? props.styles.normal

  return createElement(
    style.tag,
    {...props.attributes, className: `relative ${style.className}`.trim()},
    props.children,
    <BlockDropIndicator key="drop-indicator" path={props.path} />,
  )
}
