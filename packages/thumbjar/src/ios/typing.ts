import {mkdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import type {TestContext} from 'vitest'
import {remote} from 'webdriverio'
import {prefixedPageUrl} from '../device/page-url.ts'
import {pyRepr, sleep} from '../device/util.ts'
import {slug} from '../driver.ts'
import {
  FIELD_BOUNDARY,
  FIELD_MISSING,
  failedStepRecords,
  graphemeSelection,
  outDir,
  withStepRecords,
  type StepTaps,
} from '../gboard/typing.ts'
import type {PageEvent, Run, RunOnDeviceOptions, StepRecord} from '../steps.ts'
import {safariCapabilities} from './capabilities.ts'
import {focusField, readyField} from './field.ts'

type PageState = {text: string | null; events: PageEvent[]; state?: unknown}

export async function runOnSimulator(
  context: TestContext,
  options: RunOnDeviceOptions,
  onTaps?: (taps: StepTaps[]) => void,
): Promise<Run> {
  context.signal.throwIfAborted()
  const records: StepRecord[] = []
  let activeKeys: string[] | undefined
  const directory = outDir()
  mkdirSync(directory, {recursive: true})
  const artifact = join(
    directory,
    `${options.keyboard}-${slug(context.task.name)}`,
  )
  const result: Record<string, unknown> = {
    options,
    records,
  }
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
  async function boundary() {
    await web()
    const serialized = await browser.execute(
      `return JSON.stringify(${FIELD_BOUNDARY})`,
    )
    if (typeof serialized !== 'string') {
      throw new Error('Safari returned no serialized page boundary')
    }
    const reply: {state: PageState; selection: unknown; focused: unknown} =
      JSON.parse(serialized)
    return {
      state: reply.state,
      selection: graphemeSelection(reply.selection),
      focused: typeof reply.focused === 'boolean' ? reply.focused : null,
    }
  }
  async function tap(name: string) {
    await native()
    const key = browser.$(
      `-ios predicate string:(type == "XCUIElementTypeKey" OR type == "XCUIElementTypeButton") AND name ==[c] ${JSON.stringify(name)}`,
    )
    await key.waitForExist({timeout: 5000})
    activeKeys?.push(name)
    await key.click()
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
    let field: WebdriverIO.Element | null = null
    await browser.waitUntil(
      async () => (field = await browser.execute(readyField)) !== null,
      {timeout: 20_000, timeoutMsg: FIELD_MISSING},
    )
    if (field === null) {
      throw new Error(FIELD_MISSING)
    }
    await browser.$(field).click()
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
    if ((await browser.execute(focusField)) === false) {
      throw new Error(FIELD_MISSING)
    }
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
    let last = await boundary()
    const firstEvent = last.state.events.length
    for (const [index, step] of options.steps.entries()) {
      if (step.type !== 'compose' || step.letters === undefined) {
        throw new Error('Unsupported iOS step')
      }
      const word = {
        letters: step.letters,
        candidate:
          typeof step.commit === 'object' ? step.commit.candidate : undefined,
      }
      const previousEvents = last.state.events.length
      const keys: string[] = []
      activeKeys = keys
      try {
        for (const letter of word.letters) {
          await tap(letter)
        }
        await native()
        const candidate =
          word.candidate === undefined
            ? undefined
            : browser.$(
                `-ios predicate string:type == "XCUIElementTypeCell" AND name == ${JSON.stringify(word.candidate)}`,
              )
        let candidateExists = candidate ? await candidate.isExisting() : false
        if (candidate) {
          for (let check = 0; check < 6 && !candidateExists; check++) {
            await sleep(0.5)
            context.signal.throwIfAborted()
            candidateExists = await candidate.isExisting()
          }
        }
        if (candidate && candidateExists) {
          keys.push(word.candidate!)
          await candidate.click()
        } else if (word.candidate !== undefined) {
          const candidates = await browser
            .$$('//XCUIElementTypeCell')
            .map((cell) => cell.getAttribute('name'))
          throw new Error(
            `iOS keyboard did not offer the candidate ${pyRepr(word.candidate)} in step ${index + 1}, candidates ${pyRepr(candidates)}`,
          )
        } else {
          await tap('space')
          if (options.keyboard === 'ja' && word.letters.length > 0) {
            // Japanese Space selects a conversion; Return commits it on the simulator.
            await tap('Return')
          }
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
        last = await boundary()
        records.push({
          type: step.type,
          status: 'done',
          textAfter: last.state.text,
          selectionAfter: last.selection,
          focusedAfter: last.focused,
          ...(Object.hasOwn(last.state, 'state')
            ? {stateAfter: last.state.state}
            : {}),
          events: last.state.events.slice(previousEvents),
          keys: [...keys],
        })
      } catch (error) {
        const after = await boundary().catch(() => undefined)
        const failed = failedStepRecords(
          options.steps,
          index,
          String(error),
          keys,
        )
        Object.assign(failed[0]!, {
          textAfter: after?.state.text ?? null,
          selectionAfter: after?.selection ?? null,
          focusedAfter: after?.focused ?? null,
          ...(after && Object.hasOwn(after.state, 'state')
            ? {stateAfter: after.state.state}
            : {}),
          events: after?.state.events.slice(previousEvents) ?? [],
        })
        records.push(...failed)
        throw withStepRecords(error, records)
      }
    }
    const run: Run = {
      steps: records,
      text: last.state.text,
      selection: last.selection,
      events: last.state.events.slice(firstEvent),
      ...(Object.hasOwn(last.state, 'state') ? {state: last.state.state} : {}),
    }
    result.run = run
    return run
  } catch (error) {
    result.error = String(error)
    throw error
  } finally {
    onTaps?.(
      records
        .filter((record) => record.status !== 'skipped')
        .map((record) => ({keys: record.keys, events: record.events})),
    )
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
  options: RunOnDeviceOptions,
): string | undefined {
  const unsupported = options.steps.flatMap((step, index) => {
    const reason =
      step.type !== 'compose'
        ? `iOS simulator does not support ${step.type}`
        : step.letters === undefined
          ? 'iOS simulator does not support compose with text'
          : !/^[a-z]*$/.test(step.letters)
            ? 'iOS simulator supports lowercase a-z letter keys only'
            : step.commit === 'none'
              ? 'iOS simulator does not support uncommitted composition'
              : options.keyboard === 'ja' && step.letters === ''
                ? 'iOS simulator: Japanese words need letters'
                : options.keyboard === 'en' && typeof step.commit === 'object'
                  ? 'English candidates: autocorrect and QuickType never appeared on the iOS Simulator'
                  : undefined
    return reason === undefined
      ? []
      : [`step ${index + 1} (${step.type}): ${reason}`]
  })
  return unsupported.length > 0 ? unsupported.join('; ') : undefined
}
