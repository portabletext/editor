import type {MarkdownBenchFeatures} from './schema'

const storageKey = 'portabletext-playground:markdown-bench'
const persistedVersion = 1

export type PersistedBenchState = {
  markdown: string
  codeSource: string
  features: MarkdownBenchFeatures
  htmlInlineMode: 'skip' | 'text'
}

const featureKeys: Array<keyof MarkdownBenchFeatures> = [
  'table',
  'callout',
  'image',
  'code',
  'taskList',
  'link',
  'strikeThrough',
]

function isValidFeatures(value: unknown): value is MarkdownBenchFeatures {
  return (
    typeof value === 'object' &&
    value !== null &&
    featureKeys.every(
      (key) => typeof (value as Record<string, unknown>)[key] === 'boolean',
    )
  )
}

function isValidState(
  value: unknown,
): value is {version: number} & PersistedBenchState {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as {version?: unknown}).version === persistedVersion &&
    typeof (value as {markdown?: unknown}).markdown === 'string' &&
    typeof (value as {codeSource?: unknown}).codeSource === 'string' &&
    ((value as {htmlInlineMode?: unknown}).htmlInlineMode === 'skip' ||
      (value as {htmlInlineMode?: unknown}).htmlInlineMode === 'text') &&
    isValidFeatures((value as {features?: unknown}).features)
  )
}

export function loadPersistedState(): PersistedBenchState | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) {
      return null
    }
    const parsed = JSON.parse(raw)
    return isValidState(parsed)
      ? {
          markdown: parsed.markdown,
          codeSource: parsed.codeSource,
          features: parsed.features,
          htmlInlineMode: parsed.htmlInlineMode,
        }
      : null
  } catch {
    return null
  }
}

export function savePersistedState(state: PersistedBenchState): void {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({version: persistedVersion, ...state}),
    )
  } catch {
    // localStorage can be unavailable (private browsing, quota) - the bench
    // still works for the session, it just won't survive a reload.
  }
}
