/* oxlint-disable no-restricted-globals -- The diagnostic artifacts serialize device records. */
import {execFile} from 'node:child_process'
import {mkdir, writeFile} from 'node:fs/promises'
import {promisify} from 'node:util'
import {runOnDevice} from 'thumbjar'
import {test, vi, type TestContext} from 'vitest'

const execute = promisify(execFile)
const directory = new URL('../out/diag/', import.meta.url)
const settingsActivity =
  'com.google.android.inputmethod.latin/com.google.android.apps.inputmethod.latin.preference.SettingsActivity'

test('Scenario: record device facts and textarea composition', async (context) => {
  await mkdir(directory, {recursive: true})
  const facts: string[] = []
  for (const command of [
    ['dumpsys', 'input'],
    ['dumpsys', 'window'],
    ['getprop'],
    ['settings', 'list', 'secure'],
    ['settings', 'list', 'global'],
    ['dumpsys', 'input_method'],
  ]) {
    const output = await adb(['shell', ...command])
    facts.push(
      `$ adb shell ${command.join(' ')}\n${
        command[1] === 'window'
          ? output
              .split('\n')
              .filter((line) => /keyboard|hardKeyboard/i.test(line))
              .join('\n')
          : command[0] === 'getprop'
            ? output
                .split('\n')
                .filter((line) => /keyboard|qemu\.hw/i.test(line))
                .join('\n')
            : output
      }`,
    )
  }
  await writeFile(new URL('device.txt', directory), facts.join('\n\n'))
  await probe(context, 'textarea', directory)
}, 1_400_000)

test('Scenario: record plain composition', async (context) => {
  await probe(context, 'plain', directory)
}, 1_400_000)

test('Scenario: record editor composition', async (context) => {
  await probe(context, 'editor', directory)
}, 1_400_000)

test('Scenario: inspect text correction and enable composition candidates', async (context) => {
  await openCorrection()
  const original = await captureSettings(directory)
  const labels = [
    'Show suggestion strip',
    'Auto-correction',
    'Auto-capitalization',
    'Next-word suggestions',
    'Inline suggestions',
    ...[...original.matchAll(/text="([^"]*(?:compos|underlin)[^"]*)"/gi)].map(
      (match) => match[1]!,
    ),
  ]
  const states = labels.map((label) => ({label, ...switchFor(original, label)}))
  await writeFile(
    new URL('settings-states.json', directory),
    JSON.stringify(states, null, 2),
  )
  for (const state of states) {
    if (
      state.checked !== false ||
      !/suggestion strip|auto-correction|compos|underlin/i.test(state.label)
    ) {
      continue
    }
    await openCorrection()
    const before = await hierarchy()
    const control = switchFor(before, state.label)
    if (control.checked !== false || !control.bounds) {
      continue
    }
    await tap(control.bounds)
    await vi.waitFor(
      async () => {
        if (switchFor(await hierarchy(), state.label).checked !== true) {
          throw new Error(`Waiting for ${state.label} to turn on`)
        }
      },
      {timeout: 30_000, interval: 500},
    )
    const after = new URL(
      `after-${state.label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}/`,
      directory,
    )
    await mkdir(after, {recursive: true})
    await captureSettings(after)
    try {
      await probe(context, 'plain', after)
    } finally {
      await openCorrection()
      const current = switchFor(await hierarchy(), state.label)
      if (current.checked === true && current.bounds) {
        await tap(current.bounds)
      }
    }
  }
}, 2_800_000)

test('Scenario: record plain composition without show IME with hard keyboard', async (context) => {
  try {
    await adb([
      'shell',
      'settings',
      'put',
      'secure',
      'show_ime_with_hard_keyboard',
      '0',
    ])
    await probe(context, 'plain', new URL('hardkb0/', directory))
  } finally {
    await adb([
      'shell',
      'settings',
      'put',
      'secure',
      'show_ime_with_hard_keyboard',
      '1',
    ])
  }
}, 1_400_000)

async function adb(arguments_: string[]): Promise<string> {
  const {stdout} = await execute('adb', arguments_, {
    timeout: 30_000,
    killSignal: 'SIGKILL',
    maxBuffer: 32 * 1024 * 1024,
  })
  return stdout
}

