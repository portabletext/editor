import {ThemeProvider, usePrefersDark} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {useActorRef} from '@xstate/react'
import {Editors} from './editors'
import {generateColor} from './generate-color'
import {GlobalStyle} from './global-style'
import {playgroundMachine} from './playground-machine'
import {editorIdGenerator} from './editor-id-generator'

const theme = buildTheme()

export function App() {
  const prefersDark = usePrefersDark()
  const playgroundRef = useActorRef(playgroundMachine, {
    input: {colorGenerator: generateColor('100'), editorIdGenerator: editorIdGenerator()},
  })

  return (
    <ThemeProvider theme={theme} scheme={prefersDark ? 'dark' : 'light'}>
      <GlobalStyle />
      <Editors playgroundRef={playgroundRef} />
    </ThemeProvider>
  )
}
