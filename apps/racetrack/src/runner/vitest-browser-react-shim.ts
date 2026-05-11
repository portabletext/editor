/**
 * Shim for `vitest-browser-react`.
 *
 * Replaces the package's `render()` with a plain React 19 createRoot
 * mount. `createTestEditor` in
 * `@portabletext/editor/test/vitest/test-editor.tsx` calls `render(ui)`
 * and expects back something with at least `.rerender(newUi)` and
 * matching `page.elementLocator(container)` behavior.
 *
 * This shim is intentionally tiny. If `createTestEditor` ever starts
 * using `.unmount`, `.debug`, `.asFragment` or query helpers off the
 * render result, add them here.
 */

import {createRoot, type Root} from 'react-dom/client'
import {page, type Locator} from './vitest-browser-shim'

type RenderResult = {
  container: Element
  baseElement: Element
  locator: Locator
  unmount: () => Promise<void>
  rerender: (newUi: React.ReactNode) => Promise<void>
}

const mountedContainers = new Set<Element>()
const mountedRoots: Array<{container: Element; root: Root}> = []

export async function render(
  ui: React.ReactNode,
  options: {container?: Element; baseElement?: Element} = {},
): Promise<RenderResult> {
  // Prefer a Racetrack-supplied target so the test editor renders inside
  // the right panel rather than free-floating in document.body.
  const target = document.querySelector('[data-racetrack-test-target]')
  const baseElement =
    options.baseElement ??
    (target instanceof HTMLElement ? target : document.body)
  let container = options.container
  if (!container) {
    container = baseElement.appendChild(document.createElement('div'))
  }

  let root: Root
  const existing = mountedRoots.find((entry) => entry.container === container)
  if (existing) {
    root = existing.root
  } else {
    root = createRoot(container)
    mountedRoots.push({container, root})
    mountedContainers.add(container)
  }

  root.render(ui as React.ReactNode)
  // Yield once so React commits before the caller queries the DOM.
  await new Promise((resolve) => setTimeout(resolve, 0))

  const locator = page.elementLocator(container)

  return {
    container,
    baseElement,
    locator,
    async unmount() {
      root.unmount()
      if (container && container.parentNode) {
        container.parentNode.removeChild(container)
      }
      await Promise.resolve()
    },
    async rerender(newUi: React.ReactNode) {
      root.render(newUi as React.ReactNode)
      await new Promise((resolve) => setTimeout(resolve, 0))
    },
  }
}

export async function cleanup(): Promise<void> {
  for (const {root, container} of mountedRoots) {
    root.unmount()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  }
  mountedRoots.length = 0
  mountedContainers.clear()
  await Promise.resolve()
}

export function renderHook(): never {
  throw new Error('Not implemented: vitest-browser-react.renderHook')
}
