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
 * Hook: resolve the registered leaf config for `node` at `path` from the
 * global leaf registry, or `undefined` if none matches.
 *
 * Subscribes to the editor actor's `leaves` map so the component
 * re-renders when leaves register/unregister.
 *
 * One-hop type-keyed dispatch. Positional (in-parent) overrides via
 * `defineContainer`'s `of` array are resolved one level up by the
 * caller's parent.
 */
export function useLeafConfig(
  node: PortableTextBlock | PortableTextSpan | PortableTextObject,
  _path: Path,
): LeafConfig | undefined {
  const editorActor = useContext(EditorActorContext)
  return useSelector(editorActor, (state) =>
    state.context.leaves.get(node._type),
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
  node: PortableTextBlock | PortableTextSpan | PortableTextObject
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
    node: props.node,
    path: props.path,
    readOnly,
    selected: props.selected,
  })
}
