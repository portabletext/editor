import {portableTextToMarkdown} from '@portabletext/markdown'
import {useSelector} from '@xstate/react'
import {useMemo} from 'react'
import {MarkdownLogo} from '../logos'
import type {PlaygroundActorRef} from '../playground-machine'
import {markdownOptions} from './markdown-options'

export function MarkdownPreview(props: {playgroundRef: PlaygroundActorRef}) {
  const value = useSelector(
    props.playgroundRef,
    (s) => s.context.patchDerivedValue,
  )

  const markdown = useMemo(() => {
    if (!value || value.length === 0) {
      return ''
    }
    return portableTextToMarkdown(value, markdownOptions)
  }, [value])

  if (!value || value.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-2">
        <MarkdownLogo className="size-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          No content yet
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Start typing to see the markdown
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words text-gray-800 dark:text-gray-200">
        {markdown}
      </pre>
    </div>
  )
}
