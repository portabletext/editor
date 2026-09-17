/** Session failure taxonomy — thrown to discard a session as invalid. */
type SessionFailureReason = 'no-op-typing'

export class SessionError extends Error {
  reason: SessionFailureReason

  constructor(reason: SessionFailureReason, message: string) {
    super(`[${reason}] ${message}`)
    this.name = 'SessionError'
    this.reason = reason
  }
}
