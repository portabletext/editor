// The Japanese prep's dictionary check on the device: the page Gboard types into and the `ScratchKeyboard`
// `confirmDictionary` drives. It reaches the keyboard through the driver's own helpers, so a check passes
// on every boot the driver can type on: one where an ANR dialog takes focus, Chrome leaves the foreground,
// the layout shows no language key, or Gboard opens a Japanese layout other than romaji QWERTY.

import {randomUUID} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {adb} from '../device/adb.ts'
import {cdpEval} from '../device/cdp.ts'
import type {Device} from '../device/u2.ts'
import {pyRepr, pySorted, sleep} from '../device/util.ts'
import {
  composing,
  parseCapture,
  type Capture,
  type ScratchKeyboard,
} from './dictionary.ts'
import {packageNodes} from './hierarchy.ts'
import {
  dismissAnr,
  ensureJapanese,
  gboardKeys,
  isJapanese,
  openKeyboard,
  roleKey,
} from './typing.ts'

const GBOARD = 'com.google.android.inputmethod.latin'
// The name the check's screen dumps carry in the out directory, `dictionary-keyboard.xml` and the like.
const NAME = 'dictionary'
const ADB_SECONDS = 10
const LANGUAGE_KEY = /^(次の言語|next language|switch to|globe)/i

/**
 * Open `pageUrl` in Chrome and raise Gboard on its field, leaving Gboard on the layout it opened on. The URL
 * carries a `thumbjar` search parameter that no device test opens: the check ends by force-stopping Chrome,
 * which keeps the tab, and the driver attaches to the first page whose URL equals the one it opened, so a
 * test that opened the same URL could attach to that stale tab.
 */
export function openScratchKeyboard(
  pageUrl: string,
  connect: () => Promise<Device>,
): Promise<Device> {
  return openKeyboard(
    NAME,
    {url: dictionaryCheckUrl(pageUrl), keyboard: 'en', prefix: ''},
    connect,
    {},
  )
}

/** The `ScratchKeyboard` over `device`, the capture in `out` and the page's `window.__state`. */
export function scratchKeyboard(device: Device, out: string): ScratchKeyboard {
  return {
    isJapanese: async () => isJapanese((await gboardKeys(device)).keys()),
    leaveJapanese: async () => {
      await dismissAnr(device)
      const keys = await gboardKeys(device)
      const key = [...keys.keys()].find((label) => LANGUAGE_KEY.test(label))
      if (key === undefined) {
        throw new Error(
          `no language key on the Japanese layout, labels ${pyRepr(pySorted(keys.keys()).slice(0, 60))}`,
        )
      }
      await device.click(...keys.get(key)!)
      for (let check = 0; check < 10; check++) {
        if (!isJapanese((await gboardKeys(device)).keys())) {
          return
        }
        await sleep(0.5)
      }
      throw new Error(
        'Gboard stayed on Japanese after a tap on its language key',
      )
    },
    switchToJapanese: async () => {
      await dismissAnr(device)
      await ensureJapanese(device, NAME)
    },
    markCapture: async () => {
      const marker = `thumbjar-prep-switch-${randomUUID()}`
      await adb(['shell', 'log', '-t', 'thumbjar', marker], ADB_SECONDS)
      return marker
    },
    capture: () => Promise.resolve(readCapture(out)),
    dump: () => device.dumpHierarchy(),
    typeKyou: async () => {
      for (const letter of 'kyou') {
        const keys = await gboardKeys(device)
        const center = keys.get(letter) ?? keys.get(letter.toUpperCase())
        if (center === undefined) {
          throw new Error(`no Gboard key ${pyRepr(letter)}`)
        }
        await device.click(...center)
        // Paces taps at a typist's speed, as the driver does.
        await sleep(0.4)
      }
    },
    deleteComposition: async () => {
      for (let tap = 0; tap < 8; tap++) {
        const field = await scratchField()
        if (field.text === '' && !composing(field.events)) {
          return
        }
        await gboardKeys(device)
        const key = roleKey(
          packageNodes(await device.dumpHierarchy(), GBOARD),
          'delete',
        )
        if (key === undefined) {
          throw new Error('no Gboard delete key')
        }
        await device.click(...key.center)
        await sleep(0.4)
      }
    },
    field: scratchField,
    sleep,
  }
}

async function scratchField(): Promise<{
  text: string | null
  events: Array<{type: string}>
}> {
  return (await cdpEval('window.__state()')) as {
    text: string | null
    events: Array<{type: string}>
  }
}

function readCapture(out: string): Capture {
  return parseCapture(readFileSync(`${out}/boot-logcat.txt`, 'utf8'))
}

function dictionaryCheckUrl(pageUrl: string): string {
  const url = new URL(pageUrl)
  url.searchParams.set('thumbjar', 'dictionary-check')
  return url.href
}
