// Add the Japanese QWERTY (romaji) layout to Gboard through its settings UI.
//
// Play images have no root, so the locale route is closed. Every step dumps the screen to <outdir>/ja-setup-*.
//
// Usage: node src/prepare/setup-ja.ts <outdir>, run by `thumbjar prepare --keyboard ja`

import {writeFileSync} from 'node:fs'
import {adbOutput, adbPassthrough} from '../device/adb.ts'
import {Device, type UiObject} from '../device/u2.ts'
import {pySorted, sleep} from '../device/util.ts'

const GBOARD = 'com.google.android.inputmethod.latin'
const out = process.argv[2]!
let step = 0

// Gboard preselects 12 keys (kana flick) and opens on it, so keep QWERTY (romaji) as the only layout.
// Gboard v12 labels the tiles in English, v15 in Japanese (12 キー, 手書き).
const TWELVE = '^12 (keys|キー)$'
const QWERTY = '^QWERTY$'
const HANDWRITING = '^(Handwriting|手書き)$'

async function main(): Promise<void> {
  const device = await Device.connect()
  await adbPassthrough([
    'shell',
    'am',
    'start',
    '-n',
    `${GBOARD}/com.google.android.apps.inputmethod.latin.preference.SettingsActivity`,
  ])
  await device.find({textMatches: '(?i)^Languages$'}).wait(15)
  await snap(device, 'settings')
  await tapText(device, '^Languages$', 'languages')
  await tapText(device, '^Add keyboard$', 'add-keyboard')
  // The list holds hundreds of languages. Use its search instead of scrolling.
  // The same Gboard build shows one of two screens: a search button that opens an AutoCompleteTextView
  // (search_src_text), or an inline EditText with the hint "Search language".
  const inline = device.find({
    className: 'android.widget.EditText',
    text: 'Search language',
  })
  const button = device.find({description: 'Search for a language'})
  let search: UiObject
  if (await inline.exists()) {
    search = inline
  } else {
    if (!(await button.wait(8))) {
      await snap(device, 'missing-search-button')
      throw new Error('no language search on the Add keyboard screen')
    }
    await button.click()
    search = device.find({resourceId: `${GBOARD}:id/search_src_text`})
    if (!(await search.wait(8))) {
      await snap(device, 'missing-search-field')
      throw new Error('no search field after tapping Search for a language')
    }
  }
  await search.click()
  await adbPassthrough(['shell', 'input', 'text', 'Japanese'])
  // Gboard v12 keeps the query when Back hides the keyboard. Gboard v15 closes the search on Back and
  // shows the full list again, so only press Back when the result row is hidden under the keyboard.
  const row = device.find({
    resourceId: 'android:id/title',
    textMatches: '^(Japanese|日本語)$',
  })
  await row.wait(5)
  await snap(device, 'search-typed')
  if (!(await row.exists())) {
    await adbPassthrough(['shell', 'input', 'keyevent', 'KEYCODE_BACK'])
    await row.wait(3)
  }
  await snap(device, 'search')
  // The search field also reads "Japanese", so tap the result row (android:id/title) instead.
  if (
    !(await row.exists()) &&
    (await device.find({scrollable: true}).exists())
  ) {
    // Fall back to the alphabetical All languages list.
    for (let scrolls = 0; scrolls < 60; scrolls++) {
      if (await row.exists()) {
        break
      }
      await device.find({scrollable: true}).scrollForward(20)
    }
  }
  if (!(await row.wait(15))) {
    await snap(device, 'missing-japanese-row')
    throw new Error('no Japanese row in the search results')
  }
  await row.click()
  await tile(device, TWELVE).wait(15)
  await snap(device, 'japanese')

  for (const [pattern, want] of [
    [QWERTY, true],
    [TWELVE, false],
    [HANDWRITING, false],
  ] as const) {
    // A tap sometimes does not take, so check the tile state and tap again.
    for (let tap = 0; tap < 3; tap++) {
      if (
        !(await tile(device, pattern).exists()) ||
        (await layoutSelected(device, pattern)) === want
      ) {
        break
      }
      await tile(device, pattern).click()
      await waitForSelection(device, pattern, want)
    }
  }
  if (!(await tile(device, TWELVE).exists())) {
    await snap(device, 'layouts-unknown')
    throw new Error('no 12 keys tile, the layout labels changed')
  }
  if (
    !(await layoutSelected(device, QWERTY)) ||
    (await layoutSelected(device, TWELVE))
  ) {
    await snap(device, 'layouts-wrong')
    throw new Error('could not leave QWERTY as the only Japanese layout')
  }
  await snap(device, 'layouts')
  await tapText(device, '^(Done|Add)$', 'done')
  const subtypes = await adbOutput(['shell', 'dumpsys', 'input_method'])
  const subtypeNames = pySorted(
    new Set(
      subtypes.match(
        /mSubtypeName=[^ }]+|locale=[\p{L}\p{N}\p{Mn}\p{Pc}]+/gu,
      ) ?? [],
    ),
  ).join(' | ')
  log(`JA_SETUP subtypes: ${subtypeNames}`)
  await adbPassthrough(['shell', 'input', 'keyevent', 'KEYCODE_HOME'])
  log('JA_SETUP done')
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(
      error instanceof Error ? (error.stack ?? error.message) : String(error),
    )
    process.exit(1)
  },
)

function log(line: string): void {
  process.stdout.write(`${line}\n`)
}

async function snap(device: Device, name: string): Promise<void> {
  step += 1
  const base = `${out}/ja-setup-${String(step).padStart(2, '0')}-${name}`
  writeFileSync(`${base}.xml`, await device.dumpHierarchy())
  await device.screenshot(base)
  log(`JA_SETUP step ${step} ${name}`)
}

async function tapText(
  device: Device,
  pattern: string,
  name: string,
): Promise<void> {
  const node = device.find({textMatches: `(?i)${pattern}`})
  if (!(await node.wait(15))) {
    await snap(device, `missing-${name}`)
    throw new Error(`no node matching ${JSON.stringify(pattern)} for ${name}`)
  }
  await node.click()
  // Gboard's settings screens slide in after a tap, and the accessibility tree has no signal for the
  // end of the transition. The next step waits for its own node.
  await sleep(1.5)
  await snap(device, name)
}

function tile(device: Device, pattern: string): UiObject {
  return device.find({descriptionMatches: pattern})
}

async function layoutSelected(
  device: Device,
  pattern: string,
): Promise<boolean> {
  return (
    (await tile(device, pattern).exists()) &&
    Boolean((await tile(device, pattern).info()).selected)
  )
}

async function waitForSelection(
  device: Device,
  pattern: string,
  want: boolean,
): Promise<void> {
  for (let check = 0; check < 6; check++) {
    if ((await layoutSelected(device, pattern)) === want) {
      return
    }
    await sleep(0.25)
  }
}
