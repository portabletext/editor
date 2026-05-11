/**
 * Shim for `vitest/browser`.
 *
 * Step definitions in `@portabletext/editor/test/vitest` and the lifted
 * `test-editor.tsx` import `userEvent`, `page`, `expect`, and the
 * `Locator` type from `vitest/browser`. Inside vitest the runtime
 * injects real implementations of these; here we provide just enough
 * surface to drive the editor through gherkin scenarios.
 *
 * Anything unimplemented throws a loud error so that the next missing
 * call site is obvious. Do not catch and ignore.
 */

import userEventLib from '@testing-library/user-event'

/**
 * Minimal subset of vitest/browser's Locator API used by the editor's
 * step definitions and test-editor helper.
 */
export type Locator = {
  element(): Element
  elements(): Array<Element>
  click(): Promise<void>
  first(): Locator
  nth(index: number): Locator
  getByTestId(id: string): Locator
  getByRole(role: string, options?: {name?: string}): Locator
  getByText(text: string): Locator
  locator(selector: string): Locator
}

type Resolver = () => Element[]

function locatorFromResolver(resolver: Resolver, label: string): Locator {
  const resolveAll = (): Element[] => resolver()
  const resolveFirst = (): Element => {
    const list = resolveAll()
    if (list.length === 0) {
      throw new Error(`Locator ${label}: no element found`)
    }
    return list[0]!
  }

  const loc: Locator = {
    element: resolveFirst,
    elements: resolveAll,
    async click() {
      const el = resolveFirst()
      await currentUserEvent().click(el)
    },
    first() {
      return locatorFromResolver(() => {
        const list = resolveAll()
        return list.length > 0 ? [list[0]!] : []
      }, `${label}:first`)
    },
    nth(index: number) {
      return locatorFromResolver(() => {
        const list = resolveAll()
        return index < list.length ? [list[index]!] : []
      }, `${label}:nth(${index})`)
    },
    getByTestId(id: string) {
      return locatorFromResolver(() => {
        const root = resolveFirst()
        return Array.from(root.querySelectorAll(`[data-testid="${id}"]`))
      }, `${label}>>getByTestId(${id})`)
    },
    getByRole(role: string, options?: {name?: string}) {
      return locatorFromResolver(
        () => {
          const root = resolveFirst()
          return queryByRole(root, role, options)
        },
        `${label}>>getByRole(${role}${options?.name ? `, ${options.name}` : ''})`,
      )
    },
    getByText(text: string) {
      return locatorFromResolver(
        () => queryByText(resolveFirst(), text),
        `${label}>>getByText(${text})`,
      )
    },
    locator(selector: string) {
      return locatorFromResolver(
        () => Array.from(resolveFirst().querySelectorAll(selector)),
        `${label}>>locator(${selector})`,
      )
    },
  }

  return loc
}

function queryByRole(
  root: Element | Document,
  role: string,
  options?: {name?: string},
): Element[] {
  // Tiny role mapping that covers what step-definitions / test-editor
  // actually request. `textbox` is the only role used by createTestEditor
  // and PortableTextEditable renders a `[contenteditable] [role="textbox"]`
  // or similar; querySelector covers both ARIA-explicit and implicit.
  let selector = ''
  if (role === 'textbox') {
    selector =
      '[role="textbox"], input[type="text"], textarea, [contenteditable="true"]'
  } else if (role === 'button') {
    selector = '[role="button"], button'
  } else {
    selector = `[role="${role}"]`
  }
  const candidates = Array.from(root.querySelectorAll(selector))
  if (!options?.name) {
    return candidates
  }
  return candidates.filter((el) => {
    const label =
      el.getAttribute('aria-label') ??
      el.getAttribute('aria-labelledby') ??
      el.textContent ??
      ''
    return label.includes(options.name!)
  })
}

function queryByText(root: Element | Document, text: string): Element[] {
  const results: Element[] = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  let node: Node | null = walker.currentNode
  while (node) {
    if (node instanceof Element) {
      const t = node.textContent
      if (t && t.includes(text)) {
        results.push(node)
      }
    }
    node = walker.nextNode()
  }
  return results
}

/**
 * `page` queries from document.body by default and exposes the same
 * locator API.
 */
export const page = {
  getByTestId(id: string): Locator {
    return locatorFromResolver(
      () => Array.from(document.body.querySelectorAll(`[data-testid="${id}"]`)),
      `page.getByTestId(${id})`,
    )
  },
  getByRole(role: string, options?: {name?: string}): Locator {
    return locatorFromResolver(
      () => queryByRole(document.body, role, options),
      `page.getByRole(${role})`,
    )
  },
  getByText(text: string): Locator {
    return locatorFromResolver(
      () => queryByText(document.body, text),
      `page.getByText(${text})`,
    )
  },
  locator(selector: string): Locator {
    return locatorFromResolver(
      () => Array.from(document.body.querySelectorAll(selector)),
      `page.locator(${selector})`,
    )
  },
  /**
   * Scope subsequent queries to a specific container. Used by
   * `vitest-browser-react`'s `render()` result.
   */
  elementLocator(container: Element): Locator {
    return locatorFromResolver(() => [container], 'page.elementLocator')
  },
}

/**
 * Wrap `@testing-library/user-event` so callers can pass either a
 * Locator (vitest/browser style) or an Element. The library's API
 * requires `.setup()` first and takes Elements; we hide both.
 */
type RawUserEvent = ReturnType<typeof userEventLib.setup>

let cached: RawUserEvent | undefined
function currentUserEvent(): RawUserEvent {
  if (!cached) {
    cached = userEventLib.setup({
      // Keep the default key map; vitest/browser's userEvent uses the
      // same `{Enter}`, `{Backspace}`, etc. syntax as testing-library.
    })
  }
  return cached
}

function resolveElement(target: Locator | Element): Element {
  if ((target as Locator).element) {
    return (target as Locator).element()
  }
  return target as Element
}

export const userEvent = {
  async click(target: Locator | Element) {
    const el = resolveElement(target)
    await currentUserEvent().click(el)
  },
  async type(target: Locator | Element, text: string) {
    const el = resolveElement(target)
    // testing-library/user-event focuses the element if needed.
    await currentUserEvent().type(el as HTMLElement, text)
  },
  async keyboard(text: string) {
    await currentUserEvent().keyboard(text)
  },
  async tab() {
    await currentUserEvent().tab()
  },
  async cut() {
    if (!currentUserEvent().cut) {
      throw new Error('Not implemented: userEvent.cut')
    }
    await currentUserEvent().cut()
  },
}

// Re-export expect from the value-matcher shim so callers that import
// `expect` from `vitest/browser` (for the element matchers) get the
// same surface. `expect.element(...)` is defined there.
export {expect} from './vitest-shim'
