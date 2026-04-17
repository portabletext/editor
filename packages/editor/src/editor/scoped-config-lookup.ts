/**
 * @internal
 *
 * Build a scoped name by joining an optional parent scope with a type name.
 *
 *   buildScopedName(undefined, 'block')       // 'block'
 *   buildScopedName('callout', 'block')       // 'callout.block'
 *   buildScopedName('callout.block', 'span')  // 'callout.block.span'
 */
export function buildScopedName(
  parentScope: string | undefined,
  typeName: string,
): string {
  return parentScope ? `${parentScope}.${typeName}` : typeName
}

/**
 * @internal
 *
 * Look up a scoped config by progressive specificity. Starts with the full
 * scoped name and falls back by stripping segments from the front:
 *
 *   'callout.block.span' -> 'block.span' -> 'span'
 */
export function lookupScopedConfig<TConfig>(
  configs: Map<string, TConfig>,
  scopedName: string,
): TConfig | undefined {
  let current: string | undefined = scopedName
  while (current !== undefined) {
    const match = configs.get(current)
    if (match) {
      return match
    }
    const dotIndex = current.indexOf('.')
    current = dotIndex === -1 ? undefined : current.substring(dotIndex + 1)
  }
  return undefined
}
