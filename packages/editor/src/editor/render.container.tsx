import type {PortableTextBlock} from '@portabletext/schema'
import type {ReactElement} from 'react'
import type {ContainerConfig} from '../renderers/renderer.types'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateSelector} from '../slate/react/hooks/use-slate-selector'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextBlock
  containerConfig: ContainerConfig
}) {
  const listIndex = useSlateSelector((editor) =>
    editor.listIndexMap.get(props.element._key),
  )

  const {element} = props
  const textBlockAttributes =
    'style' in element || 'listItem' in element
      ? {
          ...(element.style !== undefined && {'data-style': element.style}),
          ...(element.listItem !== undefined && {
            'data-list-item': element.listItem,
          }),
          ...(element.level !== undefined && {'data-level': element.level}),
          ...(listIndex !== undefined && {'data-list-index': listIndex}),
        }
      : {}

  const augmentedAttributes = {...props.attributes, ...textBlockAttributes}

  if (props.containerConfig.container.render) {
    const rendered = props.containerConfig.container.render({
      attributes: augmentedAttributes,
      children: props.children,
      node: props.element,
    })

    if (rendered !== null) {
      return rendered
    }
  }

  return <div {...augmentedAttributes}>{props.children}</div>
}
