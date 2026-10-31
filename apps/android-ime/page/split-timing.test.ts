// @vitest-environment jsdom
import {expect, test, vi} from 'vitest'
import {splitTiming} from './split-timing'

test('labels each entry with the task it ran in after the `input`', async () => {
  const timing = splitTiming()
  const field = document.createElement('div')
  document.body.append(field)
  field.addEventListener('input', () => {
    timing.ranges([{text: 'during'}])
    queueMicrotask(() => timing.ranges([{text: 'microtask'}]))
    setTimeout(() => timing.ranges([{text: 'later'}]), 0)
  })

  field.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: 'u',
    }),
  )
  await vi.waitFor(() =>
    expect(timing.entries.map(({kind}) => kind)).toContain('frame'),
  )
  await vi.waitFor(() =>
    expect(timing.entries.filter(({kind}) => kind === 'ranges')).toHaveLength(
      3,
    ),
  )

  expect(
    timing.entries
      .filter(({kind}) => kind !== 'frame' && kind !== 'timeout')
      .map(({kind, input, phase, texts}) => ({kind, input, phase, texts})),
  ).toEqual([
    {kind: 'input', input: 1, phase: 'dispatch', texts: undefined},
    {kind: 'ranges', input: 1, phase: 'dispatch', texts: ['during']},
    {kind: 'dispatchEnd', input: 1, phase: 'dispatch', texts: undefined},
    {kind: 'ranges', input: 1, phase: 'microtask', texts: ['microtask']},
    {kind: 'microtasksEnd', input: 1, phase: 'microtask', texts: undefined},
    {kind: 'ranges', input: 1, phase: 'afterTimeout', texts: ['later']},
  ])
})

test('carries the caller frames on `addRange`, `removeAllRanges` and `setBaseAndExtent` only', () => {
  const timing = splitTiming()
  const field = document.createElement('div')
  field.textContent = 'foo'
  document.body.append(field)
  const selection = document.getSelection()!
  const range = document.createRange()
  range.setStart(field.firstChild!, 1)

  function writeSelection() {
    selection.removeAllRanges()
    selection.addRange(range)
    selection.setBaseAndExtent(field.firstChild!, 2, field.firstChild!, 2)
    selection.collapse(field.firstChild!, 3)
  }
  writeSelection()

  expect(
    timing.entries
      .filter(({kind}) => kind === 'select')
      .map(({data, stack}) => ({
        data,
        caller: stack?.[0]?.startsWith('at writeSelection ') ?? null,
      })),
  ).toEqual([
    {data: 'removeAllRanges', caller: true},
    {data: 'addRange', caller: true},
    {data: 'setBaseAndExtent', caller: true},
    {data: 'collapse', caller: null},
  ])
})
