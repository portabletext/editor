import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {higlightMachine} from './highlight-json-machine'
import {PlaygroundActorRef} from './playground-machine'
import {Spinner} from './components/spinner'

export function PortableTextPreview(props: {playgroundRef: PlaygroundActorRef}) {
  const valuePending = useSelector(props.playgroundRef, (s) => s.matches('apply patches'))
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
    <div className="border-2 p-2 shadow-sm text-sm">
      <code>// Portable Text (server)</code>
      {highlightedPortableText ? (
        <div
          style={{opacity: valuePending ? 0.5 : 1}}
          dangerouslySetInnerHTML={{__html: highlightedPortableText}}
        />
      ) : (
        <Spinner />
      )}
    </div>
  )
}
