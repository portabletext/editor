import type {ReactElement} from 'react'
import type {RenderElementProps} from '../engine/react/components/editable'

export function RenderTextBlock(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
}) {
  return (
    <div {...props.attributes} data-pt-block="text">
      <div>{props.children}</div>
    </div>
  )
}
