import {Card} from '@sanity/ui'
import {EditorActorRef} from './playground-machine'
import {omit} from 'remeda'

type EditorPatch = ReturnType<EditorActorRef['getSnapshot']>['context']['patchesReceived'][number]

export function EditorPatchesPreview(props: {patches: Array<EditorPatch>}) {
  return (
    <Card border padding={2} as="pre">
      {props.patches.map((patch) => (
        <code
          key={patch.id}
          style={{
            color: patch.new ? 'green' : 'unset',
            opacity: patch.origin === 'remote' ? 1 : 0.5,
          }}
        >
          {patch.origin === 'remote' ? '↓' : '↑'}{' '}
          {JSON.stringify(omit(patch, ['id', 'origin', 'new']))}
          {'\n'}
        </code>
      ))}
    </Card>
  )
}
