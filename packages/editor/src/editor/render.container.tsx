import type {PortableTextBlock} from '@portabletext/schema'
import {useContext, type ReactElement} from 'react'
import {serializePath} from '../paths/serialize-path'
import type {ContainerConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {SelectionStateContext} from './selection-state-context'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextBlock
  containerConfig: ContainerConfig
  path: Path
}) {
  const {focusedContainerPath, selectedContainerPaths} = useContext(
    SelectionStateContext,
  )
  const serializedPath = serializePath(props.path)
  const focused = focusedContainerPath === serializedPath
  const selected = selectedContainerPaths.has(serializedPath)

  if (props.containerConfig.container.render) {
    const rendered = props.containerConfig.container.render({
      attributes: props.attributes,
      children: props.children,
      focused,
      node: props.element,
      path: props.path,
      selected,
    })

    if (rendered !== null) {
      return rendered
    }
  }

  return <div {...props.attributes}>{props.children}</div>
}
