import {useEditor, useEditorSelector} from '@portabletext/editor'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {Spinner} from './components/spinner'
import {higlightMachine} from './highlight-json-machine'
import type {EditorActorRef} from './playground-machine'

export function ValuePreview(props: {editorId: EditorActorRef['id']}) {
  const highlightActor = useActorRef(higlightMachine, {
    input: {code: ''},
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
    <div data-testid={`${props.editorId}-value`}>
      {highlightedValue ? (
        <div dangerouslySetInnerHTML={{__html: highlightedValue}} />
      ) : (
        <Spinner />
      )}
    </div>
  )
}
