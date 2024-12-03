import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	integrations: [
		starlight({
			title: 'Portable Text Editor Docs',
			social: {
				github: 'https://github.com/portabletext/editor',
			},
			sidebar: [
				{ slug: 'getting-started'},
				{
					label: 'Guides',
					items: [
						// Each item here is one entry in the navigation menu.
						{ label: 'Behavior cheat sheet', slug: 'guides/behavior-cheat-sheet' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
