import {createFileRoute} from '@tanstack/react-router'
import {MarkdownLoopPage} from '../markdown-loop/page'
import {PageNav} from '../page-nav'

export const Route = createFileRoute('/markdown')({
  component: MarkdownRoute,
})

function MarkdownRoute() {
  return (
    <>
      <header className="flex items-center px-3 md:px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <PageNav />
      </header>
      <MarkdownLoopPage />
    </>
  )
}
