import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {Spinner} from './components/spinner'
import {higlightMachine} from './highlight-json-machine'
import {PlaygroundActorRef} from './playground-machine'

export function PortableTextPreview(props: {playgroundRef: PlaygroundActorRef}) {
  const highlightRef = useActorRef(higlightMachine, {
    input: {code: JSON.stringify(props.playgroundRef.getSnapshot().context.value ?? null)},
  })
  const highlightedPortableText = useSelector(highlightRef, (s) => s.context.highlightedCode)

  useEffect(() => {
    props.playgroundRef.subscribe((s) => {
      highlightRef.send({type: 'update code', code: JSON.stringify(s.context.value ?? null)})
    })
  }, [props.playgroundRef, highlightRef])

  return (
    <>
      {highlightedPortableText ? (
        <div
          className="[&>pre]:max-h-none"
          dangerouslySetInnerHTML={{__html: highlightedPortableText}}
        />
      ) : (
        <Spinner />
      )}
    </>
  )
}
