import {prepareEnglishKeyboard} from '../gboard/warmup.ts'

async function main(): Promise<void> {
  const [out, pageUrl] = process.argv.slice(2)
  if (out === undefined || pageUrl === undefined) {
    throw new Error('usage: warmup <outdir> <page url>')
  }
  await prepareEnglishKeyboard(out, pageUrl)
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(
      `WARM-UP FAILED: ${error instanceof Error ? error.message : String(error)}`,
    )
    process.exit(1)
  },
)
