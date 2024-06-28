import {Card, Flex, Grid, ThemeProvider, usePrefersDark} from '@sanity/ui'
import {buildTheme} from '@sanity/ui/theme'
import {Editor} from './editor'
import {GlobalStyle} from './global-style'
import {PortableTextPreview} from './portable-text-preview'

const theme = buildTheme()

export function App() {
  const prefersDark = usePrefersDark()

  return (
    <ThemeProvider theme={theme} scheme={prefersDark ? 'dark' : 'light'}>
      <GlobalStyle />
      <Card height="fill">
        <Grid columns={[1, 2]} gap={2} padding={2} style={{alignItems: 'start'}}>
          <Flex direction="column" gap={2}>
            <Editor tone="positive" />
            <Editor tone="caution" />
          </Flex>
          <PortableTextPreview />
        </Grid>
      </Card>
    </ThemeProvider>
  )
}
