import {createParameterType} from 'racejar'
import type {FakeDocumentStatus} from '../fakes/document'
import type {RequestFailure} from '../protocol/host'
import type {IoSync} from '../protocol/io'
import type {ErrorEvent, WorkDropped} from '../protocol/types'
import type {Corruption, EditorName, ServerCopyName} from './world'

export type BatchReference = {name: EditorName; batchNumber: number}

/**
 * A sync state a scenario checks for. The editor has no `'stalled'` state, so
 * a scenario that expects it is known red.
 */
export type ExpectedSync = IoSync | 'stalled'

const requestFailures = new Map<string, RequestFailure>([
  ['400', 400],
  ['403', 403],
  ['404', 404],
  ['500', 500],
  ['503', 503],
  ['a network error', 'network error'],
])

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
  createParameterType<Exclude<FakeDocumentStatus, 'unmounted'>>({
    name: 'status',
    matcher: /"(loading|ready)"/,
  }),
  createParameterType<ExpectedSync>({
    name: 'sync',
    matcher: /"(synced|saving|blocked|out of step|stalled)"/,
  }),
  createParameterType<RequestFailure>({
    name: 'failure',
    matcher: /(400|403|404|500|503|a network error)/,
    transform: (failure) => {
      const status = requestFailures.get(failure)

      if (status === undefined) {
        throw new Error(`Unknown request failure "${failure}"`)
      }

      return status
    },
  }),
  createParameterType<ErrorEvent['reason']>({
    name: 'errorReason',
    matcher:
      /"(out of order|duplicate key|patch failed|echo mismatch|invalid content)"/,
  }),
  createParameterType<Corruption>({
    name: 'corruption',
    matcher:
      /(has no key)|(has no type)|has children "([^"]*)"|has a span whose text is (\d+)|is the string "([^"]*)"/,
    transform: (noKey, noType, children, text, string) => {
      if (noKey !== undefined) {
        return {type: 'no key'}
      }

      if (noType !== undefined) {
        return {type: 'no type'}
      }

      if (children !== undefined) {
        return {type: 'children', children}
      }

      if (text !== undefined) {
        return {type: 'span text', text: Number.parseInt(text, 10)}
      }

      return {type: 'string', value: string}
    },
  }),
  createParameterType<WorkDropped['reason']>({
    name: 'dropReason',
    matcher: /"(no target|closed while blocked|closed out of step|rejected)"/,
  }),
]
