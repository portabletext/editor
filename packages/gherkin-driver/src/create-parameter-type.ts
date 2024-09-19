import {ParameterType} from '@cucumber/cucumber-expressions'

export function createParameterType<T>(
  ...options: ConstructorParameters<typeof ParameterType<T>>
) {
  return new ParameterType(...options)
}
