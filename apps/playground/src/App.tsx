import {Card, ThemeProvider, usePrefersDark} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {Editor} from './editor'
import {GlobalStyle} from './global-style'

const theme = buildTheme()

export function App() {
  const prefersDark = usePrefersDark()

  return (
    <ThemeProvider theme={theme} scheme={prefersDark ? 'dark' : 'light'}>
      <GlobalStyle />
      <Card height="fill">
        <Editor />
      </Card>
    </ThemeProvider>
  )
}
