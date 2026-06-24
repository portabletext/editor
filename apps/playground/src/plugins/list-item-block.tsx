import type {TextBlockRenderProps} from '@portabletext/editor'
import {useListIndex} from '@portabletext/plugin-list-index'
import type {JSX} from 'react'

/**
 * Renders a list-item text block inside a container. Containers go through the
 * `defineTextBlock` pipeline, which emits only `data-pt-*` attributes, so the
 * playground's pure-CSS list counters in `editor.css` (keyed off
 * `data-list-item`/`data-level`/`data-list-index`) never fire. This re-emits
 * those attributes, with the index supplied by `useListIndex` since it is the
 * one value the consumer cannot derive from `node` alone.
 */
export function ListItemBlock(props: {
  attributes: TextBlockRenderProps['attributes']
  node: TextBlockRenderProps['node']
  path: TextBlockRenderProps['path']
  children: TextBlockRenderProps['children']
}): JSX.Element {
  const listIndex = useListIndex(props.path)
  return (
    <div
      {...props.attributes}
      data-list-item={props.node.listItem}
      data-level={props.node.level}
      data-list-index={listIndex}
      className="my-1"
    >
      {props.children}
    </div>
  )
}
