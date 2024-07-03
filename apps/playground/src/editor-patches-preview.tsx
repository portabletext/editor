import {omit} from 'remeda'
import {EditorActorRef} from './playground-machine'
import {tv} from 'tailwind-variants'

type EditorPatch = ReturnType<EditorActorRef['getSnapshot']>['context']['patchesReceived'][number]

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
  return (
    <div className="border p-2 text-sm">
      <code>// Editor patches</code>
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
    </div>
  )
}
