import {Card, Spinner} from '@sanity/ui'
import {useSelector} from '@xstate/react'
import {createActor} from 'xstate'
import {editorActor} from './editor-actor'
import {higlightMachine} from './highlight-json-machine'

export function PortableTextPreview() {
  const highlightedPortableText = useSelector(
    highlightPortableTextActor,
    (s) => s.context.highlightedCode,
  )

  return (
    <Card border padding={2}>
      <code>// Portable Text</code>
      {highlightedPortableText ? (
        <div dangerouslySetInnerHTML={{__html: highlightedPortableText}} />
      ) : (
        <Spinner />
      )}
    </Card>
  )
}

const highlightPortableTextActor = createActor(higlightMachine, {
  input: {code: JSON.stringify(editorActor.getSnapshot().context.value)},
})
highlightPortableTextActor.start()

editorActor.subscribe((s) => {
  highlightPortableTextActor.send({type: 'update code', code: JSON.stringify(s.context.value)})
})
