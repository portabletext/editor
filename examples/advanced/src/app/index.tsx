import {App} from '@/app/app'
import {Theme, ThemeProvider} from '@/components/theme-provider'
import React from 'react'
import ReactDOM from 'react-dom/client'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme={Theme.Dark} storageKey="theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
