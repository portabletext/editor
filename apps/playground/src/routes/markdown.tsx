import {createFileRoute} from '@tanstack/react-router'
import {useState} from 'react'
import {MarkdownLoopPage} from '../markdown-loop/page'
import {
  getMarkdownLoopPreset,
  type MarkdownLoopPresetId,
} from '../markdown-loop/presets'
import {PageNav} from '../page-nav'

export const Route = createFileRoute('/markdown')({
  component: MarkdownRoute,
})

function MarkdownRoute() {
  const [presetId, setPresetId] = useState<MarkdownLoopPresetId>('canonical')
  const preset = getMarkdownLoopPreset(presetId)

  return (
    <>
      <header className="flex items-center gap-3 px-3 md:px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <PageNav />
      </header>
      <MarkdownLoopPage
        key={presetId}
        preset={preset}
        onPresetChange={setPresetId}
      />
    </>
  )
}
