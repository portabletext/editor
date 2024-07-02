import {PortableTextBlock} from '@sanity/types'
import {Card, Spinner} from '@sanity/ui'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
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
    <Card border padding={2} data-testid={`${props.editorId}-value`}>
      <code>// Editor Portable Text</code>
      {highlightedPortableText ? (
        <div dangerouslySetInnerHTML={{__html: highlightedPortableText}} />
      ) : (
        <Spinner />
      )}
    </Card>
  )
}
