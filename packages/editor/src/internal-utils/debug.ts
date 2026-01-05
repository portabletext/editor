import rawDebug from 'debug'

const rootName = 'pte:'

function createDebugger(name: string): rawDebug.Debugger {
  const namespace = `${rootName}${name}`
  if (rawDebug && rawDebug.enabled(namespace)) {
    return rawDebug(namespace)
  }
  return rawDebug(rootName)
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
