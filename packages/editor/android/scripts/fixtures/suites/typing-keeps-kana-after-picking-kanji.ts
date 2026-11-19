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
        keys: ['k', 'y', 'o', 'u', '今日'],
      },
      {
        type: 'compose',
        status: 'done',
        textAfter: `${prefix}きょう今日`,
        selectionAfter: null,
        focusedAfter: true,
        events: [{type: 'compositionstart'}, {type: 'compositionend'}],
        keys: ['k', 'y', 'o', 'u', '今日'],
      },
    ]
    return Promise.resolve({
      text: `${prefix}きょう今日`,
      selection: null,
      steps,
      events: steps.flatMap((step) => step.events),
    })
  },
}))
