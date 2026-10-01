import {createParameterType} from 'racejar'
import type {IoEditorStatus, IoEditorSync} from '../editor'
import type {WorkDropped} from '../types'
import type {EditorName, ServerCopyName} from './world'

export type BatchReference = {name: EditorName; batchNumber: number}

/**
 * A sync state a scenario checks for. The editor has no `'stalled'` state, so
 * a scenario that expects it is known red.
 */
export type ExpectedSync = IoEditorSync | 'stalled'

export const parameterTypes = [
  createParameterType<EditorName>({
    name: 'editor',
    matcher: /Editor A|Editor B/,
  }),
  createParameterType<BatchReference>({
    name: 'batch',
    matcher: /(Editor A|Editor B)'s batch (\d+)/,
    transform: (name, batchNumber) => ({
      name: name === 'Editor A' ? 'Editor A' : 'Editor B',
      batchNumber: Number.parseInt(batchNumber, 10),
    }),
  }),
  createParameterType<string>({
    name: 'textspec',
    matcher: /"(.*)"/,
  }),
  createParameterType<string>({
    name: 'style',
    matcher: /"(normal|h1|h2|h3)"/,
  }),
  createParameterType<string>({
    name: 'key',
    matcher: /"([^"]+)"/,
  }),
  createParameterType<ServerCopyName>({
    name: 'copy',
    matcher: /no document|no field|an empty list/,
  }),
  createParameterType<Exclude<IoEditorStatus, 'unmounted'>>({
    name: 'status',
    matcher: /"(loading|ready)"/,
  }),
  createParameterType<ExpectedSync>({
    name: 'sync',
    matcher: /"(synced|saving|blocked|out of step|stalled)"/,
  }),
  createParameterType<WorkDropped['reason']>({
    name: 'dropReason',
    matcher: /"(no target|closed while blocked|rejected)"/,
  }),
]
