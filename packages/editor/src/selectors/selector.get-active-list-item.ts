import type {PortableTextListBlock} from '@portabletext/schema'
import type {EditorSelector} from '../editor/editor-selector'
import {getActiveBlockProperty} from './selector.get-active-block-property'

/**
 * @public
 */
export const getActiveListItem: EditorSelector<
  PortableTextListBlock['listItem'] | undefined
> = (snapshot) => getActiveBlockProperty(snapshot, 'listItem')
