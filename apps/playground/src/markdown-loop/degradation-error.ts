import type {Degradation} from '@portabletext/markdown'

/**
 * Thrown from a strict `onDegradation` callback so the Sync handler's
 * `catch` can tell a rejected edit (nothing written, the markdown needs
 * fixing) apart from any other failure, which should propagate instead
 * of being read as a degradation.
 */
export class MarkdownEditRejected extends Error {
  degradations: ReadonlyArray<Degradation>

  constructor(degradations: ReadonlyArray<Degradation>, message: string) {
    super(message)
    this.name = 'MarkdownEditRejected'
    this.degradations = degradations
  }
}
