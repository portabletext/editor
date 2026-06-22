# Portable Text Editor Documentation Site

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

## Docs project structure

Inside of your Astro + Starlight project, you'll see the following folders and files:

```
.
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── content/
│   │   └── docs/
│   ├── styles/
│   ├── content.config.ts
│   └── env.d.ts
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

Images can be added to `src/assets/` and embedded in Markdown with a relative link.

Static assets, like favicons, can be placed in the `public/` directory.

## Commands

All commands are run from `apps/docs/`, from a terminal:

| Command                | Action                                           |
| :--------------------- | :----------------------------------------------- |
| `pnpm install`         | Installs dependencies                            |
| `pnpm dev`             | Starts local dev server at `localhost:4321`      |
| `pnpm build`           | Build your production site to `./dist/`          |
| `pnpm preview`         | Preview your build locally, before deploying     |
| `pnpm astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help` | Get help using the Astro CLI                     |

## Common tasks

### Add new reference pages

We use the [multiple instance](https://starlight-typedoc.vercel.app/guides/multiple-instances/) approach with the `starlight-typedoc` plugin. To add a new package to reference docs, perform the following steps in the `astro.config.mjs` file.

1. Call `createStarlightTypeDocPlugin()` to create a plugin instance and a sidebar group.
2. Add and configure the plugin in the `plugins` array of the starlight config.
3. Create a sidebar group.
4. Create an 'overview' mdx file in content/docs/editor/reference. Use an existing overview, like `editor/reference/toolbar.mdx` as an example.

For steps 1-3, update the `astro.config.mjs`:

```ts
// 1. Set the variable names to match the desired section
const [toolbarTypeDoc, toolbarTypeDocSidebar] = createStarlightTypeDocPlugin()

export default defineConfig({
  // ...
  integrations: [
    // ...
    starlight({
      plugins: [
        // ...
        // 2. Configure the plugin
        toolbarTypeDoc({
          // update entryPoints and output
          entryPoints: ['../../packages/toolbar/src/index.ts'],
          output: 'api/toolbar',
          typeDoc: {
            excludeReferences: true,
          },
          sidebar: {
            collapsed: true,
          },
          // Update path to the tsconfig
          tsconfig: '../../packages/toolbar/tsconfig.json',
        }),
      ],
      sidebar: [
        // ...
        {
          label: 'Reference',
          collapsed: true,
          items: [
            // ...
            // 3. Add the sidebar group. Update names, slugs, etc accordingly
            {
              label: 'Toolbar',
              items: [
                {label: 'Overview', slug: 'editor/reference/toolbar'},
                {...toolbarTypeDocSidebar, badge: 'Generated'},
              ],
            },
          ],
        },
      ],
    }),
  ],
})
```

## Want to learn more?

Check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build), or jump into the [Astro Discord server](https://astro.build/chat).
