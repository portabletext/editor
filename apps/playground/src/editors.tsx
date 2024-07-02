import {AddIcon} from '@sanity/icons'
import {Button, Card, Flex, Grid} from '@sanity/ui'
import {PlaygroundActorRef} from './playground-machine'
import {useSelector} from '@xstate/react'
import {PortableTextPreview} from './portable-text-preview'
import {Editor} from './editor'

export function Editors(props: {playgroundRef: PlaygroundActorRef}) {
  const editors = useSelector(props.playgroundRef, (s) => s.context.editors)

  return (
    <Card height="fill" padding={2}>
      <Flex direction="column" gap={2}>
        <Button
          mode="ghost"
          style={{alignSelf: 'flex-start'}}
          icon={AddIcon}
          text="Add editor"
          onClick={() => {
            props.playgroundRef.send({type: 'add editor'})
          }}
        />
        <Grid columns={[1, 2]} gap={2} style={{alignItems: 'start'}}>
          <Flex direction="column" gap={2}>
            {editors.map((editor) => (
              <Editor key={editor.id} editorRef={editor} />
            ))}
          </Flex>
          <PortableTextPreview playgroundRef={props.playgroundRef} />
        </Grid>
      </Flex>
    </Card>
  )
}
