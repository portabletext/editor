import {createRootRoute, Link, Outlet} from '@tanstack/react-router'
import {Footer} from '../footer'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
})

function RootComponent() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <Outlet />
      <Footer />
    </div>
  )
}

function NotFoundComponent() {
  return (
    <div className="flex flex-col min-h-screen overflow-x-hidden">
      <main className="flex-1 flex flex-col items-center justify-center gap-2 px-3 md:px-4 py-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Page not found.
        </p>
        <Link
          to="/"
          className="text-sm text-blue-600 dark:text-blue-400 underline underline-offset-2"
        >
          Back to the playground
        </Link>
      </main>
      <Footer />
    </div>
  )
}
