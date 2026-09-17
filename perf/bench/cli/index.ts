#!/usr/bin/env node
import {runCommand} from './run-command'
import {selfTestCommand} from './self-test-command'

const USAGE =
  'Usage: bench run [--scenario <name> [--scenario <name> ...] | --all] [--out <dir>] [--headed] [--trace]\n' +
  '         (default: every scenario)\n' +
  '       bench self-test'

async function main(): Promise<void> {
  const [command, ...rest] = process.argv.slice(2)
  if (command === 'run') {
    await runCommand(rest)
    return
  }
  if (command === 'self-test') {
    await selfTestCommand()
    return
  }
  console.error(USAGE)
  process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
