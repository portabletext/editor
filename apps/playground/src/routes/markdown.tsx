import {createFileRoute} from '@tanstack/react-router'
import {MarkdownBench} from '../markdown-bench/markdown-bench'

export const Route = createFileRoute('/markdown')({
  component: MarkdownBench,
})
