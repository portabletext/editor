import {readFileSync} from 'node:fs'
import {describe, expect, test} from 'vitest'
import {UiObjectNotFoundError, type SelectorFields} from '../device/u2.ts'
import {parseXml} from '../gboard/hierarchy.ts'
import {openJapaneseLayouts} from './open-japanese-layouts.ts'

describe(openJapaneseLayouts.name, () => {
  test('rejects when two row taps leave the search screen open', async () => {
    const device = fakeDevice(Infinity)
    const snapshots: string[] = []

    await expect(
      openJapaneseLayouts(device, (name) => {
        snapshots.push(name)
        return Promise.resolve()
      }),
    ).rejects.toThrow(
      'the Japanese layouts screen did not open after tapping the Japanese row',
    )
    expect(device.rowTaps).toEqual(2)
    expect(snapshots).toEqual(['layouts-missing'])
  })

  test('opens the layouts screen on the second row tap', async () => {
    const device = fakeDevice(2)
    const snapshots: string[] = []

    await expect(
      openJapaneseLayouts(device, (name) => {
        snapshots.push(name)
        return Promise.resolve()
      }),
    ).resolves.toEqual(undefined)
    expect(device.rowTaps).toEqual(2)
    expect(snapshots).toEqual([])
  })

  test('continues when the layouts screen opens before the second row tap resolves', async () => {
    const device = fakeDevice(
      2,
      false,
      new UiObjectNotFoundError('row is gone'),
    )
    const snapshots: string[] = []

    await expect(
      openJapaneseLayouts(device, (name) => {
        snapshots.push(name)
        return Promise.resolve()
      }),
    ).resolves.toEqual(undefined)
    expect(device.rowTaps).toEqual(1)
    expect(device.rowClickTimeouts).toEqual([undefined, 1])
    expect(snapshots).toEqual([])
  })

  test('rethrows other errors from the second row tap', async () => {
    const error = new Error('device disconnected')
    const device = fakeDevice(2, false, error)
    const snapshots: string[] = []

    await expect(
      openJapaneseLayouts(device, (name) => {
        snapshots.push(name)
        return Promise.resolve()
      }),
    ).rejects.toEqual(error)
    expect(snapshots).toEqual([])
  })

  test('opens the layouts screen on the first row tap', async () => {
    const device = fakeDevice(1)
    const snapshots: string[] = []

    await expect(
      openJapaneseLayouts(device, (name) => {
        snapshots.push(name)
        return Promise.resolve()
      }),
    ).resolves.toEqual(undefined)
    expect(device.rowTaps).toEqual(1)
    expect(snapshots).toEqual([])
  })

  test('leaves unrecognized layout labels to the existing layout check', async () => {
    const device = fakeDevice(1, true)
    const snapshots: string[] = []

    await expect(
      openJapaneseLayouts(device, (name) => {
        snapshots.push(name)
        return Promise.resolve()
      }),
    ).resolves.toEqual(undefined)
    expect(device.rowTaps).toEqual(1)
    expect(snapshots).toEqual([])
  })
})

function fakeDevice(
  opensAfter: number,
  unknownLabels = false,
  secondClickError?: Error,
) {
  const search = readFileSync(
    new URL('../fixtures/ja-search-japanese.xml', import.meta.url),
    'utf8',
  )
  const layouts = readFileSync(
    new URL('../fixtures/ja-layouts.xml', import.meta.url),
    'utf8',
  )
  const rowClickTimeouts: Array<number | undefined> = []
  const device = {
    rowTaps: 0,
    rowClickTimeouts,
    layoutsOpened: false,
    find(fields: SelectorFields) {
      const exists = () =>
        Promise.resolve(
          parseXml(
            device.layoutsOpened || device.rowTaps >= opensAfter
              ? unknownLabels
                ? layouts.replace('12 キー', 'Kana')
                : layouts
              : search,
          ).some(
            ({attrs}) =>
              (!fields.resourceId ||
                attrs['resource-id'] === fields.resourceId) &&
              (typeof fields.textMatches !== 'string' ||
                new RegExp(fields.textMatches).test(attrs.text ?? '')) &&
              (typeof fields.descriptionMatches !== 'string' ||
                new RegExp(fields.descriptionMatches).test(
                  attrs['content-desc'] ?? '',
                )),
          ),
        )
      return {
        exists,
        wait: exists,
        click: async (timeout?: number) => {
          if (fields.resourceId === 'android:id/title') {
            device.rowClickTimeouts.push(timeout)
            if (device.rowClickTimeouts.length === 2 && secondClickError) {
              device.layoutsOpened = true
              throw secondClickError
            }
          }
          if (!(await exists())) {
            throw new Error('cannot tap a missing node')
          }
          if (fields.resourceId === 'android:id/title') {
            device.rowTaps++
          }
        },
      }
    },
  }
  return device
}
