import {omit} from 'remeda'
import {tv} from 'tailwind-variants'
import type {EditorActorRef} from './playground-machine'
import {Container} from './primitives/container'

type EditorPatch = ReturnType<
  EditorActorRef['getSnapshot']
>['context']['patchesReceived'][number]

const patchVariants = tv({
  variants: {
    age: {
      new: 'text-emerald-600',
      old: 'text-slate-600',
    },
    origin: {
      local: 'opacity-50',
      remote: '',
    },
  },
})

export function EditorPatchesPreview(props: {patches: Array<EditorPatch>}) {
  if (props.patches.length === 0) {
    return (
      <Container>
        <pre>null</pre>
      </Container>
    )
  }

  return (
    <Container>
      <pre>
        {props.patches.map((patch) => (
          <code
            key={patch.id}
            className={patchVariants({
              age: patch.new ? 'new' : 'old',
              origin: patch.origin === 'remote' ? 'remote' : 'local',
            })}
          >
            {patch.origin === 'remote' ? '↓' : '↑'}{' '}
            {JSON.stringify(omit(patch, ['id', 'origin', 'new']))}
            {'\n'}
          </code>
        ))}
      </pre>
    </Container>
  )
}
