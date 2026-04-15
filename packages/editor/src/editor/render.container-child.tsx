import type {
  PortableTextObject,
  PortableTextTextBlock,
} from '@portabletext/schema'
import {isTextBlock} from '@portabletext/schema'
import {useSelector} from '@xstate/react'
import {useContext, type ReactElement} from 'react'
import type {RenderElementProps} from '../slate/react/components/editable'
import {EditorActorContext} from './editor-actor-context'
import {RenderDefaultBlockObject} from './render.default-object'

export function RenderContainerChild(props: {
  attributes: RenderElementProps['attributes']
  children: ReactElement
  element: PortableTextTextBlock | PortableTextObject
  readOnly: boolean
}) {
  const editorActor = useContext(EditorActorContext)
  const schema = useSelector(editorActor, (s) => s.context.schema)

  const {
    'data-slate-node': _,
    'data-slate-void': _void,
    ...rest
  } = props.attributes

  if (isTextBlock({schema}, props.element)) {
    return (
      <div {...rest} data-pt-container="">
        {props.children}
      </div>
    )
  }

  return (
    <div {...rest} data-pt-leaf="">
      {props.children}
      <div contentEditable={false} draggable={!props.readOnly}>
        <RenderDefaultBlockObject
          blockObject={{
            _key: props.element._key,
            _type: props.element._type,
          }}
        />
      </div>
    </div>
  )
}
