import {useSelector} from '@xstate/react'
import {PlusIcon} from 'lucide-react'
import {TooltipTrigger} from 'react-aria-components'
import {Editor} from './editor'
import type {PlaygroundActorRef} from './playground-machine'
import {PortableTextPreview} from './portable-text-preview'
import {Button} from './primitives/button'
import {Switch} from './primitives/switch'
import {Tooltip} from './primitives/tooltip'

export function Editors(props: {playgroundRef: PlaygroundActorRef}) {
  const showPortableTextPreview = useSelector(props.playgroundRef, (s) =>
    s.matches('value shown'),
  )
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors)
  const rangeDecorations = useSelector(
    props.playgroundRef,
    (s) => s.context.rangeDecorations,
  )

  return (
    <div className="p-2 md:p-4 flex flex-col gap-2 md:gap-4">
      <div className="flex items-center gap-4">
        <Button
          size="sm"
          variant="secondary"
          onPress={() => {
            props.playgroundRef.send({type: 'add editor'})
          }}
        >
          <PlusIcon className="w-4 h-4" /> Add editor
        </Button>
        <TooltipTrigger>
          <Switch
            isSelected={showPortableTextPreview}
            onChange={() => {
              props.playgroundRef.send({type: 'toggle value'})
            }}
          >
            Portable Text
          </Switch>
          <Tooltip>Toggle Portable Text</Tooltip>
        </TooltipTrigger>
      </div>
      <div
        className={`grid gap-4 items-start grid-cols-1 ${showPortableTextPreview ? 'md:grid-cols-3' : ''}`}
      >
        <div className="flex flex-col gap-2 md:gap-4 md:col-span-2">
          <div className="flex flex-col gap-6">
            {editors.map((editor) => (
              <Editor
                key={editor.id}
                editorRef={editor}
                rangeDecorations={rangeDecorations}
              />
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
