/**
 * @beta
 */
export type InputRule = {
  matcher: RegExp
  transform: () => string
}
