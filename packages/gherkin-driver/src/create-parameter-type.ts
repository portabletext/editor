import {ParameterType} from '@cucumber/cucumber-expressions'

/**
 * @public
 */
export function createParameterType<T>(
  ...options: ConstructorParameters<typeof ParameterType<T>>
) {
  return new ParameterType(...options)
}
