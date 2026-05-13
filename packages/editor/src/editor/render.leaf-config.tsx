import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import type {ReactElement} from 'react'
import {useContext} from 'react'
import type {LeafConfig} from '../renderers/renderer.types'
import type {Path} from '../slate/interfaces/path'
import {EditorActorContext} from './editor-actor-context'

/**
 * Hook: resolve the registered leaf-config that should render `node`,
 * or `undefined` if none matches.
 *
 * Reads the live `leafs` map from the editor actor (so the component
 * re-renders when leafs register/unregister), then looks up by
 * `node._type`. One registration per type.
 */
export function useLeafConfig(
  node: PortableTextBlock | PortableTextSpan | PortableTextObject,
): LeafConfig | undefined {
  const editorActor = useContext(EditorActorContext)
  return useSelector(editorActor, (state) =>
    state.context.leafs.get(node._type),
  )
}

/**
 * Small child component that invokes the consumer's leaf render with
 * stable props, so React Compiler can memoize around the expensive
 * lookup without tripping on new object identities.
 */
export function RenderLeafConfig(props: {
  leafConfig: LeafConfig
  attributes: Record<string, unknown>
  children: ReactElement
  focused: boolean
  isInline: boolean
  node: PortableTextBlock | PortableTextSpan | PortableTextObject
  parent: PortableTextBlock | PortableTextObject | undefined
  path: Path
  selected: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const readOnly = useSelector(editorActor, (state) =>
    state.matches({'edit mode': 'read only'}),
  )
  return props.leafConfig.leaf.render({
    attributes: props.attributes,
    children: props.children,
    focused: props.focused,
    isInline: props.isInline,
    node: props.node,
    parent: props.parent,
    path: props.path,
    readOnly,
    selected: props.selected,
  })
}
