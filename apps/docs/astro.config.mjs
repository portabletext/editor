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
					autogenerate: { directory: 'guides'}
				},
				{
					label: 'Concepts',
					autogenerate: { directory: 'concepts'}
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},

			],
		}),
	],
});
