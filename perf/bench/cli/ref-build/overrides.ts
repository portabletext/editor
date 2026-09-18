/** `overrides` entries consumed by `pnpmWorkspaceYaml` in `build-host-at-ref.ts`: force every resolution of a packed workspace package (however deep) to its tarball. */
export function buildOverrides(
  tarballs: ReadonlyMap<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    [...tarballs].map(([name, tarballPath]) => [name, `file:${tarballPath}`]),
  )
}
