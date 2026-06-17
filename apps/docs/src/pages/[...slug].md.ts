import type {APIRoute, GetStaticPaths} from 'astro'
import {getCollection} from 'astro:content'

// Serve a raw-Markdown variant of every docs page at `/<slug>.md` so agents can
// fetch content without stripping the Starlight HTML shell. The leading
// blockquote is the llms.txt directive the Markdown checks look for.
export const getStaticPaths: GetStaticPaths = async () => {
  const docs = await getCollection('docs')
  return docs
    .filter((entry) => entry.id && entry.data.template !== 'splash')
    .map((entry) => ({params: {slug: entry.id}, props: {entry}}))
}

export const GET: APIRoute = ({props}) => {
  const {entry} = props
  const directive =
    '> For the complete documentation index, see [llms.txt](/llms.txt).\n' +
    '> The full corpus is at [llms-full.txt](/llms-full.txt).'
  const description = entry.data.description
    ? `> ${entry.data.description}\n\n`
    : ''
  const body = `${directive}\n\n# ${entry.data.title}\n\n${description}${entry.body ?? ''}`

  return new Response(body, {
    headers: {'Content-Type': 'text/markdown; charset=utf-8'},
  })
}
