import type {PageEvent} from '../steps.ts'

type TapState = {text: string | null; events: PageEvent[]}

export function tapLanded(before: TapState, after: TapState): boolean {
  return after.events
    .slice(before.events.length)
    .some(
      (event) =>
        event.type === 'beforeinput' ||
        event.type === 'input' ||
        event.type === 'compositionstart' ||
        event.type === 'compositionupdate' ||
        event.type === 'compositionend',
    )
}
