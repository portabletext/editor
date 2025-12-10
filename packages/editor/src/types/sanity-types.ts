/**
 * This file centralizes all imports from @sanity/types.
 * Any types needed from @sanity/types should be re-exported here
 * to maintain visibility over the dependency.
 */

export type {
  ArrayDefinition,
  ArraySchemaType,
  BlockDecoratorDefinition,
  BlockListDefinition,
  BlockStyleDefinition,
  ObjectSchemaType,
  // biome-ignore lint/style/noRestrictedImports: This is the designated file for @sanity/types imports
} from '@sanity/types'
