import {PortableText} from '@portabletext/react'
import {useSelector} from '@xstate/react'
import {ReactLogo} from '../logos'
import type {PlaygroundActorRef} from '../playground-machine'
import {portableTextComponents} from './portable-text-components'

export function ReactPreview(props: {playgroundRef: PlaygroundActorRef}) {
  const value = useSelector(
    props.playgroundRef,
    (s) => s.context.patchDerivedValue,
  )

  if (!value || value.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <ReactLogo className="size-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No content yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Start typing to see the preview
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <PortableText value={value} components={portableTextComponents} />
      </div>
    </div>
  )
}
