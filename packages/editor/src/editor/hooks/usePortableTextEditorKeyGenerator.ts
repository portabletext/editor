import {randomKey} from '@sanity/util/content'

/**
 * @public
 */
export const defaultKeyGenerator = (): string => randomKey(12)
