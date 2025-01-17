# Changelog

## [2.0.0](https://github.com/portabletext/editor/compare/block-tools-v1.1.0...block-tools-v2.0.0) (2025-01-17)


### ⚠ BREAKING CHANGES

* Code that accessed types in the Schema namespace must import the types directly instead.

### Features

* allow passing `keyGenerator` to `htmlToBlocks` and `normalizeBlock` ([f25363e](https://github.com/portabletext/editor/commit/f25363e38246737f0be648b87632b9e0f68e01fb))
* **block-tools:** add special notion handling for single block decorators ([#5411](https://github.com/portabletext/editor/issues/5411)) ([87e2866](https://github.com/portabletext/editor/commit/87e2866e72bc64a11fd13f0700174178ad476944))
* **block-tools:** use strict typings ([bf8ba60](https://github.com/portabletext/editor/commit/bf8ba60ef54de52366146eaa03713dc962034531))
* conditionally set maximum search depth in studio search ([#5440](https://github.com/portabletext/editor/issues/5440)) ([e7826ab](https://github.com/portabletext/editor/commit/e7826ab54d3d08fa0ddb49a29dced77620ffcbf8))
* **form-builder:** add field groups ([#3006](https://github.com/portabletext/editor/issues/3006)) ([d8b9378](https://github.com/portabletext/editor/commit/d8b937829cdb282f688661cfa0276c6f0f948c12))
* **i18n:** localize menu items ([#5308](https://github.com/portabletext/editor/issues/5308)) ([cfd693c](https://github.com/portabletext/editor/commit/cfd693ccb56d3e0c7a741ffc3a4849c78c7aa590))
* **i18n:** translate portable text editor ([#5225](https://github.com/portabletext/editor/issues/5225)) ([9846721](https://github.com/portabletext/editor/commit/9846721db3345a6fda80610e20f60cc96aa0916b))
* introduce `@portabletext/block-tools` ([646175b](https://github.com/portabletext/editor/commit/646175bc49097cf6f3e7633d5c8dbef7cb777b30))
* move to react `18` ([#3612](https://github.com/portabletext/editor/issues/3612)) ([7804a45](https://github.com/portabletext/editor/commit/7804a4535fd6a34774b0325befeab0e3784b57e3))
* replaced Schema namespace with plain exports for schema-definitions ([#3699](https://github.com/portabletext/editor/issues/3699)) ([865d85b](https://github.com/portabletext/editor/commit/865d85b811dd6d95f97bd71d15ba25ed94b07f74))


### Bug Fixes

* **@sanity:** issue where hidden unicode characters were bloating document in PTE ([#6440](https://github.com/portabletext/editor/issues/6440)) ([4ca8523](https://github.com/portabletext/editor/commit/4ca8523310e0abfc06c54681edae0d5ac2116549))
* add `node.module` export condition ([#4798](https://github.com/portabletext/editor/issues/4798)) ([078f4dd](https://github.com/portabletext/editor/commit/078f4dd2027608f615967ae2aa7e27d296f4b4e3))
* **base:** add workaround for read-only children ([9dbbe20](https://github.com/portabletext/editor/commit/9dbbe20c09455fc401ca2fb42734e93ee913157b))
* **block-tools:** _markDefs must be class var ([5054c5f](https://github.com/portabletext/editor/commit/5054c5f2be8158b2c007b8b888aa7c788bf99069))
* **block-tools:** enforce list support in schema ([#4985](https://github.com/portabletext/editor/issues/4985)) ([7bdf350](https://github.com/portabletext/editor/commit/7bdf350f9034f8842800b56c112ffcc637c35d72))
* **block-tools:** fix broken unit tests ([44c05b7](https://github.com/portabletext/editor/commit/44c05b79e861977a2e1b63b5502e3af4524e95d1))
* **block-tools:** fix lint errors ([5f341f2](https://github.com/portabletext/editor/commit/5f341f26489709015c3051c5ae485cb4be0608b2))
* **block-tools:** fix Windows issue with gdocs preprocessor rule ([8e8fb11](https://github.com/portabletext/editor/commit/8e8fb11d07070fe685701767f8add2d704df71f8))
* **block-tools:** ignore blocks inside list items ([#3492](https://github.com/portabletext/editor/issues/3492)) ([eadba03](https://github.com/portabletext/editor/commit/eadba0358a3af265abaee7f87a1c0f228d284ed9))
* **block-tools:** keep strike-through formatting when pasting from gdocs ([#5443](https://github.com/portabletext/editor/issues/5443)) ([4f2a134](https://github.com/portabletext/editor/commit/4f2a134e95a259bd9ec0f02f379e8dd2aa41b182))
* **block-tools:** more robust formatting detection on copy paste in Safari ([#5485](https://github.com/portabletext/editor/issues/5485)) ([3120646](https://github.com/portabletext/editor/commit/3120646727da19ddfe84b877a6fd8d932defaa81))
* **block-tools:** preserve whitespace in preprocess for certain html tags ([#4540](https://github.com/portabletext/editor/issues/4540)) ([253876e](https://github.com/portabletext/editor/commit/253876ef3d98791cb123722c5b5cdeaa6698ad07))
* **block-tools:** removal of strikethrough in links when copying from gdocs to PTE ([#6382](https://github.com/portabletext/editor/issues/6382)) ([21cb7c1](https://github.com/portabletext/editor/commit/21cb7c125ed5daab5b9745a61e26d257ae8907e3))
* **block-tools:** remove references to implicit globals `document` and `Text` ([#7532](https://github.com/portabletext/editor/issues/7532)) ([8bba4a6](https://github.com/portabletext/editor/commit/8bba4a60c8d50a63e3a2dd26cbccb0293f3f4a7b))
* **block-tools:** simplify package config ([c033f0d](https://github.com/portabletext/editor/commit/c033f0d48fd9179443e2d5e9fcd8aea3c53589f2))
* **block-tools:** switch module to `commonjs` ([731b6c4](https://github.com/portabletext/editor/commit/731b6c4990450fb86543a96d5b84f48d3c1614f0))
* **block-tools:** switch module type back to `module` ([1bb0432](https://github.com/portabletext/editor/commit/1bb0432838bfba740967641ce643ef2a0e8c695b))
* **deps:** bump `@sanity/pkg-utils` to `v6.10.7` ([#7277](https://github.com/portabletext/editor/issues/7277)) ([6487c5f](https://github.com/portabletext/editor/commit/6487c5f1760fb38e017f5aa62227ad92ab387274))
* **deps:** fix dependency configurations ([ff5ec9b](https://github.com/portabletext/editor/commit/ff5ec9b0acb3a650726d6ec25e3a81e46560ef0b))
* **deps:** Update react monorepo ([#5089](https://github.com/portabletext/editor/issues/5089)) ([31ec76a](https://github.com/portabletext/editor/commit/31ec76a79afbb3473382866ecd316b55c622e49a))
* **deps:** Update react monorepo ([#6176](https://github.com/portabletext/editor/issues/6176)) ([0807869](https://github.com/portabletext/editor/commit/08078691a7809631bc649d08a709b134a4ac20e3))
* **deps:** update sanity monorepo to ^3.70.0 ([676a799](https://github.com/portabletext/editor/commit/676a7997466d359ef0ac578a10be1bb2bac9f76f))
* **deps:** upgrade to `@sanity/pkg-utils@2` ([#4012](https://github.com/portabletext/editor/issues/4012)) ([8244598](https://github.com/portabletext/editor/commit/824459894e558433e60113a39a3e1a0d6b34abb7))
* ensure lodash is optimized in every monorepo package ([ef08e5d](https://github.com/portabletext/editor/commit/ef08e5dae97aea972171c5199a6512a2e9ba7d58))
* pin get-random-values-esm to 1.0.0 ([439e5a2](https://github.com/portabletext/editor/commit/439e5a23df29ebe80ebb0e6e9f8ce04631edad6b))
* **portable-text-editor:** copy paste improvements ([#5274](https://github.com/portabletext/editor/issues/5274)) ([c276221](https://github.com/portabletext/editor/commit/c276221736fd504ec8d6c66c0c6c2de2bdb2daea))
* React 19 typings (finally) ([#8171](https://github.com/portabletext/editor/issues/8171)) ([338e590](https://github.com/portabletext/editor/commit/338e590af1cadc432a1b99801a304b989ffbe6a2))
* remove `cleanStegaUnicode` helper ([#6564](https://github.com/portabletext/editor/issues/6564)) ([f079fb5](https://github.com/portabletext/editor/commit/f079fb53589fd6d0cf78b6161277ee5b312baf85))
* run prettier ([acd120f](https://github.com/portabletext/editor/commit/acd120fffff28460147be5ae92b2b6d4bdc7144c))
* **schema/types:** fix issues with block schema's internal structure ([#5152](https://github.com/portabletext/editor/issues/5152)) ([ef637e9](https://github.com/portabletext/editor/commit/ef637e942d4835ffc7e2a314956ee69ca40b7907))
* upgrade to `@sanity/pkg-utils` v5 and use updated ESM best practices ([#5983](https://github.com/portabletext/editor/issues/5983)) ([e024f8f](https://github.com/portabletext/editor/commit/e024f8f4b40a3c15a24795117bed775a190ab24f))
* use `vercelStegaClean` util from `@vercel/stega` ([#6544](https://github.com/portabletext/editor/issues/6544)) ([44bbf63](https://github.com/portabletext/editor/commit/44bbf6394dbb9a4a13e8b316d533ac588e4c0c36))
* use workspace protocol for all workspace dependencies ([#6088](https://github.com/portabletext/editor/issues/6088)) ([7a3d009](https://github.com/portabletext/editor/commit/7a3d009e908ad92bef4451fb847a43eb6caba430))
* whitelist all standard text decorators in block-tools ([#4526](https://github.com/portabletext/editor/issues/4526)) ([cb48474](https://github.com/portabletext/editor/commit/cb484744fa96d401389e07fee7fd037d43d76a5b))

## [1.1.0](https://github.com/portabletext/editor/compare/block-tools-v1.0.2...block-tools-v1.1.0) (2025-01-15)


### Features

* allow passing `keyGenerator` to `htmlToBlocks` and `normalizeBlock` ([e8a4502](https://github.com/portabletext/editor/commit/e8a4502b44f3bdfbc8bbac5b9ad56df57efc77b9))


### Bug Fixes

* **deps:** update sanity monorepo to ^3.70.0 ([b345181](https://github.com/portabletext/editor/commit/b345181e424e8702f88f5d2f10a0ca7cbce0061e))

## [1.0.2](https://github.com/portabletext/editor/compare/block-tools-v1.0.1...block-tools-v1.0.2) (2025-01-14)


### Bug Fixes

* **block-tools:** simplify package config ([e855e06](https://github.com/portabletext/editor/commit/e855e0614fbc4f407b62df4c3464eec4e993dc14))
* **block-tools:** switch module type back to `module` ([92d8652](https://github.com/portabletext/editor/commit/92d865258f4f6fe0669c4002c4b197f1c6108c19))

## [1.0.1](https://github.com/portabletext/editor/compare/block-tools-v1.0.0...block-tools-v1.0.1) (2025-01-14)


### Bug Fixes

* **block-tools:** switch module to `commonjs` ([9a2d26f](https://github.com/portabletext/editor/commit/9a2d26f24ca75d8cde84e21826599e4e6289b1ba))

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
