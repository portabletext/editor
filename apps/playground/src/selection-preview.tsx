import {usePortableTextEditorSelection} from '@portabletext/editor'
import {Card, Spinner} from '@sanity/ui'
import {useActorRef, useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {higlightMachine} from './highlight-json-machine'

export function SelectionPreview() {
  const highlightSelectionActor = useActorRef(higlightMachine, {input: {code: ''}})
  const selection = usePortableTextEditorSelection()

  useEffect(() => {
    highlightSelectionActor.send({type: 'update code', code: JSON.stringify(selection)})
  }, [highlightSelectionActor, selection])

  const highlightedSelection = useSelector(
    highlightSelectionActor,
    (s) => s.context.highlightedCode,
  )

  return (
    <Card border padding={2}>
      <code>// Editor selection</code>
      {highlightedSelection ? (
        <div dangerouslySetInnerHTML={{__html: highlightedSelection}} />
      ) : (
        <Spinner />
      )}
    </Card>
  )
}
