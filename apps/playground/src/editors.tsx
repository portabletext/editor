import {useSelector} from '@xstate/react'
import {ChevronsLeftIcon, ChevronsRightIcon, PlusIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {Button} from './components/button'
import {Tooltip} from './components/tooltip'
import {Editor} from './editor'
import {PlaygroundActorRef} from './playground-machine'
import {PortableTextPreview} from './portable-text-preview'

export function Editors(props: {playgroundRef: PlaygroundActorRef}) {
  const showPortableTextPreview = useSelector(props.playgroundRef, (s) =>
    s.matches('value shown'),
  )
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors)

  return (
    <div className="p-2 md:p-4 flex flex-col gap-2 md:gap-4">
      <div className="flex items-center justify-between gap-4">
        <Button
          size="sm"
          variant="primary"
          className="self-start"
          onPress={() => {
            props.playgroundRef.send({type: 'add editor'})
          }}
        >
          <PlusIcon className="w-4 h-4" /> Add editor
        </Button>
        <div className="text-sm flex gap-2 items-center">
          Portable Text
          <TooltipTrigger>
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
                props.playgroundRef.send({type: 'toggle value'})
              }}
            >
              {showPortableTextPreview ? (
                <ChevronsRightIcon className="size-4" />
              ) : (
                <ChevronsLeftIcon className="size-4" />
              )}
            </Button>
            <Tooltip>
              {showPortableTextPreview
                ? 'Hide Portable Text'
                : 'Show Portable Text'}
            </Tooltip>
          </TooltipTrigger>
        </div>
      </div>
      <div
        className={`grid gap-4 items-start grid-cols-1 ${showPortableTextPreview ? 'md:grid-cols-3' : ''}`}
      >
        <div className="flex flex-col gap-2 md:gap-4 md:col-span-2">
          <div className="flex flex-col gap-4">
            {editors.map((editor) => (
              <Editor key={editor.id} editorRef={editor} />
            ))}
          </div>
        </div>
        {showPortableTextPreview ? (
          <PortableTextPreview playgroundRef={props.playgroundRef} />
        ) : null}
      </div>
    </div>
  )
}
