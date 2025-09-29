import type {InputRule} from './input-rule'

/**
 * @beta
 */
export const ellipsisRule: InputRule = {
  matcher: /\.\.\./g,
  transform: () => '…',
}
