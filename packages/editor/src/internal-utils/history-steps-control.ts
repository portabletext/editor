import type {Patch} from '@portabletext/patches'
import {interpretChange} from '@portabletext/steps'
import type {PortableTextEditorEngine} from '../types/editor-engine'
import {rebaseHistorySteps} from './rebase-history-steps'

export const historyStepsProbe = {
  proposal: true,
  forceUndefined: false,
  policy: 'replacement' as 'drop' | 'keep' | 'fallback' | 'replacement',
  trace: false,
  last: null as any,
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
  if (steps === undefined) {
    historyStepsProbe.last = {steps: null, before: editor.history, after: {undos: [], redos: []}}
    historyStepsProbe.undefined++
    editor.history = {undos: [], redos: []}
    return
  }
  if (historyStepsProbe.trace) historyStepsProbe.last = {steps, before: structuredClone(editor.history)}
  editor.history = rebaseHistorySteps(editor.history, steps)
  if (historyStepsProbe.trace) historyStepsProbe.last.after = structuredClone(editor.history)
}
