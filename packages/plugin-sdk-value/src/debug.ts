import {createDebug, enabled} from 'obug'

// Keep in sync with `packages/editor/src/internal-utils/debug.ts`: sharing
// the `pte:` root lets `localStorage.debug = 'pte:*'` interleave this
// plugin's sync traces with the editor's own output on one timeline.
const rootName = 'pte:plugin-sdk-value:'

function createDebugger(name: string) {
  const namespace = `${rootName}${name}`
  if (enabled(namespace)) {
    return createDebug(namespace)
  }
  return createDebug(rootName)
}

export const debug = {
  mutation: createDebugger('mutation'),
  push: createDebugger('push'),
  remote: createDebugger('remote'),
  repair: createDebugger('repair'),
}
