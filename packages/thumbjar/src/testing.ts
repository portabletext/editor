import {startVitest} from 'vitest/node'

export type SuiteResult = {
  file: string
  errors: string[]
  tests: Array<{name: string; state: string}>
}

/**
 * Run one test file in a Vitest of its own, without reporters, and collect the
 * file's errors and each test's state. `file` and `setupFiles` are relative to
 * `root`.
 */
export async function runSuite({
  root,
  file,
  setupFiles,
  testTimeout = 5_000,
  provide = {},
}: {
  root: string
  file: string
  setupFiles: string[]
  testTimeout?: number
  provide?: Record<string, unknown>
}): Promise<SuiteResult> {
  const exitCode = process.exitCode
  const vitest = await startVitest(
    'test',
    [],
    {
      root,
      config: false,
      watch: false,
      include: [file],
      setupFiles,
      testTimeout,
      reporters: [],
    },
    {test: {provide}},
  )
  try {
    const [testModule] = vitest.state.getTestModules()
    return {
      file: testModule!.state(),
      errors: testModule!.errors().map((error) => error.message ?? ''),
      tests: [...testModule!.children.allTests()].map((testCase) => ({
        name: testCase.name,
        state: testCase.result().state,
      })),
    }
  } finally {
    await vitest.close()
    // The inner run marks a failed file in the exit code of the process it shares with this test.
    process.exitCode = exitCode
  }
}
