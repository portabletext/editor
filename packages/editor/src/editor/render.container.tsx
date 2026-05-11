import type {PortableTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import {serializePath} from '../paths/serialize-path'
import type {ContainerConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateSelector} from '../slate/react/hooks/use-slate-selector'
import {EditorActorContext} from './editor-actor-context'
import {SelectionStateContext} from './selection-state-context'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  containerConfig: ContainerConfig
  dropPosition: 'start' | 'end' | undefined
  element: PortableTextBlock
  path: Path
}) {
  const {focusedContainerPath, selectedContainerPaths} = useContext(
    SelectionStateContext,
  )
  const editorActor = useContext(EditorActorContext)
  const readOnly = useSelector(editorActor, (state) =>
    state.matches({'edit mode': 'read only'}),
  )
  const serializedPath = serializePath(props.path)
  const focused = focusedContainerPath === serializedPath
  const selected = selectedContainerPaths.has(serializedPath)
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
      dropPosition: props.dropPosition,
      focused,
      node: props.element,
      path: props.path,
      readOnly,
      selected,
    })

    if (rendered !== null) {
      return rendered
    }
  }

  return <div {...augmentedAttributes}>{props.children}</div>
}
