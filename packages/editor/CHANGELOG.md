# Changelog

## [1.16.1](https://github.com/portabletext/editor/compare/editor-v1.16.0...editor-v1.16.1) (2024-12-16)


### Bug Fixes

* **event:** replace `toggle readOnly` with `update readOnly` ([0e6efbc](https://github.com/portabletext/editor/commit/0e6efbc70e5e23d4b36a9d4b897809fc00ceb546))

## [1.16.0](https://github.com/portabletext/editor/compare/editor-v1.15.3...editor-v1.16.0) (2024-12-13)


### Features

* add `activeDecorators` to `EditorContext` ([e38e020](https://github.com/portabletext/editor/commit/e38e020ce108864ec3f4a270ec5301cfb9f708d6))
* **selectors:** add `getActiveStyle` and `isActiveStyle` ([37ba256](https://github.com/portabletext/editor/commit/37ba2567b7d299e7263cf4ce513e6184a28d7a14))
* **selectors:** add `getSelectedSpans` ([55b5e9e](https://github.com/portabletext/editor/commit/55b5e9e0beb3340d0e9495629dacf026b0357991))
* **selectors:** add `isActiveAnnotation` ([6f7a172](https://github.com/portabletext/editor/commit/6f7a1725bf086646ff984a8349d89e1004a1046c))
* **selectors:** add `isActiveListItem` ([efd64bf](https://github.com/portabletext/editor/commit/efd64bfe1de4c8f1d401f91381179563fbcbe21c))
* **selectors:** add `isSelection(Collapsed|Expanded)` ([8440022](https://github.com/portabletext/editor/commit/8440022a8743d367ee73ae47427a19d7530f44bf))
* **selectors:** add higher-order `isDecoratorActive` ([4ce4e55](https://github.com/portabletext/editor/commit/4ce4e554de3c107689430c1fde08839beec9841d))


### Bug Fixes

* abort value sync if value hasn't changed ([1590795](https://github.com/portabletext/editor/commit/15907955f391367869ff4d8dd1399ff1f050c97f))
* **deps:** update sanity monorepo to ^3.67.0 ([3526fa5](https://github.com/portabletext/editor/commit/3526fa507a3dce51bb206ca0de045d26730881f3))
* **deps:** update sanity monorepo to ^3.67.1 ([1852219](https://github.com/portabletext/editor/commit/18522190a7eb3194c02b428cb2e2997e539715d0))
* make editor read-only while setting up ([3ff4318](https://github.com/portabletext/editor/commit/3ff431853e7c3a385698f30b2bba7e3f160feb87))
* **perf:** don't emit selection while setting up ([6f92cf2](https://github.com/portabletext/editor/commit/6f92cf29851441059be3e0e346a59b9a35601558))
* **perf:** don't sync range decorations while setting up ([af70759](https://github.com/portabletext/editor/commit/af7075954b035956413317fecb56fbbb67bc214d))
* **selectors:** account for non-span decorators in `isActiveDecorator` ([9e287da](https://github.com/portabletext/editor/commit/9e287da46755fd7bb05069757aaef277f46d40fa))
* **selectors:** rename `isDecoratorActive`-&gt;`isActiveDecorator` ([184f7f6](https://github.com/portabletext/editor/commit/184f7f6ddd86f14cf2ee294a9914b44c99540a7b))
* **selectors:** rename `selectionIsCollapsed`-&gt;`isSelectionCollapsed` ([6d880d0](https://github.com/portabletext/editor/commit/6d880d03440a531f37ccfc9afb9dbdbb6b72c047))

## [1.15.3](https://github.com/portabletext/editor/compare/editor-v1.15.2...editor-v1.15.3) (2024-12-09)


### Bug Fixes

* **behavior:** make `EditorSnapshot.selection` nullable ([a69f570](https://github.com/portabletext/editor/commit/a69f57023ddef599eecca3c30843e5a7a02c3216))
* **behavior:** namespace all `select.*` actions ([7c04667](https://github.com/portabletext/editor/commit/7c046673ec59682df6b8ec39e84476ccbe026b0c))
* **types:** reexport `PortableTextMemberSchemaTypes` as `EditorSchema` ([2d70782](https://github.com/portabletext/editor/commit/2d707825ef41a7f02cee9c3aacaafbe165a62193))

## [1.15.2](https://github.com/portabletext/editor/compare/editor-v1.15.1...editor-v1.15.2) (2024-12-09)


### Bug Fixes

* **behavior:** add `context`/`event` back in `BehaviorActionIntendSet` callback ([af9e9e4](https://github.com/portabletext/editor/commit/af9e9e462d4c14506d27c00d70cc3618eb241dde))
* **behavior:** export behaviors and behavior types from subpath ([618cc16](https://github.com/portabletext/editor/commit/618cc16a338298f4b0826c7c2c02864104069df4))
* **deps:** update react compiler dependencies 🤖 ✨ ([#540](https://github.com/portabletext/editor/issues/540)) ([fe3438a](https://github.com/portabletext/editor/commit/fe3438ace20a1f81b6a9238dcde7fb2244c8753f))

## [1.15.1](https://github.com/portabletext/editor/compare/editor-v1.15.0...editor-v1.15.1) (2024-12-08)


### Bug Fixes

* **deps:** Update slate to v0.112.0 ([6caa85a](https://github.com/portabletext/editor/commit/6caa85aae2ae287e48fd32c20a92e0bd01893df4))

## [1.15.0](https://github.com/portabletext/editor/compare/editor-v1.14.2...editor-v1.15.0) (2024-12-06)


### Features

* support React 19 ([#526](https://github.com/portabletext/editor/issues/526)) ([cb87f1b](https://github.com/portabletext/editor/commit/cb87f1bae5f4e172f20f65c01cbbb7bdf41d7a8d))

## [1.14.2](https://github.com/portabletext/editor/compare/editor-v1.14.1...editor-v1.14.2) (2024-12-06)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.66.1 ([#510](https://github.com/portabletext/editor/issues/510)) ([6d1f0d0](https://github.com/portabletext/editor/commit/6d1f0d0e5401ab8f326388179958ad53fb624a2a))
* **performance regression:** bail out quicker on native behavior events ([437e87e](https://github.com/portabletext/editor/commit/437e87e7efff54f6fea6157462a0391a4317f53e))

## [1.14.1](https://github.com/portabletext/editor/compare/editor-v1.14.0...editor-v1.14.1) (2024-12-06)


### Bug Fixes

* **editor-events:** emit `blurred/focused` instead of `blur/focus` ([30a93d4](https://github.com/portabletext/editor/commit/30a93d4af81f58559aee55d99b07db0284629221))

## [1.14.0](https://github.com/portabletext/editor/compare/editor-v1.13.0...editor-v1.14.0) (2024-12-06)


### Features

* add experimental `useEditorSelector` ([04a290c](https://github.com/portabletext/editor/commit/04a290c7ad7b2d4b156a6f18fbe411fcde920023))
* **behavior:** add 'move block down/up' actions ([d53a844](https://github.com/portabletext/editor/commit/d53a84466259297a187e5bddc1c3bc623c4690de))
* **behavior:** add `blur` event and action ([e4720e5](https://github.com/portabletext/editor/commit/e4720e5b2ee468fba2347239b0db3d5af59c55c0))
* **behavior:** add `insert.inline object` event and action ([39407b8](https://github.com/portabletext/editor/commit/39407b8dee8a8070f0bace569256b7a4e8062819))
* **behavior:** add `list item.toggle` event and `list item.(add|remove|toggle)` actions ([2152950](https://github.com/portabletext/editor/commit/2152950dc11d0ad638c7e67531608841bbe25ec7))
* **behavior:** add `noop` action ([0139a7c](https://github.com/portabletext/editor/commit/0139a7cf7d494eff2d524f175132d82213ff5243))
* **behavior:** add `style.toggle` event and `style.(add|remove|toggle)` actions ([12825bd](https://github.com/portabletext/editor/commit/12825bd4c2ea70ff259847a858b1a8368f539b8a))
* **behavior:** allow code editor behaviors to move multiple blocks ([5da6b4f](https://github.com/portabletext/editor/commit/5da6b4fa324a7ecbc7b722af905da41ee8905172))
* **behavior:** allow imperative `decorator.(add|remove|toggle)` ([bb5fbfd](https://github.com/portabletext/editor/commit/bb5fbfd0e2199c8997aa436783e73c7e2d07e54c))
* **behavior:** allow imperative `insert block object` ([eaeb5ed](https://github.com/portabletext/editor/commit/eaeb5ed1a413a34ba5f5421d9bdc8c3579201ea9))
* **behavior:** allow imperative `insert.inline object` ([3ddf73d](https://github.com/portabletext/editor/commit/3ddf73d1347f4b11ed8933622d1fd3ace16054bd))
* **behavior:** allow imperative `list item.toggle` ([3927074](https://github.com/portabletext/editor/commit/39270745a968f7973e1133f83957525dbac8cf79))
* **behavior:** allow imperative `style.toggle` ([174b64d](https://github.com/portabletext/editor/commit/174b64d002aed98e427bb26f0cb9305fed3a329d))
* export experimental `getActiveListItem` selector ([2fd7261](https://github.com/portabletext/editor/commit/2fd72612eb5df50712efef5e9c428db3855cb09a))


### Bug Fixes

* **behavior:** '(un)set block' actions now only accept one path ([35ed503](https://github.com/portabletext/editor/commit/35ed5030e517a219547b813327d4621436026ff0))
* **behavior:** mark `editable` as `_internal` ([a8156fc](https://github.com/portabletext/editor/commit/a8156fccc58ec0c8004c5c6a4e7706ade51c4b6b))
* **behavior:** merge `EditorContext` and `EditorState` into `EditorSnapshot` ([27ee5ac](https://github.com/portabletext/editor/commit/27ee5ac0e3df43589ecf0eaf53a1dca4c4ddb1a0))
* **behavior:** move `schema` from `EditorState` to `EditorContext` ([cc3d61b](https://github.com/portabletext/editor/commit/cc3d61bc4de423ae8bc49e8ec45cd6caad39773d))
* **behavior:** namespace all `delete.*` events and actions ([915d373](https://github.com/portabletext/editor/commit/915d373bd24e9e5f66208f1015bdef09382d4948))
* **behavior:** namespace all `insert.*` events and actions ([982cc9e](https://github.com/portabletext/editor/commit/982cc9ec66a56e98fa8d9a0bf3cabbad0b7d9250))
* **behavior:** namespace all `move.*` actions ([46b1249](https://github.com/portabletext/editor/commit/46b124996eb4e3ab559d5cd4ddadb96a80e85604))
* **behavior:** remove `noop` event ([763fdff](https://github.com/portabletext/editor/commit/763fdffde290e2f86db7e7cdaf5072c6a3ae7ad2))
* **behavior:** rename `(set|unset) block` to `text block.(set|unset)` ([0ef0396](https://github.com/portabletext/editor/commit/0ef039669e5256a73e23da3386f9026ad61c6981))
* **behavior:** rename `BehaviorContext`-&gt;`EditorState` ([88fd672](https://github.com/portabletext/editor/commit/88fd672716da84a6707b53cfb5eaf26388a97a1e))
* **behavior:** rename `blockPath`-&gt;`at` in 'move block' action ([4bb435e](https://github.com/portabletext/editor/commit/4bb435ee68687715e8180fe24674dad14143857b))
* **behavior:** rename `config`-&gt;`initialConfig` ([48718be](https://github.com/portabletext/editor/commit/48718be23346d084bc574db1ffd5bf88938634a3))
* **behavior:** rename `useEditorContext`-&gt;`useEditor` ([927e165](https://github.com/portabletext/editor/commit/927e1650b97506f3a59aa869a757f901b04df0bd))
* **behavior:** route legacy focus method through behaviors ([3d091c7](https://github.com/portabletext/editor/commit/3d091c791d6516b1e7f65bfbe404059711a5dc37))
* **behavior:** simplify `BehaviorActionIntendSet` callback ([a6f9a48](https://github.com/portabletext/editor/commit/a6f9a48f2c402024deac4fbec26855aefe858789))
* **deps:** update sanity monorepo to ^3.66.0 ([#505](https://github.com/portabletext/editor/issues/505)) ([58fa31e](https://github.com/portabletext/editor/commit/58fa31e623b4f8c2a3f25a0a8827a11dbfbb82c9))
* guard against nullable target block when producing move node patch ([eb7049f](https://github.com/portabletext/editor/commit/eb7049f80cd05de8f62077decf8726c6397bfcf3))
* **selectors:** export all experimental selectors ([cf042a7](https://github.com/portabletext/editor/commit/cf042a7e611db753a04f2d5e06c07e09aa4fbcef))
* switch to `"type": "module"` ([a8c7c78](https://github.com/portabletext/editor/commit/a8c7c789e750dfa4699d06b8b2311e42786d5210))

## [1.13.0](https://github.com/portabletext/editor/compare/editor-v1.12.3...editor-v1.13.0) (2024-12-03)


### Features

* **behavior:** add 'copy' event ([54db5e9](https://github.com/portabletext/editor/commit/54db5e978f36371e3e64453c97382a9c653208cd))
* **behavior:** add 'key.down' and 'key.up' events ([99d7335](https://github.com/portabletext/editor/commit/99d733520d48e34098ac7702720d7a3c96149616))
* **behavior:** add 'move block' action ([69a259e](https://github.com/portabletext/editor/commit/69a259e5f144df97833bfa2d222a36afb2deea46))
* **behavior:** add 'select previous block' and 'select next block' actions ([9b5fecb](https://github.com/portabletext/editor/commit/9b5fecb34deeab0805f2d8d0c2712ba205706e92))
* **behavior:** ship experimental code editor behaviors ([b97b218](https://github.com/portabletext/editor/commit/b97b218b9a696c71d1e1a517c5dd6e6d72a5d071))


### Bug Fixes

* **behavior:** allow guards to return falsy ([21cb638](https://github.com/portabletext/editor/commit/21cb638bf3baad74f6937bb79c73505c7e94958f))
* **behavior:** fix `selectionIsCollapsed` utility function ([dd67720](https://github.com/portabletext/editor/commit/dd67720c7418eb9120ad5d7e0f008766f55a9f59))
* **behavior:** rename `clipboardData`-&gt;`data` ([6e139c8](https://github.com/portabletext/editor/commit/6e139c80986585c9d93f61053eb0781e8d532f70))
* **behavior:** use React event as 'native' event ([35a9fcf](https://github.com/portabletext/editor/commit/35a9fcfc9822443da450fae802b5905d06ba6ede))
* make sure you can hit Enter on an expanded selection ([d2ebbbe](https://github.com/portabletext/editor/commit/d2ebbbe90e4f977970476c149bf0b74427c910ae))
* remove decorators from new block when splitting empty decorated block ([109b7c4](https://github.com/portabletext/editor/commit/109b7c41465813bb9b8b9e0780e6f695b00bc678))

## [1.12.3](https://github.com/portabletext/editor/compare/editor-v1.12.2...editor-v1.12.3) (2024-11-29)


### Bug Fixes

* **deps:** inline and simplify `isHotkey` dependency ([2040452](https://github.com/portabletext/editor/commit/2040452f1bd311748349a523a5cd30dd487299d6))

## [1.12.2](https://github.com/portabletext/editor/compare/editor-v1.12.1...editor-v1.12.2) (2024-11-28)


### Bug Fixes

* **markdown behavior:** fix ordered list matcher regex ([4ca9114](https://github.com/portabletext/editor/commit/4ca911413a63e013f4af9dee99886cc634170f0a))
* **markdown behavior:** make list toggling disregard spans ([3b996bd](https://github.com/portabletext/editor/commit/3b996bdab1414492bb02065ba1f9d708d178e725))

## [1.12.1](https://github.com/portabletext/editor/compare/editor-v1.12.0...editor-v1.12.1) (2024-11-28)


### Bug Fixes

* **behavior:** allow inserting blocks 'before' ([f66b3b6](https://github.com/portabletext/editor/commit/f66b3b6ea5e28660fd648b8a6159514b6f62f8de))
* **deps:** Update sanity monorepo to ^3.65.0 ([6062310](https://github.com/portabletext/editor/commit/60623109400a114a89a7d6f3f60fd1b58c1cf783))
* **deps:** Update sanity monorepo to ^3.65.1 ([ef4c370](https://github.com/portabletext/editor/commit/ef4c3700b53ae23d3958d9d1d407d826dd0f94c6))
* **markdown behavior:** allow inserting hr with trailing content ([c0eb8e0](https://github.com/portabletext/editor/commit/c0eb8e0bb4672cc17ef57c9e06f5bed0ba6a4112))

## [1.12.0](https://github.com/portabletext/editor/compare/editor-v1.11.3...editor-v1.12.0) (2024-11-26)


### Features

* **behavior:** add 'delete block' action ([bb111ea](https://github.com/portabletext/editor/commit/bb111ea65f22a4ccf671a0c6dce8c020f46ca87e))
* **behavior:** improve 'insert text block' action ([81c90e2](https://github.com/portabletext/editor/commit/81c90e207cf5d71a221e6146b1722ef523d4d776))
* **markdown behavior:** support pasting horisontal rules ([27fecc9](https://github.com/portabletext/editor/commit/27fecc960bd2d9b9b339cef3601f3409908500da))


### Bug Fixes

* **behavior:** add 'delete text' and remove 'delete' action ([29a2c95](https://github.com/portabletext/editor/commit/29a2c95c27fca2ad95cfd9bfb86c63c956384109))
* **markdown behavior:** ignore spans in auto blockquote/heading/llist behaviors ([a1cd1ee](https://github.com/portabletext/editor/commit/a1cd1eeac45939575bbb019febe115d401b1815a))


### Dependencies

* The following workspace dependencies were updated
  * devDependencies
    * racejar bumped to 1.0.0

## [1.11.3](https://github.com/portabletext/editor/compare/editor-v1.11.2...editor-v1.11.3) (2024-11-25)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#456](https://github.com/portabletext/editor/issues/456)) ([bb70432](https://github.com/portabletext/editor/commit/bb70432c97c3cc3bb5ba2b85e2629df5112ca531))

## [1.11.2](https://github.com/portabletext/editor/compare/editor-v1.11.1...editor-v1.11.2) (2024-11-22)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.64.3 ([ad0da8f](https://github.com/portabletext/editor/commit/ad0da8fad181adc9ff74b13abdb187297e76cf93))
* make sure a subsequent empty action set can't trigger a default action ([50f34b4](https://github.com/portabletext/editor/commit/50f34b47d40db908a57ffe7c6823b767fa2084c6))

## [1.11.1](https://github.com/portabletext/editor/compare/editor-v1.11.0...editor-v1.11.1) (2024-11-21)


### Bug Fixes

* **regression:** don't block operations when readOnly ([c35f646](https://github.com/portabletext/editor/commit/c35f646c13015c58136d7c6394acbb488d308f29))

## [1.11.0](https://github.com/portabletext/editor/compare/editor-v1.10.2...editor-v1.11.0) (2024-11-21)


### Features

* add `EditorProvider` and `EditorEventListener` ([55edcde](https://github.com/portabletext/editor/commit/55edcde2262e2b798b79cff33b594855f1ff8808))


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.64.2 ([7b6d138](https://github.com/portabletext/editor/commit/7b6d1389165919745c9213a5d63f92e46ca59021))
* **useEditor:** allow configure of initial readOnly and remove Editor.readOnly ([edcee2c](https://github.com/portabletext/editor/commit/edcee2cfcbc7b3b31f824292dfc6ad6f1aca3cf5))
* **useEditor:** improve types and memoization ([41ef38a](https://github.com/portabletext/editor/commit/41ef38a9ea6132cf701d03bf193ed9a457ce609f))

## [1.10.2](https://github.com/portabletext/editor/compare/editor-v1.10.1...editor-v1.10.2) (2024-11-18)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#430](https://github.com/portabletext/editor/issues/430)) ([ea98c12](https://github.com/portabletext/editor/commit/ea98c12400a8a3a172dd20c93d4f828f0266461a))
* remove online/offline listener ([3395d62](https://github.com/portabletext/editor/commit/3395d62fc3e2a9a5bf6c79e49e522784a8ec7c94))

## [1.10.1](https://github.com/portabletext/editor/compare/editor-v1.10.0...editor-v1.10.1) (2024-11-18)


### Bug Fixes

* **experimental `useEditor`:** move value update handling to `editor` ([c064849](https://github.com/portabletext/editor/commit/c06484977a4e0055d5e25005eeebfe88f9214341))
* **experimental `useEditor`:** remove `editorRef` prop ([2b9c07c](https://github.com/portabletext/editor/commit/2b9c07c74c08c868d13540de3d37fc28a94649cf))
* guard against possibly undefined `window` ([34836ca](https://github.com/portabletext/editor/commit/34836caf038f66b413f4f8ec6e8c33084817224c))

## [1.10.0](https://github.com/portabletext/editor/compare/editor-v1.9.0...editor-v1.10.0) (2024-11-15)


### Features

* **markdown behavior:** support * and _ for horizontal rules ([1e13952](https://github.com/portabletext/editor/commit/1e139523cdeea7935cb3041d511d7532a2bb8de8))


### Bug Fixes

* **link behavior:** rename mapLinkAnnotation-&gt;linkAnnotation ([602ea1f](https://github.com/portabletext/editor/commit/602ea1f2065eae3ed4915e01d82c4561226b012a))
* **markdown behavior:** rename and clean up schema mappings ([23b1450](https://github.com/portabletext/editor/commit/23b1450024eea58a6bfeed96a9902548cc96cf4e))

## [1.9.0](https://github.com/portabletext/editor/compare/editor-v1.8.0...editor-v1.9.0) (2024-11-15)


### Features

* **behavior:** export small link behaviors plugin ([5ca657e](https://github.com/portabletext/editor/commit/5ca657eafc70ba7dd34ad57fd3ccd342c310f4ea))
* **behavior:** support 'insert span' action ([f5a8531](https://github.com/portabletext/editor/commit/f5a85311ab40d11a6470d6705aa7060d39b79c6c))
* **behavior:** support 'paste' action and event ([8844ae4](https://github.com/portabletext/editor/commit/8844ae456aecbc3e748f210208483b629e96a512))


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.64.1 ([0e9ec3d](https://github.com/portabletext/editor/commit/0e9ec3da435bcc4f6cb612c585d70680d9e054c4))
* fix isMarkActive false positive when only selecting objects ([05cccad](https://github.com/portabletext/editor/commit/05cccada65eb8fab3b73a023eba700e86150b0e0))
* fix issue with expanded selection potentially removing selection ([fe01442](https://github.com/portabletext/editor/commit/fe01442b16c001330dd9ba4dd78d6bccf322dbeb))
* only prevent default paste event when necessary ([49303e2](https://github.com/portabletext/editor/commit/49303e22ef802d5edc52dac7b098a371fa42d58b))

## [1.8.0](https://github.com/portabletext/editor/compare/editor-v1.7.1...editor-v1.8.0) (2024-11-13)


### Features

* **behavior:** support 'insert block object' action ([d45b230](https://github.com/portabletext/editor/commit/d45b2305b4f40870e1cc490688c726cdaf42854c))
* **markdown behavior:** add automatic break behavior ([36821d7](https://github.com/portabletext/editor/commit/36821d7cb9f276401a68ef8389015918e0d918cb))


### Bug Fixes

* **markdown behavior:** make all schema mapping optional ([388ae38](https://github.com/portabletext/editor/commit/388ae3852df39c78a05a7641969eebd3f6b24d03))
* remove unneeded export ([69985b4](https://github.com/portabletext/editor/commit/69985b4289d5179b4afc6ae32fe012f6f5927ff9))

## [1.7.1](https://github.com/portabletext/editor/compare/editor-v1.7.0...editor-v1.7.1) (2024-11-13)


### Bug Fixes

* **deps:** update dependency @xstate/react to v5 ([65cebaa](https://github.com/portabletext/editor/commit/65cebaaf8541978dfdcaae85b7fae7a9ac5629a2))
* **deps:** update dependency xstate to v5.19.0 ([b90e0c4](https://github.com/portabletext/editor/commit/b90e0c4c7ac9a14db0abad52151c0daff8e52a37))
* **deps:** Update sanity monorepo to ^3.64.0 ([ba0fc26](https://github.com/portabletext/editor/commit/ba0fc26736d69d7aef6a92b0a60fa9b74f462b02))
* move Slate editor teardown logic to createSlateEditor ([e353c64](https://github.com/portabletext/editor/commit/e353c649159df5b3c9d0db96bdff5843703ba2cf))

## [1.7.0](https://github.com/portabletext/editor/compare/editor-v1.6.1...editor-v1.7.0) (2024-11-12)


### Features

* **behavior:** add annotation.(add|remove|toggle) events and actions ([9b6a334](https://github.com/portabletext/editor/commit/9b6a334bbf0dc80a77f17f5948e701e862c0004f))
* **behavior:** support for imperative annotation.(add|remove|toggle) and focus ([1b7b374](https://github.com/portabletext/editor/commit/1b7b374a00b93b74d3a2aef7b6d69589b0c751dc))


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([6551392](https://github.com/portabletext/editor/commit/65513924603ee2b10a8d4c9a02fac73acd4fd250))
* **internals:** create Slate editor outside of React ([1c11745](https://github.com/portabletext/editor/commit/1c11745d3d7d0661599df99c1f1243c53d89557e))
* remove @sanity/util dependency ([c11c44c](https://github.com/portabletext/editor/commit/c11c44c46b3965510c290c0ca656efc7baf9068c))

## [1.6.1](https://github.com/portabletext/editor/compare/editor-v1.6.0...editor-v1.6.1) (2024-11-07)


### Bug Fixes

* **react-compiler:** handle mutation violation ([#338](https://github.com/portabletext/editor/issues/338)) ([1e6ea1c](https://github.com/portabletext/editor/commit/1e6ea1cb27acfb4585d69739a83855cf6f5a04bc))

## [1.6.0](https://github.com/portabletext/editor/compare/editor-v1.5.6...editor-v1.6.0) (2024-11-07)


### Features

* **behavior:** add decorator.(add|remove|toggle) events and actions ([42fc03b](https://github.com/portabletext/editor/commit/42fc03b19ec7cd95ca8e4ef9fae79c1723cad7f1))


### Bug Fixes

* **markdown behavior:** explicitly set default style when toggling list ([c8575d2](https://github.com/portabletext/editor/commit/c8575d2c0394a6aaa118190fa65057cc2f228e86))

## [1.5.6](https://github.com/portabletext/editor/compare/editor-v1.5.5...editor-v1.5.6) (2024-11-07)


### Bug Fixes

* **deps:** update react compiler dependencies 🤖 ✨ ([#383](https://github.com/portabletext/editor/issues/383)) ([be449e1](https://github.com/portabletext/editor/commit/be449e1f393c7d88fe095b9d65ee96a31e6d9fb5))

## [1.5.5](https://github.com/portabletext/editor/compare/editor-v1.5.4...editor-v1.5.5) (2024-11-06)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.63.0 ([#375](https://github.com/portabletext/editor/issues/375)) ([c9f9289](https://github.com/portabletext/editor/commit/c9f9289cebd71ffc14e00646bf839070729dd5c1))
* **markdown behavior:** allow automatic headings in non-empty block ([8f3c0cb](https://github.com/portabletext/editor/commit/8f3c0cb7819089d8586eaa6d2b23ee012f85e02a))
* **markdown behavior:** clear style on backspace in non-empty block ([8bd2011](https://github.com/portabletext/editor/commit/8bd2011c9715d2ffb669bad598c357d88107745c))
* **markdown behavior:** fix automatic blockquote edge cases ([4da37fa](https://github.com/portabletext/editor/commit/4da37fa4702a82cffa97318c34261b7a8ca66bfb))
* **markdown behavior:** fix automatic list edge cases ([d3a55a2](https://github.com/portabletext/editor/commit/d3a55a2c57e09f745ce858d43d90dc2eca8b4165))
* **markdown behavior:** prevent automatic heading if caret is not at the end of heading ([cb4f3b7](https://github.com/portabletext/editor/commit/cb4f3b7a27793c7579a64fcb664da57e10635d1f))
* skip undo history logic hwne changing remotely or undoing/redoing ([6c54599](https://github.com/portabletext/editor/commit/6c545994d4491b6c494d8fc10df31f64c5b7f052))

## [1.5.4](https://github.com/portabletext/editor/compare/editor-v1.5.3...editor-v1.5.4) (2024-11-04)


### Bug Fixes

* **deps:** update dependency react-compiler-runtime to v19.0.0-beta-9ee70a1-20241017 ([bbe5ebd](https://github.com/portabletext/editor/commit/bbe5ebda017092d25a414420485283eff5b20999))
* merge spans with same but different-ordered marks ([cf72032](https://github.com/portabletext/editor/commit/cf7203215cb530b0aa963f950c60f71ceca6acd9))

## [1.5.3](https://github.com/portabletext/editor/compare/editor-v1.5.2...editor-v1.5.3) (2024-11-04)


### Bug Fixes

* fix edge case related to writing next to annotated decorator ([0747807](https://github.com/portabletext/editor/commit/0747807ff654d2abf056503ea311398ad75047da))
* fix HMR issue related to schema compilation ([6806ab6](https://github.com/portabletext/editor/commit/6806ab6475415fb9badbde4c84c88afcb6753efa))

## [1.5.2](https://github.com/portabletext/editor/compare/editor-v1.5.1...editor-v1.5.2) (2024-11-04)


### Bug Fixes

* allow core behaviors to be overwritten ([08b5924](https://github.com/portabletext/editor/commit/08b592495a4bbb3170d829de46c6aa3fc456e06a))
* **markdown behavior:** clear list props before applying heading style ([74d5b03](https://github.com/portabletext/editor/commit/74d5b0343221b0dec9057b26019e1c06749765f3))

## [1.5.1](https://github.com/portabletext/editor/compare/editor-v1.5.0...editor-v1.5.1) (2024-11-03)


### Bug Fixes

* **types:** re-export PortableTextChild ([63756d1](https://github.com/portabletext/editor/commit/63756d10eea97f63a9510c43150886157ef79fff))

## [1.5.0](https://github.com/portabletext/editor/compare/editor-v1.4.1...editor-v1.5.0) (2024-11-03)


### Features

* allow passing a simple schema definition to useEditor ([b25316d](https://github.com/portabletext/editor/commit/b25316dbef244f590b9156950c1f7af8b00a9137))


### Bug Fixes

* **types:** re-export PortableTextBlock ([494d9db](https://github.com/portabletext/editor/commit/494d9db4d00430bd490bf8a7d26ea0e7fc261070))

## [1.4.1](https://github.com/portabletext/editor/compare/editor-v1.4.0...editor-v1.4.1) (2024-11-03)


### Bug Fixes

* **deps:** update dependency slate-react to v0.111.0 ([995bbe5](https://github.com/portabletext/editor/commit/995bbe5e43f62061c4ebe8a71403c26c2a3acbea))
* move `@xstate/react` from dev to production dependency ([861e6b6](https://github.com/portabletext/editor/commit/861e6b6dd2da66243d6ffa818b0159ed4251b02a))

## [1.4.0](https://github.com/portabletext/editor/compare/editor-v1.3.1...editor-v1.4.0) (2024-11-01)


### Features

* add new `PortableTextEditor.editor` prop with access to Behavior API ([39f5484](https://github.com/portabletext/editor/commit/39f5484ffbe9fe5020e3ba5c2e4ea087d6c52163))
* add optional markdown behaviors ([7994b43](https://github.com/portabletext/editor/commit/7994b43465725a0aaaaeb5c963bf1d76d430c6e4))

## [1.3.1](https://github.com/portabletext/editor/compare/editor-v1.3.0...editor-v1.3.1) (2024-11-01)


### Bug Fixes

* **performance:** allow `Synchronizer` to be compiled ([#327](https://github.com/portabletext/editor/issues/327)) ([1a086f0](https://github.com/portabletext/editor/commit/1a086f0993c9f7a37061274f756d8ef56c42da89))
* route remote patches through editor machine ([b586f24](https://github.com/portabletext/editor/commit/b586f249dc79d0bab09e3b91261877645ff8c8ec))

## [1.3.0](https://github.com/portabletext/editor/compare/editor-v1.2.1...editor-v1.3.0) (2024-11-01)


### Features

* use react-compiler to optimise render ([#319](https://github.com/portabletext/editor/issues/319)) ([35b6c27](https://github.com/portabletext/editor/commit/35b6c27ea1a12ae2bd725f2d15a79fcc15c930ec))

## [1.2.1](https://github.com/portabletext/editor/compare/editor-v1.2.0...editor-v1.2.1) (2024-11-01)


### Bug Fixes

* fix edge cases related to toggling decorators next to other marks ([75776f8](https://github.com/portabletext/editor/commit/75776f8634e5f99c3a54d3c46a720ab570ca30e0))

## [1.2.0](https://github.com/portabletext/editor/compare/editor-v1.1.12...editor-v1.2.0) (2024-10-31)


### Features

* **editor:** better built-in list keyboard shortcuts ([0f77347](https://github.com/portabletext/editor/commit/0f773475d808f7d32111ddd1f739c57bca3ea886))

## [1.1.12](https://github.com/portabletext/editor/compare/editor-v1.1.11...editor-v1.1.12) (2024-10-31)


### Bug Fixes

* **editor:** handle edge case with deleting empty text blocks next to block objects ([3e7e815](https://github.com/portabletext/editor/commit/3e7e81516b1b5e0a45b7dc84a0f38df2303a34df))
* handle `exhaustive-deps` violations ([#322](https://github.com/portabletext/editor/issues/322)) ([cb29da2](https://github.com/portabletext/editor/commit/cb29da2b6a00d7fb47c519316a274f4bb179bf72))

## [1.1.11](https://github.com/portabletext/editor/compare/editor-v1.1.10...editor-v1.1.11) (2024-10-30)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.62.3 ([122f5b1](https://github.com/portabletext/editor/commit/122f5b1c3b85c597fe0dbc5bf63afeabec342f23))
* **editor:** refactor internal Behavior API ([5de869b](https://github.com/portabletext/editor/commit/5de869b84e281de6e975600964e484ba26cc3293))

## [1.1.10](https://github.com/portabletext/editor/compare/editor-v1.1.9...editor-v1.1.10) (2024-10-29)


### Bug Fixes

* **editor:** preserve list properties when splitting at the end (regression) ([a7e8578](https://github.com/portabletext/editor/commit/a7e85783686ab75279d8187d76e7e69bf58b285b))
* **editor:** preserve list properties when splitting at the start ([e47d150](https://github.com/portabletext/editor/commit/e47d1500960eea1ec0036f184eedfe024c861ef0))

## [1.1.9](https://github.com/portabletext/editor/compare/editor-v1.1.8...editor-v1.1.9) (2024-10-28)


### Bug Fixes

* **editor:** fix Firefox inconsistency with inserting text before decorator ([61f4caf](https://github.com/portabletext/editor/commit/61f4cafd7e1a2aad36a116cfbad39834a13bba37))

## [1.1.8](https://github.com/portabletext/editor/compare/editor-v1.1.7...editor-v1.1.8) (2024-10-28)


### Bug Fixes

* **editor:** fix inconsistency with break insertion in styled block ([af6aebb](https://github.com/portabletext/editor/commit/af6aebb1c114a62d7740e9c6c73b1ea118e03838))

## [1.1.7](https://github.com/portabletext/editor/compare/editor-v1.1.6...editor-v1.1.7) (2024-10-24)


### Bug Fixes

* **deps:** update dependency slate-react to v0.110.3 ([71e565a](https://github.com/portabletext/editor/commit/71e565a0844476f11c621024acdcee71567b99c6))
* **deps:** Update sanity monorepo to ^3.62.2 ([2d0cedc](https://github.com/portabletext/editor/commit/2d0cedc7bf9245c536a22b8620178f351bf844f2))

## [1.1.6](https://github.com/portabletext/editor/compare/editor-v1.1.5...editor-v1.1.6) (2024-10-24)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.62.0 ([1124a41](https://github.com/portabletext/editor/commit/1124a41bcf768ca2b118792a5b8e20d0052d595a))
* **deps:** Update sanity monorepo to ^3.62.1 ([2d019b3](https://github.com/portabletext/editor/commit/2d019b3ca19bef4d0ae9a0dd34f929fdd489f6d1))
* **editor:** fix inconsistency with text insertion in decorated annotation ([a85fff2](https://github.com/portabletext/editor/commit/a85fff21b16c90a349498b9c3b15a5d2a56ab000))
* **editor:** preserve decorators when removing all-decorated text ([46f299a](https://github.com/portabletext/editor/commit/46f299a164f4a869c9ffe4e6d4b8d6ff18302839))
* **editor:** use OS-aware undo/redo shortcuts ([8dac26d](https://github.com/portabletext/editor/commit/8dac26dd2de4822e9b833bd18e23e2feb87d7134))

## [1.1.5](https://github.com/portabletext/editor/compare/editor-v1.1.4...editor-v1.1.5) (2024-10-21)


### Bug Fixes

* **deps:** Update sanity monorepo to ^3.60.0 ([81f3e3f](https://github.com/portabletext/editor/commit/81f3e3f7a495286c750603f02c2cfb4d40463483))
* **deps:** Update sanity monorepo to ^3.61.0 ([556f18c](https://github.com/portabletext/editor/commit/556f18c95c1b260c98111a2b020949d455e47704))
* **deps:** Update slate to v0.110.2 ([ccb3ee1](https://github.com/portabletext/editor/commit/ccb3ee130fad51d74a8ee253a43200e70eab6924))
* **editor:** fix PortableTextEditable type ([bb74c5c](https://github.com/portabletext/editor/commit/bb74c5c372c1811f94d2d62cb39e80cd911660bf))
* **editor:** programmatically select ArrowDown-inserted text block ([a136ae0](https://github.com/portabletext/editor/commit/a136ae097f8bef4927b5827183b25f5c68e1dcb5))

## [1.1.4](https://github.com/portabletext/editor/compare/editor-v1.1.3...editor-v1.1.4) (2024-10-04)


### Bug Fixes

* **editor:** treat annotations as proper boundaries ([2553d72](https://github.com/portabletext/editor/commit/2553d72bbdee1e5017a1baedccc568bf392456af))

## [1.1.3](https://github.com/portabletext/editor/compare/editor-v1.1.2...editor-v1.1.3) (2024-10-03)


### Bug Fixes

* **editor:** fix inconsistency with text insertion after inline object, before annotation ([ad47833](https://github.com/portabletext/editor/commit/ad4783365655d911b8050d9a6763e87b68c8a960))
* **editor:** fix inconsistency with text insertion before annotation ([333e559](https://github.com/portabletext/editor/commit/333e5596acaf6acdcd4ab4dbbdb128279ccad945))

## [1.1.2](https://github.com/portabletext/editor/compare/editor-v1.1.1...editor-v1.1.2) (2024-10-01)


### Bug Fixes

* **deps:** update dependency @sanity/ui to ^2.8.9 ([59a66f8](https://github.com/portabletext/editor/commit/59a66f84a1c5a0581faa6629a531affbbb5053fc))
* **deps:** update dependency rxjs to ^7.8.1 ([479d764](https://github.com/portabletext/editor/commit/479d7648e8b8aa356d47daa4e3948832b9e39456))
* **deps:** update dependency slate-react to v0.110.1 ([0abe247](https://github.com/portabletext/editor/commit/0abe2475ea9f15f232dceea5c9e336358d16da68))
* **deps:** update dependency styled-components to ^6.1.13 ([8f5322e](https://github.com/portabletext/editor/commit/8f5322e38dccc9bc4d1bc86becdb5278ca1617f5))
* **editor:** add missing return after normalization ([262f5fb](https://github.com/portabletext/editor/commit/262f5fb849c9051db3997f6f925d67bb6760de04))
* **editor:** avoid emitting loading state for sync task ([1ad52a3](https://github.com/portabletext/editor/commit/1ad52a3e5803c5f27dbd132544b0ed556ea3e787))
* **editor:** defer patch/mutation changes until the editor is dirty ([c40f5df](https://github.com/portabletext/editor/commit/c40f5dff98a3013e95735363bdd32374afb89ff3))
* **editor:** remove initial loading state ([e1fc90d](https://github.com/portabletext/editor/commit/e1fc90dd4bd6b05b8fcd33b32b10e5d81cf46f18))
* **editor:** remove redundant validation ([d2cac6c](https://github.com/portabletext/editor/commit/d2cac6cf509bbf06ff9fa9043a2293e6c77213ae))

## [1.1.1](https://github.com/portabletext/editor/compare/editor-v1.1.0...editor-v1.1.1) (2024-09-16)


### Bug Fixes

* **editor:** only reset range decoration state if necessary ([9212008](https://github.com/portabletext/editor/commit/9212008f769c1d7453aae839a1e6a18f22e58613))

## [1.1.0](https://github.com/portabletext/editor/compare/editor-v1.0.19...editor-v1.1.0) (2024-09-12)


### Features

* **editor:** support annotations across blocks, annotations and decorators ([50266f5](https://github.com/portabletext/editor/commit/50266f54d3e60bc5187816fbff56043399a69cf5))


### Bug Fixes

* **editor:** a collapsed selection can now toggle off an entire annotation ([dbc1cee](https://github.com/portabletext/editor/commit/dbc1ceec4ff82d8e0719649cb70d74b0f9b5dae8))
* **editor:** allow empty block to be decorated ([d944641](https://github.com/portabletext/editor/commit/d944641f955e519657e959569142ad0bdf82830f))
* **editor:** allow trailing empty line in a cross-selected to be decorated ([5f8866d](https://github.com/portabletext/editor/commit/5f8866d0e602dd59af4f5d32ffa5fa4721f6e374))
* **editor:** assign new keys to annotations split across blocks ([5976628](https://github.com/portabletext/editor/commit/5976628fc88282a0676590fedafcf0326004b789))
* **editor:** avoid extra newline when splitting block at the edge of decorator ([0fd05f0](https://github.com/portabletext/editor/commit/0fd05f0331fc1cfaba69aee5a3c37b8c17a99a8e))
* **editor:** dedupe markDefs based on their _key ([c81525b](https://github.com/portabletext/editor/commit/c81525bbe3d1b17c4f770d21a2aa75b1447fed6f))
* **editor:** make sure text blocks always have markDefs ([0ec7e70](https://github.com/portabletext/editor/commit/0ec7e707265f8614328e9574f838061df138f7f3))
* **editor:** preserve decorator when splitting block at the beginning ([fa76d4b](https://github.com/portabletext/editor/commit/fa76d4ba98ca480f9a4d346271f0363c7dbfa41b))
* **editor:** pressing backspace before a block object now deletes it ([4c6474c](https://github.com/portabletext/editor/commit/4c6474c0ae2aef798da2e1c90b1eef5fc179526d))

## [1.0.19](https://github.com/portabletext/editor/compare/editor-v1.0.18...editor-v1.0.19) (2024-08-29)


### Bug Fixes

* **editor:** avoid adding annotation if focus span is empty ([64df227](https://github.com/portabletext/editor/commit/64df227d4e375e8aea127e6fb3925f3390d259c3))

## [1.0.18](https://github.com/portabletext/editor/compare/editor-v1.0.17...editor-v1.0.18) (2024-08-26)


### Bug Fixes

* **editor:** bail out of ambiguous merge (set/unset) patch creation ([db9b470](https://github.com/portabletext/editor/commit/db9b47004bbc5834c603bd115be11dc90d0743a0))
* **editor:** bail out of ambiguous unset patch creation ([d0cdb39](https://github.com/portabletext/editor/commit/d0cdb3932a6b787caa57d50122e174591793e56b))

## [1.0.17](https://github.com/portabletext/editor/compare/editor-v1.0.16...editor-v1.0.17) (2024-08-23)


### Bug Fixes

* **editor:** remove extra immediately-deleted span after adding annotation ([4fe02c5](https://github.com/portabletext/editor/commit/4fe02c54761fd608458103594432520e561a7915))

## [1.0.16](https://github.com/portabletext/editor/compare/editor-v1.0.15...editor-v1.0.16) (2024-08-21)


### Bug Fixes

* **editor:** allow removing decorators across empty blocks ([0b375eb](https://github.com/portabletext/editor/commit/0b375eba94e0aa6f35f98f34f08dde710f7bb8f5))

## [1.0.15](https://github.com/portabletext/editor/compare/editor-v1.0.14...editor-v1.0.15) (2024-08-19)


### Bug Fixes

* **editor:** fix merge spans normalisation logic ([763de2a](https://github.com/portabletext/editor/commit/763de2a55843ddfcd57089ce306685c49c2ded58))

## [1.0.14](https://github.com/portabletext/editor/compare/editor-v1.0.13...editor-v1.0.14) (2024-08-16)


### Bug Fixes

* **editor:** guard against apply side effects when processing remote changes ([aa4fbed](https://github.com/portabletext/editor/commit/aa4fbedd729c39eac5cee6bc52f2aa391011fbb1))
* **editor:** guard against apply side effects when undoing/redoing ([4970289](https://github.com/portabletext/editor/commit/497028901e99fb558bb033e7d587f932530e52a9))
* **editor:** guard against erroneous undo/redo ([53c3c61](https://github.com/portabletext/editor/commit/53c3c61f6233ef67e0b7dd417b2e81292898263c))
* **editor:** make sure annotations are removed when writing on top of them ([88c42fb](https://github.com/portabletext/editor/commit/88c42fb783d1d4ab03cbcb6fa88079781b3b9404))

## [1.0.13](https://github.com/portabletext/editor/compare/editor-v1.0.12...editor-v1.0.13) (2024-08-14)


### Bug Fixes

* **editor:** avoid extra text insertion and adverse cascading effects ([a35715f](https://github.com/portabletext/editor/commit/a35715f9abee099d92e4585cd4cb27523e2295bc))

## [1.0.12](https://github.com/portabletext/editor/compare/editor-v1.0.11...editor-v1.0.12) (2024-08-09)


### Bug Fixes

* **deps:** update slate and slate-react ([c9a4375](https://github.com/portabletext/editor/commit/c9a43751660c654e85abafe78291e7184f86c470))
* **editor:** allow undoing part-deletion of annotated text ([42c2cdf](https://github.com/portabletext/editor/commit/42c2cdf1050e74840a7d94c9f5b1c271143c859b))

## [1.0.11](https://github.com/portabletext/editor/compare/editor-v1.0.10...editor-v1.0.11) (2024-08-05)


### Bug Fixes

* **editor:** allow inserting block without a selection ([42d001c](https://github.com/portabletext/editor/commit/42d001c1d8a9283b6475fe8599b581218e8b764f))
* **editor:** insertBlock now properly replaces empty text blocks ([f0b917b](https://github.com/portabletext/editor/commit/f0b917b9800ab5e786b30faaaa3c35001e2bb358))
* **editor:** prevent PortableTextEditor.isAnnotationActive(...) false positive ([c38e343](https://github.com/portabletext/editor/commit/c38e34347b5107d4864952b47d3c40a9eb7ed42d))

## [1.0.10](https://github.com/portabletext/editor/compare/editor-v1.0.9...editor-v1.0.10) (2024-08-01)


### Bug Fixes

* **editor:** add missing release tags ([f1054b0](https://github.com/portabletext/editor/commit/f1054b0a726cd7dfcd90fc7163b6f7f905444bb5))
* **editor:** prevent deleting non-empty text block on DELETE ([0955917](https://github.com/portabletext/editor/commit/0955917b3a5479eba4d8ef20d7a1dd4b521f956d))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped from 1.0.2 to 1.1.0

## [1.0.9](https://github.com/portabletext/editor/compare/editor-v1.0.8...editor-v1.0.9) (2024-07-25)


### Bug Fixes

* **editor:** mitigate infinite loop which causes editor to freeze ([36d5eef](https://github.com/portabletext/editor/commit/36d5eef5fcb8bc8d9ee71ec58ab8d791005d9448))
* **editor:** remove internal circular dependency ([8b77afe](https://github.com/portabletext/editor/commit/8b77afea292d0a9e222708e49cf0455440565094))

## [1.0.8](https://github.com/portabletext/editor/compare/editor-v1.0.7...editor-v1.0.8) (2024-07-04)


### Bug Fixes

* **editor:** allow returning Promise(undefined) in paste handler ([56ebe4a](https://github.com/portabletext/editor/commit/56ebe4a4ffb746d6cff493bbb9cb8727e866c754))

## [1.0.7](https://github.com/portabletext/editor/compare/editor-v1.0.6...editor-v1.0.7) (2024-06-28)


### Bug Fixes

* remove unrelated keywords ([42d396d](https://github.com/portabletext/editor/commit/42d396ddb54ea278b47506fd82c019046e7b3ae9))

## [1.0.6](https://github.com/portabletext/editor/compare/editor-v1.0.5...editor-v1.0.6) (2024-06-27)


### Bug Fixes

* upgrade `[@sanity](https://github.com/sanity)` dependencies ([b167312](https://github.com/portabletext/editor/commit/b1673125c3539f0e93ff40bc8c8ac5e4908ef1f1))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped from 1.0.1 to 1.0.2

## [1.0.1](https://github.com/portabletext/editor/compare/editor-v1.0.5...editor-v1.0.1) (2024-06-27)


### Miscellaneous Chores

* **patches:** release 1.0.1 ([097182d](https://github.com/portabletext/editor/commit/097182dbb5be4723d5004ff92e2318b27d07ac3b))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped from 1.0.0 to 1.0.1

## [1.0.5](https://github.com/portabletext/editor/compare/editor-v1.0.4...editor-v1.0.5) (2024-06-27)


### Bug Fixes

* **editor:** move @portabletext/patches to dependencies ([68d5b34](https://github.com/portabletext/editor/commit/68d5b34c1757684006a52f1817532a0255270ecd))


### Dependencies

* The following workspace dependencies were updated
  * dependencies
    * @portabletext/patches bumped to 1.0.0

## [1.0.4](https://github.com/portabletext/editor/compare/v1.0.3...v1.0.4) (2024-06-27)


### Bug Fixes

* move `@portabletext/patches` to dev dependencies ([15cc131](https://github.com/portabletext/editor/commit/15cc1318c58c12162b801b2af5537e50e34e3057))

## [1.0.3](https://github.com/portabletext/editor/compare/v1.0.2...v1.0.3) (2024-06-27)


### Bug Fixes

* adjust _regenerateKeys so that the MarkDefs left are only those allowed ([#19](https://github.com/portabletext/editor/issues/19)) ([145385d](https://github.com/portabletext/editor/commit/145385d420def7cca893f643b18090659b663b01))
* export RenderPlaceholderFunction type ([febd6e1](https://github.com/portabletext/editor/commit/febd6e1bd495e4df68695c3c1ac57e180d77b2b6))
* move `@sanity` dependencies to peer dependencies ([e58106c](https://github.com/portabletext/editor/commit/e58106c8e75bc88aae5f9b457fc44381d82f2802))
* fix native paste operations in Firefox ([bf0c6ac](https://github.com/portabletext/editor/commit/bf0c6acae6415ef68c832d0c568d3ba950f6cdcd))
* remove unused compactPatches function ([#26](https://github.com/portabletext/editor/issues/26)) ([72e4ea5](https://github.com/portabletext/editor/commit/72e4ea56516f102857e51344ee05750b44ade362))

## [1.0.2](https://github.com/portabletext/editor/compare/v1.0.1...v1.0.2) (2024-06-20)


### Bug Fixes

* update README ([ec79bb8](https://github.com/portabletext/editor/commit/ec79bb835b86ef76ff1d99ddf0f44dace99999ed))

## [1.0.1](https://github.com/portabletext/editor/compare/editor-v1.0.0...editor-v1.0.1) (2024-06-20)


### Bug Fixes

* clean up CHANGELOG ([4d86d5e](https://github.com/portabletext/editor/commit/4d86d5e341f30f63538c62dad602c8a04d482f29))

## 1.0.0 (2024-06-20)

Initial release.
