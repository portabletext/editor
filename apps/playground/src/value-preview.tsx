import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {highlightMachine} from './highlight-json-machine'
import type {EditorActorRef} from './playground-machine'
import {Container} from './primitives/container'
import {Spinner} from './primitives/spinner'

export function ValuePreview(props: {editorId: EditorActorRef['id']}) {
  const highlightActor = useActorRef(highlightMachine, {
    input: {code: '', variant: 'default'},
  })
  const editor = useEditor()
  const value = useEditorSelector(editor, (snapshot) => snapshot.context.value)

  useEffect(() => {
    highlightActor.send({
      type: 'update code',
      code: JSON.stringify(value),
    })
  }, [highlightActor, value])

  const highlightedValue = useSelector(
    highlightActor,
    (s) => s.context.highlightedCode,
  )

  return (
    <Container variant="ghost" data-testid={`${props.editorId}-value`}>
      {highlightedValue ? (
        <div
          className="[&>pre]:max-h-56"
          dangerouslySetInnerHTML={{__html: highlightedValue}}
        />
      ) : (
        <Spinner />
      )}
    </Container>
  )
}
