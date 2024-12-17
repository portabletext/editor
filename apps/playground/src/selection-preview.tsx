import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {Spinner} from './components/spinner'
import {higlightMachine} from './highlight-json-machine'
import type {EditorActorRef} from './playground-machine'

export function SelectionPreview(props: {editorId: EditorActorRef['id']}) {
  const highlightSelectionActor = useActorRef(higlightMachine, {
    input: {code: ''},
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
    <div data-testid={`${props.editorId}-selection`}>
      {highlightedSelection ? (
        <div dangerouslySetInnerHTML={{__html: highlightedSelection}} />
      ) : (
        <Spinner />
      )}
    </div>
  )
}
