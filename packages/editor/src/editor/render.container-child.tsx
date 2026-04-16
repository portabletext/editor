import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, useRef, type ReactElement} from 'react'
import {isInline} from '../node-traversal/is-inline'
import {serializePath} from '../paths/serialize-path'
import type {Path} from '../slate/interfaces/path'
import type {RenderElementProps} from '../slate/react/components/editable'
import {useSlateStatic} from '../slate/react/hooks/use-slate-static'
import {ContainerScopeContext} from './container-scope-context'
import {EditorActorContext} from './editor-actor-context'
import {RenderContainer} from './render.container'
import {
  RenderDefaultBlockObject,
  RenderDefaultInlineObject,
} from './render.default-object'
import {buildScopedName, findByScope} from './scoped-config-lookup'

export function RenderContainerChild(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextTextBlock | PortableTextObject
  path: Path
}) {
  const editorActor = useContext(EditorActorContext)
  const schema = editorActor.getSnapshot().context.schema
  const containerScope = useContext(ContainerScopeContext)
  const slateStatic = useSlateStatic()
  const elementRef = useRef<HTMLElement>(null)

  const scopedTypeName = buildScopedName(containerScope, props.element._type)

  const containerConfig = useSelector(editorActor, (s) =>
    findByScope(s.context.containerConfigs, scopedTypeName),
  )

  const isInlineObject = isInline(slateStatic, props.path)

  // Inline objects live inside text blocks, so their scope includes '.block.':
  // 'callout.block.stock-ticker' not 'callout.stock-ticker'
  const leafScopedName = isInlineObject
    ? buildScopedName(containerScope, `block.${props.element._type}`)
    : scopedTypeName

  const leafConfig = useSelector(editorActor, (s) =>
    findByScope(s.context.leafConfigs, leafScopedName),
  )

  if (containerConfig) {
    return (
      <RenderContainer
        attributes={props.attributes}
        element={props.element}
        containerConfig={containerConfig}
        path={props.path}
      >
        {props.children}
      </RenderContainer>
    )
  }

  const dataPath = serializePath(props.path)
  const {
    'data-slate-node': _slateNode,
    'data-slate-void': _slateVoid,
    'data-slate-inline': _slateInline,
    'data-pt-path': _ptPath,
    ...baseAttributes
  } = props.attributes

  if (isTextBlock({schema}, props.element)) {
    return (
      <div {...baseAttributes} data-pt-container="" data-pt-path={dataPath}>
        {props.children}
      </div>
    )
  }

  if (isInlineObject) {
    const inlineAttributes = {
      ...baseAttributes,
      'data-pt-leaf': '',
      'data-pt-path': dataPath,
      'contentEditable': false,
    }

    const inlineChildren = (
      <>
        {props.children}
        <span data-pt-spacer={''}>{'\uFEFF'}</span>
      </>
    )

    if (leafConfig) {
      const rendered = leafConfig.leaf.render({
        attributes: inlineAttributes,
        children: inlineChildren,
        node: props.element,
        path: props.path,
      })

      if (rendered !== null) {
        return rendered
      }
    }

    return (
      <span {...inlineAttributes} ref={elementRef}>
        <RenderDefaultInlineObject inlineObject={props.element} />
        {inlineChildren}
      </span>
    )
  }

  const blockObjectAttributes = {
    ...baseAttributes,
    'data-pt-leaf': '',
    'data-pt-path': dataPath,
    'contentEditable': false,
  }

  const blockObjectChildren = (
    <>
      {props.children}
      <div
        data-pt-spacer=""
        style={{
          height: '0',
          color: 'transparent',
          outline: 'none',
          position: 'absolute',
        }}
      >
        <span data-pt-leaf="">
          <span data-pt-zero-width="z" data-pt-length={0}>
            {'\uFEFF'}
          </span>
        </span>
      </div>
    </>
  )

  if (leafConfig) {
    const rendered = leafConfig.leaf.render({
      attributes: blockObjectAttributes,
      children: blockObjectChildren,
      node: props.element,
      path: props.path,
    })

    if (rendered !== null) {
      return rendered
    }
  }

  return (
    <div {...blockObjectAttributes}>
      <RenderDefaultBlockObject blockObject={props.element} />
      {blockObjectChildren}
    </div>
  )
}
