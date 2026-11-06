import type {ReactNode} from 'react'
import type {PortableTextPluginsProps} from 'sanity'
import {TestEditorHandlePlugins} from './test-editor-handle'
import {TestHighlightsPlugin} from './test-highlights'

/**
 * Composes the Studio's test-only PT plugins: the manual multiplayer
 * highlights toolbar wrapping the Playwright editor handle.
 */
export function TestPortableTextPlugins(
  props: PortableTextPluginsProps,
): ReactNode {
  return (
    <TestHighlightsPlugin
      {...props}
      renderDefault={() => (
        <TestEditorHandlePlugins
          renderDefault={() => props.renderDefault(props)}
        />
      )}
    />
  )
}
