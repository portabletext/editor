// Which steps Gboard in Android Chrome can drive. `runOnDevice` checks every step before it touches the
// device, and skips the test of a case it cannot drive, so the case never runs halfway.

import {pyRepr} from '../device/util.ts'
import type {RunOnDeviceOptions, Step} from '../steps.ts'

/**
 * The keys of Gboard's letter page on both layouts, by their lowercase letter. `keyboardState` reads a
 * dump as a whole layout only when it has every one, so a `compose` step can tap these and nothing else.
 * `tapKey` finds a key labelled with the letter or its capital, so the lowercase letter names the key
 * whether Gboard shows capitals or not.
 */
export const LETTERS = [...'abcdefghijklmnopqrstuvwxyz']

/** Why Gboard cannot drive `step` on `keyboard`, or `undefined` when it can. */
export function unsupportedReason(
  step: Step,
  keyboard: RunOnDeviceOptions['keyboard'],
): string | undefined {
  if (typeof step !== 'object' || step === null) {
    return `${pyRepr(step)} is not a step`
  }
  const type: unknown = step.type
  switch (step.type) {
    case 'compose':
      return unsupportedCompose(step, keyboard)
    case 'enter':
      return undefined
    case 'backspace':
      if (
        step.times !== undefined &&
        !(Number.isInteger(step.times) && step.times > 0)
      ) {
        return `\`times\` is ${pyRepr(step.times)}, not a positive integer`
      }
      return undefined
  }
  return `unknown step type ${pyRepr(type)}`
}

/**
 * Why Gboard cannot drive a case, naming each step it cannot drive by its position and type, or
 * `undefined` when it can drive every step.
 */
export function unsupportedNote(
  steps: Step[],
  keyboard: RunOnDeviceOptions['keyboard'],
): string | undefined {
  // `Array.from` visits an empty slot as `undefined`, where `map` and `every` skip it and would let it
  // reach the device.
  const unsupported = Array.from(steps, (step, index) => {
    const reason = unsupportedReason(step, keyboard)
    if (reason === undefined) {
      return undefined
    }
    const type = stepType(step)
    return `step ${index + 1}${type === undefined ? '' : ` (${type})`}: ${reason}`
  }).filter((entry) => entry !== undefined)
  if (unsupported.length === 0) {
    return undefined
  }
  return `Gboard cannot drive ${unsupported.join('; ')}`
}

function stepType(step: Step): Step['type'] | undefined {
  if (typeof step !== 'object' || step === null) {
    return undefined
  }
  const type: unknown = step.type
  return type === 'compose' || type === 'enter' || type === 'backspace'
    ? type
    : undefined
}

function unsupportedCompose(
  step: Extract<Step, {type: 'compose'}>,
  keyboard: RunOnDeviceOptions['keyboard'],
): string | undefined {
  const {letters, text, commit} = step
  if ((letters === undefined) === (text === undefined)) {
    return 'a `compose` step takes `letters` or `text`, not both or neither'
  }
  if (letters !== undefined && typeof letters !== 'string') {
    return `\`letters\` is ${pyRepr(letters)}, not a string`
  }
  if (text !== undefined && typeof text !== 'string') {
    return `\`text\` is ${pyRepr(text)}, not a string`
  }
  if (text !== undefined && keyboard === 'ja') {
    return 'Japanese QWERTY composes kana from romaji, so `text` has no keys on it, pass the romaji as `letters`'
  }
  const keyless = [...(letters ?? text)!].find(
    (character) => !LETTERS.includes(character),
  )
  if (keyless !== undefined && LETTERS.includes(keyless.toLowerCase())) {
    // `tapKey` finds a capital only while Gboard shows capitals, which follows its Shift state, and the
    // lowercase letter finds the same key in either state.
    return letters === undefined
      ? `${pyRepr(keyless)} needs Gboard's Shift state, which \`runOnDevice\` does not drive`
      : `\`letters\` names keys by their lowercase letter, and ${pyRepr(keyless)} depends on Gboard's Shift state, so use ${pyRepr(keyless.toLowerCase())}`
  }
  if (keyless !== undefined) {
    return `${pyRepr(keyless)} has no key on Gboard's letter page, which only maps a to z`
  }
  if (commit === undefined || commit === 'space' || commit === 'none') {
    return undefined
  }
  if (
    typeof commit !== 'object' ||
    commit === null ||
    typeof commit.candidate !== 'string'
  ) {
    return `unknown commit ${pyRepr(commit)}`
  }
  if (keyboard !== 'ja') {
    return "committing with a candidate needs keyboard 'ja', Gboard's English layout shows no conversion candidates"
  }
  return undefined
}
