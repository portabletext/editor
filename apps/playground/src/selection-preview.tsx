import {usePortableTextEditorSelection} from '@portabletext/editor'
import {Card, Spinner} from '@sanity/ui'
import {useSelector} from '@xstate/react'
import {useEffect} from 'react'
import {createActor} from 'xstate'
import {higlightMachine} from './highlight-json-machine'

export function SelectionPreview() {
  const selection = usePortableTextEditorSelection()

  useEffect(() => {
    highlightSelectionActor.send({type: 'update code', code: JSON.stringify(selection)})
  }, [selection])

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

const highlightSelectionActor = createActor(higlightMachine, {
  input: {code: ''},
})
highlightSelectionActor.start()
