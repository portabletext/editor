/**
 * Wraps `@changesets/changelog-github` to explain releases that would
 * otherwise get an empty changelog entry. `updateInternalDependents:
 * "always"` releases every workspace dependent whenever a package it
 * depends on releases; when that is the only reason for the release
 * (no own changesets, no runtime dependency range updates), upstream
 * writes nothing and the version shows up as a bare heading.
 */
const upstream = require('@changesets/changelog-github')
const base = upstream.default ?? upstream

module.exports = {
  default: {
    getReleaseLine: base.getReleaseLine,
    async getDependencyReleaseLine(changesets, dependenciesUpdated, options) {
      const line = await base.getDependencyReleaseLine(
        changesets,
        dependenciesUpdated,
        options,
      )
      if (line.trim() === '' && changesets.length === 0) {
        return '- Released to stay in lockstep with the other Portable Text packages released on the same day. No changes.'
      }
      return line
    },
  },
}
