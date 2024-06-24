import {ThemeProvider} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {Editor} from './editor'

export function App() {
  return (
    <ThemeProvider theme={buildTheme()}>
      <Editor />
    </ThemeProvider>
  )
}
