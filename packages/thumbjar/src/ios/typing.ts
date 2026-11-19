import {mkdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import type {TestContext} from 'vitest'
import {remote} from 'webdriverio'
import {prefixedPageUrl} from '../device/page-url.ts'
import {slug} from '../driver.ts'
import {FOCUS_FIELD} from '../gboard/field.ts'
import {
  nestedCompositionstart,
  outDir,
  type TypeOnDeviceOptions,
  type Typed,
} from '../gboard/typing.ts'
import type {PageEvent} from '../steps.ts'
import {safariCapabilities} from './capabilities.ts'
import {tapLanded} from './tap-landed.ts'

type PageState = {text: string | null; events: PageEvent[]; state?: unknown}

export async function typeOnSimulator(
  context: TestContext,
  options: TypeOnDeviceOptions,
): Promise<Typed> {
  context.signal.throwIfAborted()
  const directory = outDir()
  mkdirSync(directory, {recursive: true})
  const artifact = join(
    directory,
    `${options.keyboard}-${slug(context.task.name)}`,
  )
  const result: Record<string, unknown> = {options, droppedFirstTaps: 0}
  let browser!: Awaited<ReturnType<typeof remote>>
  let webContext = ''
  async function web() {
    context.signal.throwIfAborted()
    if (!webContext) {
      const contexts = (await browser.getContexts()) as Array<
        string | {id: string}
      >
      const ids = contexts.map((entry) =>
        typeof entry === 'string' ? entry : entry.id,
      )
      webContext = ids.find((id) => id.startsWith('WEBVIEW')) ?? ''
    }
    await browser.switchContext(webContext)
  }
  async function native() {
    context.signal.throwIfAborted()
    await browser.switchContext('NATIVE_APP')
  }
  async function state(): Promise<PageState> {
    await web()
    const serialized: unknown = await browser.execute(
      'return JSON.stringify(window.__state())',
    )
    if (typeof serialized !== 'string') {
      throw new Error('Safari returned no serialized page state')
    }
    return JSON.parse(serialized)
  }
  async function tap(name: string) {
    await native()
    const key = browser.$(
      `-ios predicate string:(type == "XCUIElementTypeKey" OR type == "XCUIElementTypeButton") AND name ==[c] ${JSON.stringify(name)}`,
    )
    await key.waitForExist({timeout: 5000})
    await key.click()
  }
  async function waitForTap(before: PageState): Promise<boolean> {
    const deadline = Date.now() + 1000
    do {
      if (tapLanded(before, await state())) {
        return true
      }
      await browser.pause(100)
    } while (Date.now() < deadline)
    return false
  }
  try {
    browser = await remote({
      hostname: '127.0.0.1',
      port: 4723,
      logLevel: 'warn',
      connectionRetryTimeout: 600_000,
      capabilities: safariCapabilities(),
    })
    await web()
    await browser.url(prefixedPageUrl(options.url, options.prefix))
    await browser.$('[contenteditable="true"]').waitForExist({timeout: 20_000})
    await browser.$('[contenteditable="true"]').click()
    await native()
    const keyboard = browser.$('//XCUIElementTypeKeyboard')
    try {
      await keyboard.waitForExist({timeout: 15_000})
    } catch {
      await browser
        .$('(//XCUIElementTypeWebView//XCUIElementTypeTextView)[1]')
        .click()
      await keyboard.waitForExist({timeout: 15_000})
    }
    await web()
    await browser.execute(`return ${FOCUS_FIELD}`)
    await native()
    for (let attempt = 0; attempt < 5; attempt++) {
      const japanese =
        (await browser
          .$(
            '-ios predicate string:type == "XCUIElementTypeKey" AND name == "delete"',
          )
          .getAttribute('label')) === '削除'
      if (japanese === (options.keyboard === 'ja')) {
        break
      }
      await tap('Next keyboard')
    }
    await browser.waitUntil(
      async () => {
        const label = await browser
          .$(
            '-ios predicate string:type == "XCUIElementTypeKey" AND name == "delete"',
          )
          .getAttribute('label')
        return options.keyboard === 'ja' ? label === '削除' : label !== '削除'
      },
      {timeout: 5000},
    )
    const picked: string[] = []
    const compositionstartPerWord: number[] = []
    let previousEvents = (await state()).events.length
    for (const word of options.words) {
      if (word.letters.length > 0) {
        const beforeTap = await state()
        await tap(word.letters[0]!)
        if (!(await waitForTap(beforeTap))) {
          result.droppedFirstTaps = Number(result.droppedFirstTaps) + 1
          await tap(word.letters[0]!)
        }
        for (const letter of word.letters.slice(1)) {
          await tap(letter)
        }
      }
      await native()
      const candidate =
        word.candidate === undefined
          ? undefined
          : browser.$(
              `-ios predicate string:type == "XCUIElementTypeCell" AND name == ${JSON.stringify(word.candidate)}`,
            )
      if (candidate && (await candidate.isExisting())) {
        await candidate.click()
        picked.push(word.candidate!)
      } else {
        await tap('space')
        if (options.keyboard === 'ja' && word.letters.length > 0) {
          // Japanese Space selects a conversion; Return commits it on the simulator.
          await tap('Return')
        }
        picked.push('space')
      }
      await browser.waitUntil(
        async () => {
          const events = (await state()).events.slice(previousEvents)
          return options.keyboard === 'ja'
            ? events.some((event) => event.type === 'compositionend')
            : events.filter(
                (event) =>
                  event.type === 'input' ||
                  (event.type === 'beforeinput' &&
                    event.defaultPrevented === true),
              ).length >=
                word.letters.length + 1
        },
        {timeout: 5000},
      )
      const after = await state()
      compositionstartPerWord.push(
        after.events
          .slice(previousEvents)
          .filter((event) => event.type === 'compositionstart').length,
      )
      previousEvents = after.events.length
    }
    const final = await state()
    const typed: Typed = {
      ...(Object.hasOwn(final, 'state') ? {state: final.state} : {}),
      text: final.text,
      picked,
      compositionstart: final.events.filter(
        (event) => event.type === 'compositionstart',
      ).length,
      nested: nestedCompositionstart(final.events),
      compositionstartPerWord,
    }
    result.final = final
    result.typed = typed
    return typed
  } catch (error) {
    result.error = String(error)
    throw error
  } finally {
    if (browser) {
      try {
        await browser.switchContext('NATIVE_APP')
        writeFileSync(`${artifact}.xml`, await browser.getPageSource())
        await browser.saveScreenshot(`${artifact}.png`)
      } catch (error) {
        result.captureError = String(error)
      }
    }
    try {
      await browser?.deleteSession()
    } catch (error) {
      result.cleanupError = String(error)
    }
    writeFileSync(`${artifact}.json`, JSON.stringify(result, null, 2))
  }
}

export function simulatorUnsupportedNote(
  options: TypeOnDeviceOptions,
): string | undefined {
  const unsupported = options.words.flatMap((word, position) =>
    /^[a-z]*$/.test(word.letters)
      ? []
      : [
          `word ${position + 1}: iOS simulator supports lowercase a-z letter keys only`,
        ],
  )
  if (
    options.keyboard === 'ja' &&
    options.words.some((word) => word.letters === '')
  ) {
    unsupported.push('iOS simulator: Japanese words need letters')
  }
  if (
    options.keyboard === 'en' &&
    options.words.some((word) => word.candidate !== undefined)
  ) {
    unsupported.push(
      'English candidates: autocorrect and QuickType never appeared on the iOS Simulator',
    )
  }
  return unsupported.length > 0 ? unsupported.join('; ') : undefined
}
