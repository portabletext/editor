import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {Container} from './components/container'
import {Spinner} from './components/spinner'
import {highlightMachine} from './highlight-json-machine'
import type {PlaygroundActorRef} from './playground-machine'

export function PortableTextPreview(props: {
  playgroundRef: PlaygroundActorRef
}) {
  const highlightRef = useActorRef(highlightMachine, {
    input: {
      code: JSON.stringify(
        props.playgroundRef.getSnapshot().context.value ?? null,
      ),
      variant: 'ghost',
    },
  })
  const highlightedPortableText = useSelector(
    highlightRef,
    (s) => s.context.highlightedCode,
  )

  useEffect(() => {
    props.playgroundRef.subscribe((s) => {
      highlightRef.send({
        type: 'update code',
        code: JSON.stringify(s.context.value ?? null),
      })
    })
  }, [props.playgroundRef, highlightRef])

  return (
    <>
      {highlightedPortableText ? (
        <Container
          variant="ghost"
          className="[&>pre]:max-h-none"
          dangerouslySetInnerHTML={{__html: highlightedPortableText}}
        />
      ) : (
        <Spinner />
      )}
    </>
  )
}
