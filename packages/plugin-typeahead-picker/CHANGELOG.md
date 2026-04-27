# @portabletext/plugin-typeahead-picker

## 6.0.0

### Patch Changes

- [#2484](https://github.com/portabletext/editor/pull/2484) [`18876ca`](https://github.com/portabletext/editor/commit/18876caecca1f3e7c12d289e53d5665236888caf) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react monorepo

- [#2536](https://github.com/portabletext/editor/pull/2536) [`87fe2a4`](https://github.com/portabletext/editor/commit/87fe2a4fe6306ebe39ac34d482149baa33f38bd0) Thanks [@christianhg](https://github.com/christianhg)! - fix: adapt plugins to widened path types

  Adjust path construction in the emoji and typeahead pickers to derive the target block prefix via `path.slice(0, -2)` instead of `path[0]._key`, so the plugins produce correct sibling paths regardless of how deep the focus span sits. Input rule block-offset comparisons use `isKeyedSegment` guards before reading the block key.

- Updated dependencies [[`9ee7aed`](https://github.com/portabletext/editor/commit/9ee7aed618a22e34bf28638e9a50ba523b4db8ba), [`63c123d`](https://github.com/portabletext/editor/commit/63c123d533fe97e1f6ad6ceceef44fea60ca7991), [`7d1ab61`](https://github.com/portabletext/editor/commit/7d1ab617fbdbd9b6c86d8976af0cf9163f4f6d5f), [`cfdc5c3`](https://github.com/portabletext/editor/commit/cfdc5c397a9091b05678527ac9520bcd262267a0), [`be355f4`](https://github.com/portabletext/editor/commit/be355f49600bb7dd5e01a0b3a88ae6ac21693212), [`3201611`](https://github.com/portabletext/editor/commit/3201611d1af144cdf51f7df72f6783dcf7e034a4), [`27aff19`](https://github.com/portabletext/editor/commit/27aff19b6d14f49eee24f5d8419e786a972375c4), [`0bed144`](https://github.com/portabletext/editor/commit/0bed144e5ed35d42df21236818325b89bf1977ee), [`54f47c4`](https://github.com/portabletext/editor/commit/54f47c4661848595119414176787703d097fb23f), [`18876ca`](https://github.com/portabletext/editor/commit/18876caecca1f3e7c12d289e53d5665236888caf), [`56edded`](https://github.com/portabletext/editor/commit/56edded088ab9174e1002fc9701929ac6e2900a0), [`858cede`](https://github.com/portabletext/editor/commit/858cedeff10b6886aef324816be3240866297b75), [`1ac7dc3`](https://github.com/portabletext/editor/commit/1ac7dc3d9ceed7ed0826e79b1663ae5849fc5aae), [`80a648a`](https://github.com/portabletext/editor/commit/80a648a2326a33bc03b0ada49403d0f6419ecd03), [`1206b17`](https://github.com/portabletext/editor/commit/1206b17a66a4611c55ba8b6750db8bdd4efd5c34), [`3c51fe4`](https://github.com/portabletext/editor/commit/3c51fe425442b268721b1f9399acf8a4d8eb85ba), [`3a7f607`](https://github.com/portabletext/editor/commit/3a7f60728f8c97d9b31290c86114ed4a8d4b1f48), [`4257462`](https://github.com/portabletext/editor/commit/425746256677d66b207a933e48bbc2c7023fde76), [`8ec6b97`](https://github.com/portabletext/editor/commit/8ec6b973bcb762474aa399c47a2a9f023477331e), [`9ef0d83`](https://github.com/portabletext/editor/commit/9ef0d83b61f2bb07b5e375016478b4cbf491e23b), [`6420b47`](https://github.com/portabletext/editor/commit/6420b47413892de1e6bb6221f5a4d22bd9c1100e), [`f06e37d`](https://github.com/portabletext/editor/commit/f06e37d605aab6e4a5b2f81195528ed21273b487), [`87fe2a4`](https://github.com/portabletext/editor/commit/87fe2a4fe6306ebe39ac34d482149baa33f38bd0), [`b6816f3`](https://github.com/portabletext/editor/commit/b6816f3a595f9ae03c47196e566861c11c5e71ac), [`9978bb8`](https://github.com/portabletext/editor/commit/9978bb8f8bd25dee9a7c6a0b90266cd4f2359157), [`fbdb9b4`](https://github.com/portabletext/editor/commit/fbdb9b4adb88437dff6555d5efa58b5ecf50cfdc), [`5feaf90`](https://github.com/portabletext/editor/commit/5feaf90278490d0934b591206d3390414e9be571), [`21748a1`](https://github.com/portabletext/editor/commit/21748a161790b24dcde2f6e6de4a050240b96ec8), [`29ae834`](https://github.com/portabletext/editor/commit/29ae834b4a043ed4efe7130e58b3ada375f20779), [`8e69df7`](https://github.com/portabletext/editor/commit/8e69df7500faa072dcf6bc34c9a5724055f3398f), [`e365150`](https://github.com/portabletext/editor/commit/e36515014c70337c35ec167a03bed78710632304), [`9994531`](https://github.com/portabletext/editor/commit/99945317ff29ea523f71e5c2c9e32a3134e2f0d5), [`3f5f45e`](https://github.com/portabletext/editor/commit/3f5f45e3cc822e87a40edcb56402cb91a9dbe4d9), [`28c2eef`](https://github.com/portabletext/editor/commit/28c2eef89c94af6912194f684899b25717489e7a), [`8dc0472`](https://github.com/portabletext/editor/commit/8dc0472a682d395828426720278e45877390f54c), [`1c91aa2`](https://github.com/portabletext/editor/commit/1c91aa237dc4c552ad09cc8b7baa1e061edbf023), [`1b305c2`](https://github.com/portabletext/editor/commit/1b305c26961eaf40ae8dbe8219188668bbd9d8ea), [`fd73b6e`](https://github.com/portabletext/editor/commit/fd73b6e654fa101273caec75967ddf99cef1f089), [`3a75130`](https://github.com/portabletext/editor/commit/3a751303abb39a12f4f83b9d8fdbd738405a2ee3), [`1f4dbd1`](https://github.com/portabletext/editor/commit/1f4dbd115381b4a63dcc6af7ca97828cdeb147da), [`7aaab06`](https://github.com/portabletext/editor/commit/7aaab06105bfcaad44df6dcea7b45af28e9177c1), [`6d7f965`](https://github.com/portabletext/editor/commit/6d7f9655019a4b7e225363a012310feec1c33c34)]:
  - @portabletext/editor@7.0.0
  - @portabletext/plugin-input-rule@5.0.0

## 5.0.25

### Patch Changes

- Updated dependencies [[`2a3e039`](https://github.com/portabletext/editor/commit/2a3e03934d4715b8cb296c3ad81c0a2d104ab449)]:
  - @portabletext/editor@6.6.2
  - @portabletext/plugin-input-rule@4.0.25

## 5.0.24

### Patch Changes

- [#2452](https://github.com/portabletext/editor/pull/2452) [`550ab67`](https://github.com/portabletext/editor/commit/550ab67d7030a6a2860221877a5c71f8553a58ae) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update dependency xstate to ^5.30.0

- Updated dependencies [[`1f14d95`](https://github.com/portabletext/editor/commit/1f14d9503d129d96554b04efce3bf11c6175fd4e), [`1883b7c`](https://github.com/portabletext/editor/commit/1883b7ccfc197d8f40ca965d4a5c8d5875001846), [`550ab67`](https://github.com/portabletext/editor/commit/550ab67d7030a6a2860221877a5c71f8553a58ae), [`ef6daba`](https://github.com/portabletext/editor/commit/ef6dabae69e60abe6c3a35f9716f63fc53b1f73c), [`388ccd3`](https://github.com/portabletext/editor/commit/388ccd39a4d63df1dda2cc99aea741d0a98510ed), [`b849bc7`](https://github.com/portabletext/editor/commit/b849bc7120815fd8e3c9b8874371a6f34d21e374), [`69d82a3`](https://github.com/portabletext/editor/commit/69d82a3e34653b4b12f72a954f3d2e580838ccb2), [`0250fe0`](https://github.com/portabletext/editor/commit/0250fe0e6ff6f29e52fc15ceaa3e295c33430003), [`6334c3a`](https://github.com/portabletext/editor/commit/6334c3a8b616cccc21f2be899b3d887af9442bd4), [`9ac3212`](https://github.com/portabletext/editor/commit/9ac3212c6d7e3c14461c3c5adef9254f69afa4c2), [`995adc6`](https://github.com/portabletext/editor/commit/995adc68d3351332c6c1f2bb82432a5e85bc6d38), [`0464f65`](https://github.com/portabletext/editor/commit/0464f65bb76403b1bce7cfaeaa4ceb09b6596e50)]:
  - @portabletext/editor@6.6.1
  - @portabletext/plugin-input-rule@4.0.24

## 5.0.23

### Patch Changes

- Updated dependencies [[`ff8220d`](https://github.com/portabletext/editor/commit/ff8220db49b8407664b06d840f3d20b393b0effd), [`f1a6fb4`](https://github.com/portabletext/editor/commit/f1a6fb46291d862f385ebb0ecdacc712feed8d52), [`a8bdabb`](https://github.com/portabletext/editor/commit/a8bdabbb644bec953a29a52b4241a5d279399246), [`b97146c`](https://github.com/portabletext/editor/commit/b97146ccf45cc6d51dbd6b4d0d86015fa2af8039), [`4247d17`](https://github.com/portabletext/editor/commit/4247d174801ffac782906a4569de3536dd7e2079), [`055bdb1`](https://github.com/portabletext/editor/commit/055bdb160eb0b4e83e291ac3bf508ed6865747b8), [`041fef0`](https://github.com/portabletext/editor/commit/041fef01c7663317e7e13fc9197536c23822709f), [`56c20c3`](https://github.com/portabletext/editor/commit/56c20c34a7378e141126d5e63aded6e3b4d810da), [`d1928a2`](https://github.com/portabletext/editor/commit/d1928a2661ef5319f3bf7602b03bf650f726f3f2)]:
  - @portabletext/editor@6.6.0
  - @portabletext/plugin-input-rule@4.0.23

## 5.0.22

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@6.5.2
  - @portabletext/plugin-input-rule@4.0.22

## 5.0.21

### Patch Changes

- Updated dependencies [[`746bad3`](https://github.com/portabletext/editor/commit/746bad3e3199fa15cdd87c08396f120c01f4a3e8), [`182af30`](https://github.com/portabletext/editor/commit/182af3025562c832d553c11badea49cd18665ad2)]:
  - @portabletext/editor@6.5.1
  - @portabletext/plugin-input-rule@4.0.21

## 5.0.20

### Patch Changes

- Updated dependencies [[`cbccc01`](https://github.com/portabletext/editor/commit/cbccc0178f0eab4732424a579411a7e711786266), [`3d026ee`](https://github.com/portabletext/editor/commit/3d026ee624e62970429199b9082b7a3bab7e26db), [`a1992ab`](https://github.com/portabletext/editor/commit/a1992abed6f2a38486c9c9734949f0cc2ae97396), [`d93fd9b`](https://github.com/portabletext/editor/commit/d93fd9b17fc1bbae0c70fe323537563e81944238), [`4e86fc3`](https://github.com/portabletext/editor/commit/4e86fc34824fe5e2c6eb78e6277475702f434c99)]:
  - @portabletext/editor@6.5.0
  - @portabletext/plugin-input-rule@4.0.20

## 5.0.19

### Patch Changes

- Updated dependencies [[`e6815f7`](https://github.com/portabletext/editor/commit/e6815f794bbf282ad434b42992181db8c27eaa0c), [`71f1d38`](https://github.com/portabletext/editor/commit/71f1d38465a8c5b4e4c79116dbb9c105855e48b6), [`a698b0a`](https://github.com/portabletext/editor/commit/a698b0ae35f690ce31d4410d47e16698b1998cf4), [`c512b8b`](https://github.com/portabletext/editor/commit/c512b8bf4bd091afccedd535d93ebad9f383bacf), [`61abd09`](https://github.com/portabletext/editor/commit/61abd09b56e76de97bc0617bc824087f4e5457a9), [`014c3b4`](https://github.com/portabletext/editor/commit/014c3b4656efcc75f81c3a27fc9a637cab91f12c), [`19eb009`](https://github.com/portabletext/editor/commit/19eb009158853dae411e9f2bcd700381a1b62f9a), [`9299613`](https://github.com/portabletext/editor/commit/9299613d8876cdd60c31fb0b71c3c84cb2548c6c), [`1d7b52e`](https://github.com/portabletext/editor/commit/1d7b52e7c86486545514b33bb9dee54efeeb266c)]:
  - @portabletext/editor@6.4.0
  - @portabletext/plugin-input-rule@4.0.19

## 5.0.18

### Patch Changes

- Updated dependencies [[`b245c6e`](https://github.com/portabletext/editor/commit/b245c6e3b9dea50e3eab1f475df85d68bd4d0f94), [`dba286d`](https://github.com/portabletext/editor/commit/dba286de99fe63debc543fc354713dcf0b1fd0bf), [`6e7ef87`](https://github.com/portabletext/editor/commit/6e7ef8735a7e4ce66866cc54ef8d21f8350ef1d6), [`75dcbad`](https://github.com/portabletext/editor/commit/75dcbad57e7a220a9d8c0cb4d1581037a7134bab), [`d5d8fc9`](https://github.com/portabletext/editor/commit/d5d8fc98ad4b8482e6724644bdfe4dcac2f71d5c), [`a02e017`](https://github.com/portabletext/editor/commit/a02e017bf09a071caceea4648deee9becb311408), [`d4068ce`](https://github.com/portabletext/editor/commit/d4068ceb273aec29a789c76d8706ce8e00ad9138), [`b89f7f2`](https://github.com/portabletext/editor/commit/b89f7f2b35893004afd77ceb27de4def9a8279ef), [`a657b0d`](https://github.com/portabletext/editor/commit/a657b0d6c1061f13ec9c8c6229ff10201dc525a5), [`e6b2825`](https://github.com/portabletext/editor/commit/e6b28255d13404ace2ea12193d432f9a7da96748)]:
  - @portabletext/editor@6.3.2
  - @portabletext/plugin-input-rule@4.0.18

## 5.0.17

### Patch Changes

- Updated dependencies [[`262b0bc`](https://github.com/portabletext/editor/commit/262b0bc01b35491b82700e63c5a98d6ddc4d9513), [`d992e30`](https://github.com/portabletext/editor/commit/d992e30c5d91876ae43b0d5d82caee3c48259595), [`f06602e`](https://github.com/portabletext/editor/commit/f06602ea0e2d288c306230358e37e9fa8e7a9f5d), [`6a6ef2b`](https://github.com/portabletext/editor/commit/6a6ef2be1aa039de899a845f3a79f3e9958f51bc)]:
  - @portabletext/editor@6.3.1
  - @portabletext/plugin-input-rule@4.0.17

## 5.0.16

### Patch Changes

- Updated dependencies [[`58d4eb1`](https://github.com/portabletext/editor/commit/58d4eb11bf2f069acd10c4ef8ae2c1e87b57f75c), [`eb3c4ce`](https://github.com/portabletext/editor/commit/eb3c4cef6f14d5ec7fa0325e5f19c6191524d44c)]:
  - @portabletext/editor@6.3.0
  - @portabletext/plugin-input-rule@4.0.16

## 5.0.15

### Patch Changes

- Updated dependencies [[`d312abd`](https://github.com/portabletext/editor/commit/d312abd5b07affa20b5defb2fe587a66394e0831)]:
  - @portabletext/editor@6.2.0
  - @portabletext/plugin-input-rule@4.0.15

## 5.0.14

### Patch Changes

- Updated dependencies [[`761233d`](https://github.com/portabletext/editor/commit/761233d7dc3493eebfb7fe8e0f841a382105b543)]:
  - @portabletext/editor@6.1.2
  - @portabletext/plugin-input-rule@4.0.14

## 5.0.13

### Patch Changes

- Updated dependencies [[`626a8c4`](https://github.com/portabletext/editor/commit/626a8c4bfb0f739c3bdf1b4df3db42a38fd4ac90)]:
  - @portabletext/editor@6.1.1
  - @portabletext/plugin-input-rule@4.0.13

## 5.0.12

### Patch Changes

- Updated dependencies [[`a7cc971`](https://github.com/portabletext/editor/commit/a7cc9717e2438fcb461c7119136234f691fb9bbb), [`da1e5ff`](https://github.com/portabletext/editor/commit/da1e5ffd3a82f350aa4b6d30b21972d18cc16abd), [`67089e4`](https://github.com/portabletext/editor/commit/67089e4a9b38cb5711f050c47d0fb029a9d1a828), [`1eb5078`](https://github.com/portabletext/editor/commit/1eb50782640e274fa085f8032d8643b0791198e0), [`94ed1ea`](https://github.com/portabletext/editor/commit/94ed1ea6c4bd8d19fba2ac79abc95b5f5e756750), [`919c976`](https://github.com/portabletext/editor/commit/919c97670fd1446dea189792639ea90d6a43cee0), [`d1692de`](https://github.com/portabletext/editor/commit/d1692de11f086fd7e95f0799de295922b2244cf7), [`e939322`](https://github.com/portabletext/editor/commit/e939322b1e087a6f927b4d6f82b9b02154c181b4), [`82b41bf`](https://github.com/portabletext/editor/commit/82b41bf170355f24c4db501567b51bd89c8a71fc), [`92aafc5`](https://github.com/portabletext/editor/commit/92aafc59990627a56aff431214fecaffc60b9d96)]:
  - @portabletext/editor@6.1.0
  - @portabletext/plugin-input-rule@4.0.12

## 5.0.11

### Patch Changes

- Updated dependencies [[`4f31f06`](https://github.com/portabletext/editor/commit/4f31f06917b216f25cff8a04a204e15a6750ab91)]:
  - @portabletext/editor@6.0.11
  - @portabletext/plugin-input-rule@4.0.11

## 5.0.10

### Patch Changes

- Updated dependencies [[`eec5bfa`](https://github.com/portabletext/editor/commit/eec5bfab7d50cc25a9de27bf6f21a586701a8650)]:
  - @portabletext/editor@6.0.10
  - @portabletext/plugin-input-rule@4.0.10

## 5.0.9

### Patch Changes

- Updated dependencies [[`3149548`](https://github.com/portabletext/editor/commit/314954827b7c1df1d10b581dfe33c7ad175030ca), [`55ceaf2`](https://github.com/portabletext/editor/commit/55ceaf258948ad1dc9a2e41086821095f730ca25)]:
  - @portabletext/editor@6.0.9
  - @portabletext/plugin-input-rule@4.0.9

## 5.0.8

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@6.0.8
  - @portabletext/plugin-input-rule@4.0.8

## 5.0.7

### Patch Changes

- Updated dependencies [[`ef4fe18`](https://github.com/portabletext/editor/commit/ef4fe182bec3696d3b4588c7c44e4ed9c3f680fd)]:
  - @portabletext/editor@6.0.7
  - @portabletext/plugin-input-rule@4.0.7

## 5.0.6

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@6.0.6
  - @portabletext/plugin-input-rule@4.0.6

## 5.0.5

### Patch Changes

- Updated dependencies [[`c90dd12`](https://github.com/portabletext/editor/commit/c90dd12039ddb2502f740a5e84ece54b32ea2008)]:
  - @portabletext/editor@6.0.5
  - @portabletext/plugin-input-rule@4.0.5

## 5.0.4

### Patch Changes

- [#2292](https://github.com/portabletext/editor/pull/2292) [`e71f420`](https://github.com/portabletext/editor/commit/e71f420de68de7d99eaacee405c8eeaa7f983c35) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): Update xstate

- Updated dependencies [[`e71f420`](https://github.com/portabletext/editor/commit/e71f420de68de7d99eaacee405c8eeaa7f983c35)]:
  - @portabletext/editor@6.0.4
  - @portabletext/plugin-input-rule@4.0.4

## 5.0.3

### Patch Changes

- Updated dependencies [[`08d7e56`](https://github.com/portabletext/editor/commit/08d7e56e0623ddfde4af4f827af09f19deabe44d), [`bfa7feb`](https://github.com/portabletext/editor/commit/bfa7feb46aca3e9ef5fcd8f35a87177a2f75816d)]:
  - @portabletext/editor@6.0.3
  - @portabletext/plugin-input-rule@4.0.3

## 5.0.2

### Patch Changes

- Updated dependencies [[`68d4f82`](https://github.com/portabletext/editor/commit/68d4f82bf596724d8bed31721786f21f5dea3377)]:
  - @portabletext/editor@6.0.2
  - @portabletext/plugin-input-rule@4.0.2

## 5.0.1

### Patch Changes

- Updated dependencies [[`da6e04f`](https://github.com/portabletext/editor/commit/da6e04f3685de0ecab1bee38c941d5cdd3cd1aac), [`a4b0b48`](https://github.com/portabletext/editor/commit/a4b0b484e865a83174d27196112c619ffd9b1605), [`9e768b1`](https://github.com/portabletext/editor/commit/9e768b1d88446d89bbfc9dd7d0e54ba3d7d09765), [`d28c017`](https://github.com/portabletext/editor/commit/d28c017bec5a064cd3402b9a99a3358f693c4238), [`c3b7905`](https://github.com/portabletext/editor/commit/c3b79057c4992409dde5646d86d3b7c5d3db26a3), [`e9bcda3`](https://github.com/portabletext/editor/commit/e9bcda385fb8217fddffe039325a9d338a51adec), [`80c7378`](https://github.com/portabletext/editor/commit/80c73781a0d45fce376083a810f16b1438c9d94f), [`77a10ce`](https://github.com/portabletext/editor/commit/77a10ced03fe211bd912b520e7fb469985fec1af), [`018857f`](https://github.com/portabletext/editor/commit/018857fc34d9d600d4a45c06b1b62926759e4164), [`398adef`](https://github.com/portabletext/editor/commit/398adefc035c177dafd0b16d7dbdcd8de6f86fde), [`7d5b051`](https://github.com/portabletext/editor/commit/7d5b051a4a310b798b62ba78b6fea0a11351ed48)]:
  - @portabletext/editor@6.0.1
  - @portabletext/plugin-input-rule@4.0.1

## 5.0.0

### Patch Changes

- Updated dependencies [[`79b69a5`](https://github.com/portabletext/editor/commit/79b69a5cd7f5a19d4393453b993611916ab86a95), [`5a3e8bf`](https://github.com/portabletext/editor/commit/5a3e8bf33d9591b9cfbf310e37ae95f736862942), [`2f8d366`](https://github.com/portabletext/editor/commit/2f8d36694ddad97a5b1ca910ffc7f7e60937c642), [`3ce0561`](https://github.com/portabletext/editor/commit/3ce056153812bf75c3d95a452417f1f7e45f352e)]:
  - @portabletext/editor@6.0.0
  - @portabletext/plugin-input-rule@4.0.0

## 4.0.6

### Patch Changes

- Updated dependencies [[`837aab4`](https://github.com/portabletext/editor/commit/837aab4fa86dd32b4cf59b81a0a1ee53aab525aa)]:
  - @portabletext/editor@5.1.1
  - @portabletext/plugin-input-rule@3.0.6

## 4.0.5

### Patch Changes

- Updated dependencies [[`9840585`](https://github.com/portabletext/editor/commit/9840585b286929ff095cd2ebf3b1ead8b47a0edf)]:
  - @portabletext/editor@5.1.0
  - @portabletext/plugin-input-rule@3.0.5

## 4.0.4

### Patch Changes

- Updated dependencies [[`a3eb985`](https://github.com/portabletext/editor/commit/a3eb985d2fe074ac5a62b53acc50d9f4f1cbddcb), [`8945679`](https://github.com/portabletext/editor/commit/8945679eeb6c325458fdc1eebe9dba98a8a8f480)]:
  - @portabletext/editor@5.0.4
  - @portabletext/plugin-input-rule@3.0.4

## 4.0.3

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@5.0.3
  - @portabletext/plugin-input-rule@3.0.3

## 4.0.2

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@5.0.2
  - @portabletext/plugin-input-rule@3.0.2

## 4.0.1

### Patch Changes

- Updated dependencies [[`0155283`](https://github.com/portabletext/editor/commit/0155283c5b398f5678222acfdf7da7229a6fe0a6), [`921d03c`](https://github.com/portabletext/editor/commit/921d03c3d42b80949b25940d85cbc913dcc91f18)]:
  - @portabletext/editor@5.0.1
  - @portabletext/plugin-input-rule@3.0.1

## 4.0.0

### Patch Changes

- Updated dependencies [[`aadc179`](https://github.com/portabletext/editor/commit/aadc179d1a1181fb52af5905d9be9360b804ab81)]:
  - @portabletext/editor@5.0.0
  - @portabletext/plugin-input-rule@3.0.0

## 3.0.5

### Patch Changes

- Updated dependencies [[`3900875`](https://github.com/portabletext/editor/commit/3900875d6cefc6b66e0b0282eda1216ae8ede67c)]:
  - @portabletext/editor@4.3.10
  - @portabletext/plugin-input-rule@2.0.25

## 3.0.4

### Patch Changes

- Updated dependencies [[`b700377`](https://github.com/portabletext/editor/commit/b7003778bfff174842f264c392d4bb7641e02001)]:
  - @portabletext/editor@4.3.9
  - @portabletext/plugin-input-rule@2.0.24

## 3.0.3

### Patch Changes

- Updated dependencies [[`9e5cab1`](https://github.com/portabletext/editor/commit/9e5cab1d73b1bdfa011bc69654d1476a42a2fd94)]:
  - @portabletext/editor@4.3.8
  - @portabletext/plugin-input-rule@2.0.23

## 3.0.2

### Patch Changes

- Updated dependencies [[`ed5e0a0`](https://github.com/portabletext/editor/commit/ed5e0a06523ff4a46579156e0093c778f0478f94)]:
  - @portabletext/editor@4.3.7
  - @portabletext/plugin-input-rule@2.0.22

## 3.0.1

### Patch Changes

- [#2152](https://github.com/portabletext/editor/pull/2152) [`8a08145`](https://github.com/portabletext/editor/commit/8a08145c6fc2e322457ee5b722f66115113d55a6) Thanks [@christianhg](https://github.com/christianhg)! - fix: use string ID rather than Symbol

## 3.0.0

### Major Changes

- [#2148](https://github.com/portabletext/editor/pull/2148) [`03710e3`](https://github.com/portabletext/editor/commit/03710e30a9dad1ae99303a5729b3dd9afd0dacd4) Thanks [@christianhg](https://github.com/christianhg)! - feat!: rename `actions` to `onSelect` and add optional `onDismiss`

## 2.1.0

### Minor Changes

- [#2149](https://github.com/portabletext/editor/pull/2149) [`1723ba9`](https://github.com/portabletext/editor/commit/1723ba9bc6166e07b681ebe845db104b8058acdc) Thanks [@christianhg](https://github.com/christianhg)! - feat: allow using a `guard` to prevent picker from triggering

### Patch Changes

- [#2149](https://github.com/portabletext/editor/pull/2149) [`e1da054`](https://github.com/portabletext/editor/commit/e1da0544302dc56fa6feb8437f62a3ec41bad019) Thanks [@christianhg](https://github.com/christianhg)! - fix: rename `'typeahead.select'` to `'custom.typeahead select'`

- [#2149](https://github.com/portabletext/editor/pull/2149) [`99886cc`](https://github.com/portabletext/editor/commit/99886cccb6774da6df152b7f96deed7fec7ca101) Thanks [@christianhg](https://github.com/christianhg)! - fix: avoid unnecessary trailing `'select'` event

## 2.0.6

### Patch Changes

- Updated dependencies [[`30f57d3`](https://github.com/portabletext/editor/commit/30f57d39b902eb2022d96f42bf8a935bdc6b9c6d)]:
  - @portabletext/editor@4.3.6
  - @portabletext/plugin-input-rule@2.0.21

## 2.0.5

### Patch Changes

- Updated dependencies [[`ddb324f`](https://github.com/portabletext/editor/commit/ddb324f3294ed961092ad580d69c6c629f6a47d1), [`39b8b21`](https://github.com/portabletext/editor/commit/39b8b21dea18651d8c7e306ea6953b95d9648bb8)]:
  - @portabletext/editor@4.3.5
  - @portabletext/plugin-input-rule@2.0.20

## 2.0.4

### Patch Changes

- Updated dependencies [[`644f895`](https://github.com/portabletext/editor/commit/644f8957344bb62c017d86505795281a9f5f54f4), [`78dfe5e`](https://github.com/portabletext/editor/commit/78dfe5ee8a485b75bd9bc38dc3c023cf9bda7da8)]:
  - @portabletext/editor@4.3.4
  - @portabletext/plugin-input-rule@2.0.19

## 2.0.3

### Patch Changes

- Updated dependencies [[`c98cbb8`](https://github.com/portabletext/editor/commit/c98cbb806f0887e98a38b5bdfeb2d6f44d9ccc60)]:
  - @portabletext/editor@4.3.3
  - @portabletext/plugin-input-rule@2.0.18

## 2.0.2

### Patch Changes

- Updated dependencies [[`cdd34ea`](https://github.com/portabletext/editor/commit/cdd34eae96da4fdcc3b6c3272e0e89b88c410252)]:
  - @portabletext/editor@4.3.2
  - @portabletext/plugin-input-rule@2.0.17

## 2.0.1

### Patch Changes

- [#2128](https://github.com/portabletext/editor/pull/2128) [`dfca3ae`](https://github.com/portabletext/editor/commit/dfca3ae8d060f610ee009617b3d92d41962024bf) Thanks [@christianhg](https://github.com/christianhg)! - fix: use correct @portabletext/editor peer dep version range

- Updated dependencies [[`427ccce`](https://github.com/portabletext/editor/commit/427cccef816c9b6af520123bfeb56b91738a7012), [`dfca3ae`](https://github.com/portabletext/editor/commit/dfca3ae8d060f610ee009617b3d92d41962024bf)]:
  - @portabletext/editor@4.3.1
  - @portabletext/plugin-input-rule@2.0.16

## 2.0.0

### Major Changes

- [#2124](https://github.com/portabletext/editor/pull/2124) [`da5540b`](https://github.com/portabletext/editor/commit/da5540bb763df7b7aac54cb2ede9bd708a00a27a) Thanks [@christianhg](https://github.com/christianhg)! - feat!: simplify configuration API

  **Breaking change:** The `pattern` and `autoCompleteWith` options have been replaced with `trigger`, `keyword`, and `delimiter`.

  **Before:**

  ```ts
  defineTypeaheadPicker({
    pattern: /:(\S*)/,
    autoCompleteWith: ':',
    // ...
  })
  ```

  **After:**

  ```ts
  defineTypeaheadPicker({
    trigger: /:/,
    keyword: /\S*/,
    delimiter: ':',
    // ...
  })
  ```

  **Migration:**
  1. Replace `pattern` with separate `trigger` and `keyword` regexes
  2. Rename `autoCompleteWith` to `delimiter`
  3. Remove capture groups from your patterns - they're no longer needed

  The new API makes picker configuration more explicit and easier to understand.

### Patch Changes

- [#2124](https://github.com/portabletext/editor/pull/2124) [`d767bfd`](https://github.com/portabletext/editor/commit/d767bfd2f031e8a457395d3ba362e327f51bce77) Thanks [@christianhg](https://github.com/christianhg)! - fix: incorrect keyword when text contains `autoCompleteWith` char

  Inserting `"::)"` at once would incorrectly produce keyword `":"` instead of
  `":)"`. The auto-complete pattern was matching `"::"` prematurely instead of
  waiting for the full input.

- [#2124](https://github.com/portabletext/editor/pull/2124) [`ea90602`](https://github.com/portabletext/editor/commit/ea906022bce8bdc21d6370ce8b9245bcadeae6f0) Thanks [@christianhg](https://github.com/christianhg)! - fix: an empty pattern text is an invalid pattern text

- [#2124](https://github.com/portabletext/editor/pull/2124) [`16f6e84`](https://github.com/portabletext/editor/commit/16f6e840f5d451bfdaeb3e63edd356c5570b46ee) Thanks [@christianhg](https://github.com/christianhg)! - fix: handle case where there are multiple exact matches

- [#2124](https://github.com/portabletext/editor/pull/2124) [`2743b2e`](https://github.com/portabletext/editor/commit/2743b2e3d2712a70869745d80ca48009985c2675) Thanks [@christianhg](https://github.com/christianhg)! - fix: triggering after trigger char

- [#2124](https://github.com/portabletext/editor/pull/2124) [`d216ad0`](https://github.com/portabletext/editor/commit/d216ad09635cf759884cdb91b56d325c432c7bb3) Thanks [@christianhg](https://github.com/christianhg)! - fix: complete match after trigger char

- [#2124](https://github.com/portabletext/editor/pull/2124) [`4d9e820`](https://github.com/portabletext/editor/commit/4d9e82006db160baaf76f0a51a54964df1517a0c) Thanks [@christianhg](https://github.com/christianhg)! - fix: use `ReadonlyArray` for matches
