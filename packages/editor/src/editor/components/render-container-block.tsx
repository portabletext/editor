import type {PortableTextContainerBlock} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {RenderElementProps} from 'slate-react'
import type {
  ContainerBlockRenderProps,
  RenderContainerBlockFunction,
} from '../../types/editor'

export function RenderContainerBlock(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  block: PortableTextContainerBlock
  renderContainerBlock?: RenderContainerBlockFunction
}) {
  if (props.renderContainerBlock) {
    return (
      <RenderBlock
        attributes={props.attributes}
        renderContainerBlock={props.renderContainerBlock}
        block={props.block}
      >
        {props.children}
      </RenderBlock>
    )
  }

  return <div {...props.attributes}>{props.children}</div>
}

function RenderBlock({
  attributes,
  renderContainerBlock,
  children,
  block,
}: {
  renderContainerBlock: RenderContainerBlockFunction
} & ContainerBlockRenderProps) {
  return renderContainerBlock({
    attributes,
    children,
    block,
  })
}
