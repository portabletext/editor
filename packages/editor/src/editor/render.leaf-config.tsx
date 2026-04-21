import type {
  PortableTextBlock,
  PortableTextObject,
  PortableTextSpan,
} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import type {ReactElement} from 'react'
import {useContext} from 'react'
import {findMatchingLeaf} from '../renderers/find-matching-leaf'
import type {LeafConfig} from '../renderers/renderer.types'
import {getTypeChain} from '../schema/get-type-chain'
import type {Node} from '../slate/interfaces/node'
import type {Path} from '../slate/interfaces/path'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import {EditorActorContext} from './editor-actor-context'

/**
 * Hook: resolve the registered leaf-config that should render `node` at
 * `path`, or `undefined` if none matches.
 *
 * Reads the live `leafs` map from the editor actor (so the component
 * re-renders when leafs register/unregister), computes the type chain,
 * then picks the most-specific matching config.
 */
export function useLeafConfig(
  node: PortableTextBlock | PortableTextSpan | PortableTextObject,
  path: Path,
): LeafConfig | undefined {
  const editor = useSlateStatic()
  const editorActor = useContext(EditorActorContext)
  const leafs = useSelector(editorActor, (state) => state.context.leafs)

  if (leafs.size === 0) {
    return undefined
  }

  const typeChain = getTypeChain(
    {
      schema: editor.schema,
      containers: editor.containers,
      value: editor.children as unknown as Array<Node>,
    },
    node as unknown as Node,
    path,
  )

  return findMatchingLeaf(leafs, typeChain)
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
  const rendered = props.leafConfig.leaf.render({
    attributes: props.attributes,
    children: props.children,
    focused: props.focused,
    node: props.node,
    path: props.path,
    selected: props.selected,
  })
  return rendered as ReactElement | null
}
