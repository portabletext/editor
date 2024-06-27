import {gray} from '@sanity/color'
import {getTheme_v2, rgba} from '@sanity/ui/theme'
import {createGlobalStyle} from 'styled-components'

const SCROLLBAR_SIZE = 12 // px
const SCROLLBAR_BORDER_SIZE = 4 // px

export const GlobalStyle = createGlobalStyle((props) => {
  const theme = getTheme_v2(props.theme)

  return {
    'html, body, #root': {
      height: '100%',
    },

    'html': {
      backgroundColor: theme.color.bg,
      color: theme.color.fg,
    },

    'body': {
      margin: 0,
      WebkitFontSmoothing: 'antialiased',
      overflow: 'hidden',
    },

    '::-webkit-scrollbar': {
      width: `${SCROLLBAR_SIZE}px`,
      height: `${SCROLLBAR_SIZE}px`,
    },

    '::-webkit-scrollbar-corner': {
      backgroundColor: 'transparent',
    },

    '::-webkit-scrollbar-thumb': {
      backgroundClip: 'content-box',
      backgroundColor: 'var(--card-border-color, ${color.border})',
      border: `${SCROLLBAR_BORDER_SIZE}px solid transparent`,
    },

    '::-webkit-scrollbar-thumb:hover': {
      backgroundColor: `var(--card-muted-fg-color, ${theme.color.muted.fg})`,
    },

    '::-webkit-scrollbar-track': {
      background: 'transparent',
    },

    '*::selection': {
      backgroundColor: rgba(gray[500].hex, theme.color._dark ? 0.3 : 0.2),
    },
  }
})
