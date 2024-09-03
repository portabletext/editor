import {PortableTextBlock} from '@sanity/types'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {Spinner} from './components/spinner'
import {higlightMachine} from './highlight-json-machine'
import {EditorActorRef} from './playground-machine'

export function EditorPortableTextPreview(props: {
  editorId: EditorActorRef['id']
  value: Array<PortableTextBlock> | undefined
}) {
  const highlightedPortableTextRef = useActorRef(higlightMachine, {
    input: {code: JSON.stringify(props.value ?? null)},
  })
  const highlightedPortableText = useSelector(
    highlightedPortableTextRef,
    (s) => s.context.highlightedCode,
  )

  useEffect(() => {
    highlightedPortableTextRef.send({
      type: 'update code',
      code: JSON.stringify(props.value ?? null),
    })
  }, [props.value, highlightedPortableTextRef])

  return (
    <div data-testid={`${props.editorId}-value`}>
      {highlightedPortableText ? (
        <div dangerouslySetInnerHTML={{__html: highlightedPortableText}} />
      ) : (
        <Spinner />
      )}
    </div>
  )
}
