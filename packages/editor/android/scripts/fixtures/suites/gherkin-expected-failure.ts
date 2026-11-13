import type {Run} from 'thumbjar'
import {afterAll, expect, vi} from 'vitest'
import {editorState} from '../editor-state.ts'

const device = vi.hoisted(() => ({calls: 0}))

vi.mock('../../gherkin.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../gherkin.ts')>()
  return {
    ...original,
    deviceDefinitions: (
      _run: Parameters<typeof original.deviceDefinitions>[0],
      differences: Parameters<typeof original.deviceDefinitions>[1],
    ) =>
      original.deviceDefinitions((context, options): Promise<Run> => {
        device.calls++
        expect(context.task.name).toEqual(
          'Pressing Enter when selecting the entire content',
        )
        expect(options.steps).toEqual([
          {type: 'page', action: 'state', args: 'B: foo\n{IMAGE}\nB: bar'},
          {type: 'page', action: 'focus'},
          {type: 'page', action: 'all', args: 'forwards'},
          {type: 'enter'},
          {type: 'page', action: 'undo'},
        ])
        return Promise.resolve({
          text: 'foo\nbar',
          selection: null,
          events: [],
          steps: options.steps.map((step, index) => ({
            type: step.type,
            status: 'done',
            stateAfter:
              process.env['RACEJAR_DEVICE_PROBE'] === 'nostate'
                ? undefined
                : process.env['RACEJAR_DEVICE_PROBE'] === 'malformed' &&
                    index === 0
                  ? {value: [null], selection: null}
                  : index === 3
                    ? editorState(
                        ['fixed', 'enter-fixed'].includes(
                          process.env['RACEJAR_DEVICE_PROBE'] ?? '',
                        )
                          ? 'B: |'
                          : process.env['RACEJAR_DEVICE_PROBE'] === 'garbage'
                            ? 'B: zzz|'
                            : 'B: \nB: |',
                      )
                    : index === 4 &&
                        !['fixed', 'undo-fixed'].includes(
                          process.env['RACEJAR_DEVICE_PROBE'] ?? '',
                        )
                      ? editorState('B: |')
                      : editorState('B: ^foo\n{IMAGE}\nB: bar|'),
            textAfter: 'foo\nbar',
            selectionAfter: null,
            focusedAfter: true,
            events: [],
            keys: [],
          })),
        })
      }, differences),
  }
})

afterAll(() => {
  expect(device.calls).toEqual(1)
})

await import('../../../tests/en.insert.break.test.ts')
