import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {Container} from './components/container'
import {Spinner} from './components/spinner'
import {highlightMachine} from './highlight-json-machine'
import type {EditorActorRef} from './playground-machine'

export function SelectionPreview(props: {editorId: EditorActorRef['id']}) {
  const highlightSelectionActor = useActorRef(highlightMachine, {
    input: {code: '', variant: 'default'},
  })
  const editor = useEditor()
  const selection = useEditorSelector(
    editor,
    (snapshot) => snapshot.context.selection,
  )

  useEffect(() => {
    highlightSelectionActor.send({
      type: 'update code',
      code: JSON.stringify(selection),
    })
  }, [highlightSelectionActor, selection])

  const highlightedSelection = useSelector(
    highlightSelectionActor,
    (s) => s.context.highlightedCode,
  )

  return (
    <Container variant="ghost" data-testid={`${props.editorId}-selection`}>
      {highlightedSelection ? (
        <div
          className="[&>pre]:max-h-56"
          dangerouslySetInnerHTML={{__html: highlightedSelection}}
        />
      ) : (
        <Spinner />
      )}
    </Container>
  )
}
