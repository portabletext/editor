import {ParameterType, type RegExps} from '@cucumber/cucumber-expressions'

/**
 * @public
 */
export type ParameterTypeConfig<TType = string> = {
  readonly name: string
  matcher: RegExps
  type?: (...args: unknown[]) => TType
  transform?: (...match: string[]) => TType
}

/**
 * @public
 */
export function createParameterType<TType = string>(
  config: ParameterTypeConfig<TType>,
): ParameterType<TType> {
  return new ParameterType(
    config.name,
    config.matcher,
    config.type ?? String,
    config.transform,
    false,
    true,
  )
}
