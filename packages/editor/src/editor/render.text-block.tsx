import type {PortableTextTextBlock} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {Path} from '../engine/interfaces/path'
import type {RenderElementProps} from '../engine/react/components/editable'
import {useElementDropPosition} from './drop-position-state-context'
import {DropIndicator} from './render.drop-indicator'

export function RenderTextBlock(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextTextBlock
  path: Path
  readOnly: boolean
  textBlock: PortableTextTextBlock
}) {
  const dropPosition = useElementDropPosition(props.path)

  const children = props.children

  return (
    <div
      {...props.attributes}
      className={[
        'pt-block',
        'pt-text-block',
        ...(props.textBlock.style
          ? [`pt-text-block-style-${props.textBlock.style}`]
          : []),
        ...(props.textBlock.listItem
          ? [
              'pt-list-item',
              `pt-list-item-${props.textBlock.listItem}`,
              `pt-list-item-level-${props.textBlock.level ?? 1}`,
            ]
          : []),
      ].join(' ')}
      data-block-key={props.textBlock._key}
      data-block-name={props.textBlock._type}
      data-block-type="text"
      data-pt-block="text"
      {...(props.textBlock.listItem !== undefined
        ? {
            'data-list-item': props.textBlock.listItem,
          }
        : {})}
      {...(props.textBlock.level !== undefined
        ? {
            'data-level': props.textBlock.level,
          }
        : {})}
      {...(props.textBlock.style !== undefined
        ? {
            'data-style': props.textBlock.style,
          }
        : {})}
    >
      {dropPosition === 'start' ? <DropIndicator /> : null}
      <div>{children}</div>
      {dropPosition === 'end' ? <DropIndicator /> : null}
    </div>
  )
}
