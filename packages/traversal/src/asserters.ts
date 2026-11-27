// Keep in sync with `packages/editor/src/utils/asserters.ts`.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && (typeof value === 'object' || typeof value === 'function')
}
