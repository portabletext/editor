import {useSelector} from '@xstate/react'
import {PlusIcon} from 'lucide-react'
import {Button} from './components/button'
import {Editor} from './editor'
import {PlaygroundActorRef} from './playground-machine'
import {PortableTextPreview} from './portable-text-preview'

export function Editors(props: {playgroundRef: PlaygroundActorRef}) {
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors)

  return (
    <div className="p-2 md:p-4">
      <div className="flex flex-col gap-2 md:gap-4">
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
        <div className="grid gap-4 items-start grid-cols-1 md:grid-cols-3">
          <div className="flex flex-col gap-4 md:col-span-2">
            {editors.map((editor) => (
              <Editor key={editor.id} editorRef={editor} />
            ))}
          </div>
          <PortableTextPreview playgroundRef={props.playgroundRef} />
        </div>
      </div>
    </div>
  )
}
