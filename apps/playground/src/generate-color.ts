import {COLOR_HUES, ColorTintKey, hues} from '@sanity/color'

export function* generateColor(tint: ColorTintKey): Generator<string, string> {
  let colorCursor = 0
  while (true) {
    if (colorCursor > COLOR_HUES.length - 1) {
      colorCursor = 0
    }
    const nextHue = COLOR_HUES[colorCursor++]
    yield hues[nextHue][tint].hex
  }
}
