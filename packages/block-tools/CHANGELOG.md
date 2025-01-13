# Changelog

## 1.0.0 (2025-01-13)


### ⚠ BREAKING CHANGES

* Code that accessed types in the Schema namespace must import the types directly instead.

### Features

* **block-tools:** add special notion handling for single block decorators ([#5411](https://github.com/portabletext/editor/issues/5411)) ([7087f80](https://github.com/portabletext/editor/commit/7087f809ae3efda1219bfdc2be7e96c1e2a8a3bd))
* **block-tools:** use strict typings ([a85f46b](https://github.com/portabletext/editor/commit/a85f46b20383f1c7cd2e4eed8df79aef7859cadf))
* conditionally set maximum search depth in studio search ([#5440](https://github.com/portabletext/editor/issues/5440)) ([c86eefe](https://github.com/portabletext/editor/commit/c86eefe03ff3f2a83fa285d18370b75bf65d2769))
* **form-builder:** add field groups ([#3006](https://github.com/portabletext/editor/issues/3006)) ([2d2c7f6](https://github.com/portabletext/editor/commit/2d2c7f6c8d7c8b568016367e9ae1299aac85feee))
* **i18n:** localize menu items ([#5308](https://github.com/portabletext/editor/issues/5308)) ([c3ec684](https://github.com/portabletext/editor/commit/c3ec684fd9890d3f613d24d5f86dfdf5336228d9))
* **i18n:** translate portable text editor ([#5225](https://github.com/portabletext/editor/issues/5225)) ([0f51607](https://github.com/portabletext/editor/commit/0f51607be91f609d7afef493e07b53a1f5ccc277))
* introduce `@portabletext/block-tools` ([3ee2d70](https://github.com/portabletext/editor/commit/3ee2d7007c57c10acb95cf2fe6afa0ec5cb93106))
* move to react `18` ([#3612](https://github.com/portabletext/editor/issues/3612)) ([a4d921d](https://github.com/portabletext/editor/commit/a4d921d94001c1c187591c577767dc657051c464))
* replaced Schema namespace with plain exports for schema-definitions ([#3699](https://github.com/portabletext/editor/issues/3699)) ([c2040bf](https://github.com/portabletext/editor/commit/c2040bf818d673232036b32d7b0f4b19e1352cca))


### Bug Fixes

* **@sanity:** issue where hidden unicode characters were bloating document in PTE ([#6440](https://github.com/portabletext/editor/issues/6440)) ([4a3bfae](https://github.com/portabletext/editor/commit/4a3bfae9592717899bb458a1b7a1a48d836ace0f))
* add `node.module` export condition ([#4798](https://github.com/portabletext/editor/issues/4798)) ([4f07446](https://github.com/portabletext/editor/commit/4f074466707401e717436dd18d89f0e8ae503025))
* **base:** add workaround for read-only children ([a03656d](https://github.com/portabletext/editor/commit/a03656da0c52c79d5d3a32a6fcc4bec1930e20b2))
* **block-tools:** _markDefs must be class var ([364505f](https://github.com/portabletext/editor/commit/364505f33bb9da6c2c7ae941768810ab39a408ba))
* **block-tools:** enforce list support in schema ([#4985](https://github.com/portabletext/editor/issues/4985)) ([72c06d3](https://github.com/portabletext/editor/commit/72c06d302e6ca733f23a26cba66be1f0f7053009))
* **block-tools:** fix broken unit tests ([034b10d](https://github.com/portabletext/editor/commit/034b10df70166b8026869851f48fb33978089baa))
* **block-tools:** fix lint errors ([deb8b3c](https://github.com/portabletext/editor/commit/deb8b3c11712ede1ae05f2451e0781cad47550b9))
* **block-tools:** fix Windows issue with gdocs preprocessor rule ([2619afe](https://github.com/portabletext/editor/commit/2619afea94e9c5e43a51766a9b2989aae3e15b86))
* **block-tools:** ignore blocks inside list items ([#3492](https://github.com/portabletext/editor/issues/3492)) ([f20135e](https://github.com/portabletext/editor/commit/f20135e8760dc6738e69f931c3e32a9977676f53))
* **block-tools:** keep strike-through formatting when pasting from gdocs ([#5443](https://github.com/portabletext/editor/issues/5443)) ([6aba418](https://github.com/portabletext/editor/commit/6aba418c208824e9e131767a9ab5d8db88bd5761))
* **block-tools:** more robust formatting detection on copy paste in Safari ([#5485](https://github.com/portabletext/editor/issues/5485)) ([d4cb94c](https://github.com/portabletext/editor/commit/d4cb94cfe717c778cb65e42ef6fd15bc898f1268))
* **block-tools:** preserve whitespace in preprocess for certain html tags ([#4540](https://github.com/portabletext/editor/issues/4540)) ([e74b12e](https://github.com/portabletext/editor/commit/e74b12ec36aabf74e1ecbf8e59a5603aba3f9009))
* **block-tools:** removal of strikethrough in links when copying from gdocs to PTE ([#6382](https://github.com/portabletext/editor/issues/6382)) ([a237b58](https://github.com/portabletext/editor/commit/a237b587c5c448e3767ba2b3eeb2cb5670d1fe02))
* **block-tools:** remove references to implicit globals `document` and `Text` ([#7532](https://github.com/portabletext/editor/issues/7532)) ([9891e7d](https://github.com/portabletext/editor/commit/9891e7d180ff5ada7b6db2fcd1ef228ffc2c3329))
* **deps:** bump `@sanity/pkg-utils` to `v6.10.7` ([#7277](https://github.com/portabletext/editor/issues/7277)) ([1e05ea3](https://github.com/portabletext/editor/commit/1e05ea30b645292b0abf5a79fe14f812da5dbd43))
* **deps:** fix dependency configurations ([8abf82d](https://github.com/portabletext/editor/commit/8abf82d374ef17cd93516d5041732553c782b73c))
* **deps:** Update react monorepo ([#5089](https://github.com/portabletext/editor/issues/5089)) ([07be390](https://github.com/portabletext/editor/commit/07be39091b7b6f0094e3cf0976b0d236338e9dd1))
* **deps:** Update react monorepo ([#6176](https://github.com/portabletext/editor/issues/6176)) ([8be9e60](https://github.com/portabletext/editor/commit/8be9e60a1afbaf32e7616ab2472e5e2924a063c8))
* **deps:** upgrade to `@sanity/pkg-utils@2` ([#4012](https://github.com/portabletext/editor/issues/4012)) ([8962b23](https://github.com/portabletext/editor/commit/8962b2328a13684e0f9de2497ead679b8932ed0f))
* ensure lodash is optimized in every monorepo package ([a91d8c8](https://github.com/portabletext/editor/commit/a91d8c8dcf32d2e2fa33e86be92298f3d9e55bfc))
* pin get-random-values-esm to 1.0.0 ([7231a73](https://github.com/portabletext/editor/commit/7231a73265b62e43182c7f75f130a07618d91e97))
* **portable-text-editor:** copy paste improvements ([#5274](https://github.com/portabletext/editor/issues/5274)) ([da8db9b](https://github.com/portabletext/editor/commit/da8db9bc0b5bebaddf93490bf59addf6186012b5))
* React 19 typings (finally) ([#8171](https://github.com/portabletext/editor/issues/8171)) ([4185d9e](https://github.com/portabletext/editor/commit/4185d9e33244efccdf0470ef78812e74a9701140))
* remove `cleanStegaUnicode` helper ([#6564](https://github.com/portabletext/editor/issues/6564)) ([5dfb932](https://github.com/portabletext/editor/commit/5dfb93208aba191424d1d34d38afe1c802e97b3b))
* run prettier ([bfcc1b2](https://github.com/portabletext/editor/commit/bfcc1b2110acd01d36f042ffa35732e88f635f8d))
* **schema/types:** fix issues with block schema's internal structure ([#5152](https://github.com/portabletext/editor/issues/5152)) ([132788a](https://github.com/portabletext/editor/commit/132788ae94f62a2ac09870d70254cf6cfd838807))
* upgrade to `@sanity/pkg-utils` v5 and use updated ESM best practices ([#5983](https://github.com/portabletext/editor/issues/5983)) ([b619dd1](https://github.com/portabletext/editor/commit/b619dd142e0e9831c57fd28758c04ca5511a07dd))
* use `vercelStegaClean` util from `@vercel/stega` ([#6544](https://github.com/portabletext/editor/issues/6544)) ([b652dc2](https://github.com/portabletext/editor/commit/b652dc2124687af665c90d8f121dac22b4b28e18))
* use workspace protocol for all workspace dependencies ([#6088](https://github.com/portabletext/editor/issues/6088)) ([c5d1d35](https://github.com/portabletext/editor/commit/c5d1d35bce24d5c48b21e8818797b7e05e964542))
* whitelist all standard text decorators in block-tools ([#4526](https://github.com/portabletext/editor/issues/4526)) ([fcc8f13](https://github.com/portabletext/editor/commit/fcc8f13711bcef623db69fcf934b1b14a9cf310f))
