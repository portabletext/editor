/**
 * Shape of a Racetrack garage entry: one plugin loadable into the
 * playground and runner. `featureText` is the same `.feature` file
 * the underlying plugin's vitest suite runs, lifted at build time via
 * `?raw` so Racetrack can render and execute it.
 */

import type {Hook, ParameterType, StepDefinition} from 'racejar'
import type {ComponentType} from 'react'

export type GarageEntry = {
  /** Stable slug. Used for selection state and as React key. */
  id: string
  /** Display name in the entry picker. */
  name: string
  /** One-line description shown next to the entry name. */
  description: string
  /** Raw `.feature` file contents. */
  featureText: string
  /** The React component rendered inside the playground editor's `<EditorProvider>`. */
  // biome-ignore lint/suspicious/noExplicitAny: each entry's component has its own props shape
  PlaygroundComponent: ComponentType<any>
  /** Custom parameter types for racejar. */
  parameterTypes: Array<ParameterType<unknown>>
  /** Build the step definitions array given the shared editor steps. */
  buildStepDefinitions: (args: {
    // biome-ignore lint/suspicious/noExplicitAny: step definitions are heterogeneous
    editorStepDefinitions: Array<StepDefinition<any, any, any, any>>
    // biome-ignore lint/suspicious/noExplicitAny: same
  }) => Array<StepDefinition<any, any, any, any>>
  /** Build the Before/After hooks the runner installs per scenario. */
  // biome-ignore lint/suspicious/noExplicitAny: hooks close over entry-specific context shapes
  buildHooks: () => Array<Hook<any>>
}
