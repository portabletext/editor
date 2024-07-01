import {Button, Card, Flex, Grid, ThemeProvider, usePrefersDark} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {useSelector} from '@xstate/react'
import {Editor} from './editor'
import {GlobalStyle} from './global-style'
import {playgroundActor} from './playground-machine'
import {PortableTextPreview} from './portable-text-preview'
import {AddIcon} from '@sanity/icons'

const theme = buildTheme()

export function App() {
  const prefersDark = usePrefersDark()
  const editors = useSelector(playgroundActor, (s) => s.context.editors)

  return (
    <ThemeProvider theme={theme} scheme={prefersDark ? 'dark' : 'light'}>
      <GlobalStyle />
      <Card height="fill" padding={2}>
        <Flex direction="column" gap={2}>
          <Button
            mode="ghost"
            style={{alignSelf: 'flex-start'}}
            icon={AddIcon}
            text="Add editor"
            onClick={() => {
              playgroundActor.send({type: 'add editor'})
            }}
          />
          <Grid columns={[1, 2]} gap={2} style={{alignItems: 'start'}}>
            <Flex direction="column" gap={2}>
              {editors.map((editor) => (
                <Editor key={editor.id} editorRef={editor} />
              ))}
            </Flex>
            <PortableTextPreview />
          </Grid>
        </Flex>
      </Card>
    </ThemeProvider>
  )
}
