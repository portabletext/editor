import type {Run, RunOnDeviceOptions} from 'thumbjar'
import {vi} from 'vitest'

vi.mock(import('thumbjar'), () => ({
  runOnDevice: (
    _context: unknown,
    {prefix}: RunOnDeviceOptions,
  ): Promise<Run> => {
    const steps: Run['steps'] = [
      {
        type: 'compose',
        status: 'done',
        textAfter: `${prefix}きょう`,
        selectionAfter: null,
        focusedAfter: true,
        events: [{type: 'compositionstart'}, {type: 'compositionend'}],
        keys: ['k', 'y', 'o', 'u', 'Space'],
      },
      {
        type: 'compose',
        status: 'done',
        textAfter: `${prefix}きょうきょう`,
        selectionAfter: null,
        focusedAfter: true,
        events: [{type: 'compositionstart'}, {type: 'compositionend'}],
        keys: ['k', 'y', 'o', 'u', 'Space'],
      },
    ]
    return Promise.resolve({
      text: `${prefix}きょうきょう`,
      selection: null,
      steps,
      events: steps.flatMap((step) => step.events),
    })
  },
}))
