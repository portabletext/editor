/**
 * The tarball name `pnpm pack` produces: scope without `@`, `/` -> `-`.
 * Ported from sanity/perf/bench/cli/commands/buildDistAtCommit.ts's
 * `tarballFilename` — keep in sync.
 */
export function tarballFilename(name: string, version: string): string {
  return `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`
}
