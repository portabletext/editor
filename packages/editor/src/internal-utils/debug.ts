import {createDebug, enabled} from 'obug'

const rootName = 'pte:'

function createDebugger(name: string) {
  const namespace = `${rootName}${name}`
  if (enabled(namespace)) {
    return createDebug(namespace)
  }
  return createDebug(rootName)
}

export const debug = {
  behaviors: createDebugger('behaviors'),
  history: createDebugger('history'),
  mutation: createDebugger('mutation'),
  normalization: createDebugger('normalization'),
  operation: createDebugger('operation'),
  selection: createDebugger('selection'),
  setup: createDebugger('setup'),
  state: createDebugger('state'),
  syncValue: createDebugger('sync:value'),
  syncPatch: createDebugger('sync:patch'),
}
