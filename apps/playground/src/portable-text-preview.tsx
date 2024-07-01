import {Card, Spinner} from '@sanity/ui'
import {useSelector} from '@xstate/react'
import {createActor} from 'xstate'
import {higlightMachine} from './highlight-json-machine'
import {playgroundActor} from './playground-machine'

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
  input: {code: JSON.stringify(playgroundActor.getSnapshot().context.value ?? null)},
})
highlightPortableTextActor.start()

playgroundActor.subscribe((s) => {
  highlightPortableTextActor.send({
    type: 'update code',
    code: JSON.stringify(s.context.value ?? null),
  })
})
