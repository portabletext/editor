import {pathContains} from '../traversal/path-contains'
import type {Path} from '../types/paths'
import {safeStringify} from './safe-json'

export type PendingLocalTextEdit = {
  path: Path
  baseText: string
  lastEditTime: number
}

export const PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS = 10_000

export function pruneStaleLocalTextEdits(
  edits: Map<string, PendingLocalTextEdit>,
  now: number,
): void {
  for (const [key, edit] of edits) {
    if (now - edit.lastEditTime > PENDING_LOCAL_TEXT_EDIT_MAX_AGE_MS) {
      edits.delete(key)
    }
  }
}

export function getPendingLocalTextEditsKey(spanPath: unknown): string {
  return safeStringify(spanPath)
}

export function deletePendingLocalTextEditsInPath(
  edits: Map<string, PendingLocalTextEdit>,
  path: Path,
): void {
  for (const [key, edit] of edits) {
    if (pathContains(path, edit.path) || pathContains(edit.path, path)) {
      edits.delete(key)
    }
  }
}
