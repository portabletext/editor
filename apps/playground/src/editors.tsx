import {PlusIcon} from 'lucide-react'
import {PlaygroundActorRef} from './playground-machine'
import {useSelector} from '@xstate/react'
import {PortableTextPreview} from './portable-text-preview'
import {Editor} from './editor'
import {Button} from './components/button'

export function Editors(props: {playgroundRef: PlaygroundActorRef}) {
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors)

  return (
    <div className="p-4">
      <div className="flex flex-col gap-4">
        <Button
          variant="primary"
          className="self-start"
          onPress={() => {
            props.playgroundRef.send({type: 'add editor'})
          }}
        >
          <PlusIcon className="w-4 h-4" /> Add editor
        </Button>
        <div className="grid gap-4 items-start md:grid-cols-2">
          <div className="flex flex-col gap-4">
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
