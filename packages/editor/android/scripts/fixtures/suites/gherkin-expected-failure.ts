import type {Run} from 'thumbjar'
import {afterAll, expect, vi} from 'vitest'

const device = vi.hoisted(() => ({calls: 0}))

vi.mock('../../gherkin.ts', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../gherkin.ts')>()
  return {
    ...original,
    deviceDefinitions: () =>
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
              index === 3
                ? process.env['RACEJAR_DEVICE_PROBE'] === 'fixed'
                  ? 'B: |'
                  : 'B: foo|'
                : 'B: ^foo\n{IMAGE}\nB: bar|',
            textAfter: 'foo\nbar',
            selectionAfter: null,
            focusedAfter: true,
            events: [],
            keys: [],
          })),
        })
      }),
  }
})

afterAll(() => {
  expect(device.calls).toEqual(1)
})

await import('../../../tests/en.gherkin.test.ts')
