import type {Patch} from '@portabletext/patches'
import {interpretChange} from '@portabletext/steps'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {rebaseHistorySteps} from './rebase-history-steps'

export const historyStepsProbe = {
  proposal: true,
  forceUndefined: false,
  policy: 'replacement' as 'drop' | 'keep' | 'fallback' | 'replacement',
  calls: 0,
  undefined: 0,
  fallback: 0,
}

export function prepareHistoryBatch(
  editor: PortableTextEditorEngine,
  patches: Patch[],
) {
  const steps = interpretChange(
    {
      value: editor.snapshot.context.value,
      schema: editor.snapshot.context.schema,
    },
    historyStepsProbe.forceUndefined
      ? [...patches, {type: 'set', path: ['__spikeForceUnknown'], value: true}]
      : patches,
  )
  historyStepsProbe.calls++
  editor.history = rebaseHistorySteps(editor.history, steps)
}
