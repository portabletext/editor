import {createRouter, RouterProvider} from '@tanstack/react-router'
import React from 'react'
import ReactDOM from 'react-dom/client'
import {routeTree} from './routeTree.gen'
import {ThemeProvider} from './theme-context.tsx'

const router = createRouter({routeTree})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
)
