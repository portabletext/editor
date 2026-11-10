// Literal punctuation in a `compose` step's `text`, typed on Gboard's layouts without letters: the English
// symbol layout, and on Japanese QWERTY the rich symbol panel the numeric pad's `記号キーボード` opens.
// Each layout and label comes from a recorded dump in `src/fixtures/`, so the driver types no character a
// dump does not show.

import type {Device} from '../device/u2.ts'
import {phase, pyRepr, sleep} from '../device/util.ts'
import type {RunOnDeviceOptions} from '../steps.ts'
import {packageNodes, type PackageNode} from './hierarchy.ts'

const GBOARD = 'com.google.android.inputmethod.latin'

/** The characters `text` types off the letter layout, on both keyboards. */
export const TEXT_SYMBOLS = ['-', ' ']

/**
 * Gboard's layouts without letters on each keyboard, from the recorded dumps: the characters each types,
 * by its key's label, and the key that leads to each layout next to it. `letters` is the letter layout the
 * step starts and ends on. English opens its symbol layout with `Symbol keyboard`, which has `Dash` and
 * `Space`, and `Letter keyboard` closes it. Japanese QWERTY reaches the numeric pad, which has `スペース`,
 * through the ASCII alphabet layout, whose own keys type nothing here. The pad's `記号キーボード` opens the
 * rich symbol panel, which has `ダッシュ`, the panel's `文字キーボード` leads back to the pad, and the pad's
 * `かな入力キーボード` leads back to romaji. A key with a `to` opens that layout when tapped, as English
 * `Space` does: Gboard returns to the letters by itself after it (the fail dump of a device run shows the
 * letter layout and the page text `- `). Every other key keeps its layout.
 */
const LAYOUTS: Record<
  RunOnDeviceOptions['keyboard'],
  Record<
    string,
    {
      keys: Record<string, {label: string; to?: string}>
      next: Record<string, string>
    }
  >
> = {
  en: {
    letters: {keys: {}, next: {symbols: 'Symbol keyboard'}},
    symbols: {
      keys: {'-': {label: 'Dash'}, ' ': {label: 'Space', to: 'letters'}},
      next: {letters: 'Letter keyboard'},
    },
  },
  ja: {
    letters: {keys: {}, next: {alphabet: 'アルファベット入力キーボード'}},
    alphabet: {keys: {}, next: {pad: '数字キーボード'}},
    pad: {
      keys: {' ': {label: 'スペース'}},
      next: {richSymbols: '記号キーボード', letters: 'かな入力キーボード'},
    },
    richSymbols: {
      keys: {'-': {label: 'ダッシュ'}},
      next: {pad: '文字キーボード'},
    },
  },
}

/** How many dumps a layout gets to show the key the driver taps next, half a second apart. */
const LAYOUT_DUMPS = 8

/**
 * Type `text`, characters of `TEXT_SYMBOLS` only, off the letter layout and come back to it, in any order.
 * Each character is tapped through `tap`, which marks the call's input sent, on the nearest layout that
 * has it, reached by the fewest layout keys, and the step ends back on the letters. Each layout key is
 * looked up on a fresh dump, read again until it shows the key, so a dump of the layout before the switch
 * never reads as a missing key. A layout that never shows its key is a driver fault.
 */
export async function typeSymbols(
  device: Device,
  keyboard: RunOnDeviceOptions['keyboard'],
  text: string,
  tap: (label: string, center: [number, number]) => Promise<void>,
): Promise<void> {
  const layouts = LAYOUTS[keyboard]
  let layout = 'letters'
  const moveTo = async (wanted: (name: string) => boolean) => {
    for (const step of routeTo(layouts, layout, wanted)) {
      await device.click(
        ...(await waitForKey(device, layouts, layout, step.key)).center,
      )
      layout = step.to
    }
  }
  for (const character of text) {
    await moveTo((name) => layouts[name]!.keys[character] !== undefined)
    const entry = layouts[layout]!.keys[character]!
    const key = await waitForKey(device, layouts, layout, entry.label)
    await tap(character, key.center)
    layout = entry.to ?? layout
    // Paces taps at a typist's speed, as `tapKey` does.
    await sleep(0.4)
  }
  await moveTo((name) => name === 'letters')
  phase(`typed ${pyRepr(text)} off the letter layout`)
}

function routeTo(
  layouts: (typeof LAYOUTS)[RunOnDeviceOptions['keyboard']],
  from: string,
  wanted: (name: string) => boolean,
): Array<{key: string; to: string}> {
  const paths = new Map<string, Array<{key: string; to: string}>>([[from, []]])
  const queue = [from]
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    const path = paths.get(name)!
    if (wanted(name)) {
      return path
    }
    for (const [to, key] of Object.entries(layouts[name]!.next)) {
      if (!paths.has(to)) {
        paths.set(to, [...path, {key, to}])
        queue.push(to)
      }
    }
  }
  throw new Error(`no recorded Gboard layout from ${pyRepr(from)} has the key`)
}

/** A dump can still show the layout the driver just left, so a key counts only on a dump that shows `layout`. */
async function waitForKey(
  device: Device,
  layouts: (typeof LAYOUTS)[RunOnDeviceOptions['keyboard']],
  layout: string,
  label: string,
): Promise<PackageNode> {
  const own = Object.values(layouts[layout]!.next)
  let nodes: PackageNode[] = []
  for (let dump = 0; dump < LAYOUT_DUMPS; dump++) {
    nodes = packageNodes(await device.dumpHierarchy(), GBOARD)
    const key = nodes.find((node) => node.label === label)
    if (key !== undefined && nodes.some((node) => own.includes(node.label))) {
      return key
    }
    await sleep(0.5)
  }
  throw new Error(
    `no Gboard key labelled ${pyRepr(label)} on layout ${pyRepr(layout)} in ${LAYOUT_DUMPS} dumps, labels: ${pyRepr(nodes.map((node) => node.label).slice(0, 80))}`,
  )
}
