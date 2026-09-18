import {execFileSync} from 'node:child_process'

export function resolveRef(ref: string, cwd: string): string {
  try {
    return execFileSync('git', ['rev-parse', '--verify', `${ref}^{commit}`], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim()
  } catch (error) {
    throw new Error(
      `ref ${JSON.stringify(ref)} does not resolve to a commit in ${cwd}`,
      {cause: error},
    )
  }
}