async function probe(
  context: TestContext,
  page: string,
  output: URL,
): Promise<void> {
  await mkdir(output, {recursive: true})
  const runs = []
  for (const commit of ['none', 'space'] as const) {
    const run = await runOnDevice(context, {
      url: `http://localhost:8765/${page}.html`,
      keyboard: 'en',
      prefix: '',
      steps: [{type: 'compose', letters: 'hello', commit}],
    })
    const ime = await adb(['shell', 'dumpsys', 'input_method'])
    await writeFile(
      new URL(
        commit === 'none' ? `ime-${page}.txt` : `ime-${page}-space.txt`,
        output,
      ),
      ime,
    )
    runs.push({
      commit,
      keyboardVisibleDuringTyping: true,
      keyboardVisibilityEvidence:
        'runOnDevice requires the Gboard window and accessible keys before tapping; thumbjar also saves keyboard and composing screenshots in android/out.',
      run,
      compositionstart: run.events.filter(
        (event) => event.type === 'compositionstart',
      ).length,
      compositionupdate: run.events.filter(
        (event) => event.type === 'compositionupdate',
      ).length,
      keyboardVisibility: ime
        .split('\n')
        .filter((line) =>
          /mInputShown|mIsInputViewShown|mShowRequested|isInputViewShown/.test(
            line,
          ),
        ),
    })
    await writeFile(
      new URL(`${page}.json`, output),
      JSON.stringify(
        {
          note: 'No between-step hook: separate hello without commit and hello + Space runs. IME dumps are after runOnDevice returns; its cleanup stops Chrome, so keyboard visibility and active EditorInfo may already be cleared. Use thumbjar run screenshots/taps to establish visibility during typing; absence here is not evidence the keyboard was hidden during typing.',
          runs,
        },
        null,
        2,
      ),
    )
  }
}

async function hierarchy(): Promise<string> {
  await adb(['shell', 'uiautomator', 'dump', '/sdcard/diag-window.xml'])
  return adb(['shell', 'cat', '/sdcard/diag-window.xml'])
}

async function openCorrection(): Promise<void> {
  await adb(['shell', 'am', 'start', '-n', settingsActivity])
  await vi.waitFor(
    async () => {
      const xml = await hierarchy()
      if (xml.includes('text="Auto-correction"')) {
        return
      }
      const node = [...xml.matchAll(/<node\b[^>]*>/g)].find((match) =>
        /text="Text correction"/i.test(match[0]),
      )?.[0]
      const bounds = node?.match(/bounds="([^"]+)"/)?.[1]
      if (!bounds) {
        throw new Error('Waiting for Gboard Text correction row')
      }
      await tap(bounds)
      throw new Error('Waiting for Text correction screen')
    },
    {timeout: 45_000, interval: 500},
  )
}

async function captureSettings(output: URL): Promise<string> {
  const xml = await hierarchy()
  await writeFile(new URL('settings-text-correction.xml', output), xml)
  const {stdout} = await execute('adb', ['exec-out', 'screencap', '-p'], {
    encoding: 'buffer',
    timeout: 30_000,
    killSignal: 'SIGKILL',
    maxBuffer: 32 * 1024 * 1024,
  })
  await writeFile(new URL('settings-text-correction.png', output), stdout)
  return xml
}

function switchFor(
  xml: string,
  label: string,
): {checked: boolean | null; bounds: string | null} {
  const stack: number[] = []
  const containers: string[] = []
  for (const token of xml.matchAll(/<node\b[^>]*>|<\/node>/g)) {
    if (token[0] === '</node>') {
      const start = stack.pop()
      if (start !== undefined) {
        containers.push(xml.slice(start, token.index + token[0].length))
      }
    } else if (!token[0].endsWith('/>')) {
      stack.push(token.index)
    }
  }
  const container = containers.find(
    (node) => node.includes(`text="${label}"`) && /checkable="true"/.test(node),
  )
  const control = container?.match(/<node\b[^>]*checkable="true"[^>]*>/)?.[0]
  return {
    checked: control ? /checked="true"/.test(control) : null,
    bounds: control?.match(/bounds="([^"]+)"/)?.[1] ?? null,
  }
}

async function tap(bounds: string): Promise<void> {
  const coordinates = [...bounds.matchAll(/\d+/g)].map((match) =>
    Number(match[0]),
  )
  if (coordinates.length !== 4) {
    throw new Error(`Unreadable UI bounds: ${bounds}`)
  }
  await adb([
    'shell',
    'input',
    'tap',
    String(Math.floor((coordinates[0]! + coordinates[2]!) / 2)),
    String(Math.floor((coordinates[1]! + coordinates[3]!) / 2)),
  ])
}
