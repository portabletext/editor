import type {PortableTextBlock, PortableTextObject} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import {serializePath} from '../paths/serialize-path'
import type {ContainerConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateSelector} from '../slate/react/hooks/use-slate-selector'
import {EditorActorContext} from './editor-actor-context'
import {
  useIsFocusedContainer,
  useIsSelectedContainer,
} from './selection-state-context'

export function RenderContainer(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextBlock
  containerConfig: ContainerConfig
  path: Path
}) {
  const serializedPath = serializePath(props.path)
  const focused = useIsFocusedContainer(serializedPath)
  const selected = useIsSelectedContainer(serializedPath)
  const editorActor = useContext(EditorActorContext)
  const readOnly = useSelector(editorActor, (state) =>
    state.matches({'edit mode': 'read only'}),
  )
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

  const render = props.containerConfig.container.render
  if (typeof render === 'function') {
    // Container registrations forbid the `'block'` and `'span'` types
    // at the factory level (see `ContainerNodeForType`), so a container
    // node here is always a `PortableTextObject`. The runtime
    // invariant is enforced by registration; expressing it in the type
    // graph would require threading the `_type` literal through the
    // dispatch path.
    const rendered = render({
      attributes: augmentedAttributes,
      children: props.children,
      focused,
      node: props.element as PortableTextObject,
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
