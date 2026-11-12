import {UiObjectNotFoundError, type SelectorFields} from '../device/u2.ts'

export const TWELVE = '^12 (keys|キー)$'

type LayoutDevice = {
  find(fields: SelectorFields): {
    exists(): Promise<boolean>
    wait(seconds: number): Promise<boolean>
    click(timeout?: number): Promise<void>
  }
}

export async function openJapaneseLayouts(
  device: LayoutDevice,
  snap: (name: string) => Promise<void>,
): Promise<void> {
  const row = device.find({
    resourceId: 'android:id/title',
    textMatches: '^(Japanese|日本語)$',
  })
  const twelve = device.find({descriptionMatches: TWELVE})
  await row.click()
  if (await twelve.wait(15)) {
    return
  }
  if (await row.exists()) {
    try {
      await row.click(1)
    } catch (error) {
      if (!(error instanceof UiObjectNotFoundError)) {
        throw error
      }
    }
    if (await twelve.wait(15)) {
      return
    }
  }
  if (await row.exists()) {
    await snap('layouts-missing')
    throw new Error(
      'the Japanese layouts screen did not open after tapping the Japanese row',
    )
  }
}
