import {tv} from 'tailwind-variants'
import type {EditorActorRef} from './playground-machine'

type EditorPatch = ReturnType<
  EditorActorRef['getSnapshot']
>['context']['patchesReceived'][number]

const patchEntryStyle = tv({
  base: 'p-2 rounded-md border transition-colors',
  variants: {
    isNew: {
      true: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
      false:
        'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
    },
    origin: {
      local: 'opacity-60',
      remote: '',
    },
  },
})

const typeBadgeStyle = tv({
  base: 'px-1.5 py-0.5 rounded text-xs font-medium',
  variants: {
    type: {
      set: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      unset: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
      insert:
        'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300',
      diffMatchPatch:
        'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
      default: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300',
    },
  },
})

const originBadgeStyle = tv({
  base: 'px-1.5 py-0.5 rounded text-xs font-medium',
  variants: {
    origin: {
      local:
        'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
      remote:
        'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300',
    },
  },
})

function getPatchType(patch: EditorPatch): string {
  return patch.type
}

function getPatchValue(patch: EditorPatch): unknown {
  if ('value' in patch) {
    return patch.value
  }
  if ('items' in patch) {
    return patch.items
  }
  if ('patch' in patch) {
    return patch.patch
  }
  return undefined
}

export function EditorPatchesPreview(props: {patches: Array<EditorPatch>}) {
  if (props.patches.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 italic p-2">
        No patches yet
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto">
      {props.patches.map((patch) => {
        const type = getPatchType(patch)
        const value = getPatchValue(patch)
        const origin = patch.origin === 'remote' ? 'remote' : 'local'

        return (
          <div
            key={patch.id}
            className={patchEntryStyle({isNew: patch.new, origin})}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={typeBadgeStyle({
                  type: type as
                    | 'set'
                    | 'unset'
                    | 'insert'
                    | 'diffMatchPatch'
                    | 'default',
                })}
              >
                {type}
              </span>
              <span className={originBadgeStyle({origin})}>
                {origin === 'remote' ? '↓ remote' : '↑ local'}
              </span>
            </div>
            <div className="text-xs font-mono text-gray-600 dark:text-gray-400">
              <span className="text-gray-400 dark:text-gray-500">path:</span>{' '}
              {JSON.stringify(patch.path)}
            </div>
            {value !== undefined && (
              <div className="text-xs font-mono text-gray-600 dark:text-gray-400 truncate">
                <span className="text-gray-400 dark:text-gray-500">value:</span>{' '}
                {JSON.stringify(value)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
