import React from 'react'
import ReactDOM from 'react-dom/client'
import {ThemeProvider} from '../theme-context.tsx'
import {Deck} from './Deck.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <Deck />
    </ThemeProvider>
  </React.StrictMode>,
)
