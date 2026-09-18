import type {SerializeDegradationType} from './degradation-report'

/**
 * The full catalog of `SerializeDegradation['message']` prose, one entry
 * per `SerializeDegradationType`. Kept apart from the conversion's
 * emission sites (`render-node.ts`) so the catalog reads as one list
 * instead of being scattered across the walk that triggers it.
 *
 * Not exported from the package entry: `message` is unstable by contract
 * (see `SerializeDegradation['message']`'s doc comment), so the catalog
 * producing it stays internal too.
 */
export const serializeDegradationMessage = {
  'annotation-dropped': (markType: string): string =>
    `Removed the \`${markType}\` annotation, kept its text: no \`${markType}\` mark renderer`,

  'decorator-dropped': (markType: string): string =>
    `Removed the \`${markType}\` decorator, kept the text: no \`${markType}\` mark renderer`,

  'style-fallback': (style: string): string =>
    `Dropped the \`${style}\` style, kept the text: no \`${style}\` block renderer`,

  'list-item-fallback': (listItem: string): string =>
    `Rendered the \`${listItem}\` list item as a plain bullet, kept the text: no \`${listItem}\` list-item renderer`,
} satisfies Record<SerializeDegradationType, (...args: never[]) => string>
