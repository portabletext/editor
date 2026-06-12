# @portabletext/plugin-paste-link

## 4.0.15

### Patch Changes

- Updated dependencies [[`8ed6233`](https://github.com/portabletext/editor/commit/8ed623380c516add8851fedec26eba62edd13198)]:
  - @portabletext/editor@7.4.0

## 4.0.14

### Patch Changes

- Updated dependencies [[`9173892`](https://github.com/portabletext/editor/commit/91738928cf069ba7b6bf33bb60afea14de678af7)]:
  - @portabletext/editor@7.3.4

## 4.0.13

### Patch Changes

- Updated dependencies [[`1e0d25d`](https://github.com/portabletext/editor/commit/1e0d25d2e909272298c80193f71b604dfde9d7ea)]:
  - @portabletext/editor@7.3.3

## 4.0.12

### Patch Changes

- Updated dependencies [[`c92beef`](https://github.com/portabletext/editor/commit/c92beefeb17631046ea1b5e04c3aa9c4274f520e)]:
  - @portabletext/editor@7.3.2

## 4.0.11

### Patch Changes

- Updated dependencies [[`cfcb9ec`](https://github.com/portabletext/editor/commit/cfcb9ecf2b683bf7c71fb32daa63bbd1935a4d05)]:
  - @portabletext/editor@7.3.1

## 4.0.10

### Patch Changes

- Updated dependencies [[`2b4d9a2`](https://github.com/portabletext/editor/commit/2b4d9a215dfaf2417afec3d9b097776e4637f331)]:
  - @portabletext/editor@7.3.0

## 4.0.9

### Patch Changes

- Updated dependencies [[`e0ee0f6`](https://github.com/portabletext/editor/commit/e0ee0f68ae8936bca7a158c2828c9b17ba468ec2), [`5c183b3`](https://github.com/portabletext/editor/commit/5c183b39b1482d0a83b0b9f98ebe99186560d511), [`f4f2a73`](https://github.com/portabletext/editor/commit/f4f2a73666923dba62f0f8e88f87df956fe655b5), [`3229002`](https://github.com/portabletext/editor/commit/32290029c7e5eed4b8c96833b21181937efcf2a4), [`0fb1f28`](https://github.com/portabletext/editor/commit/0fb1f285fdd54ad9e67a9411829dfa2da283390c), [`ceb179f`](https://github.com/portabletext/editor/commit/ceb179f16e3a218e4e86b05331ab4593d9133602), [`ae60599`](https://github.com/portabletext/editor/commit/ae60599a6eb8514af2c80240f029688dc08bcfc0), [`6540641`](https://github.com/portabletext/editor/commit/65406416e151044913784a11f7a0567e82be48fe), [`492fb7d`](https://github.com/portabletext/editor/commit/492fb7dd390409d4267833ce5f86356a59e38c90)]:
  - @portabletext/editor@7.2.0

## 4.0.8

### Patch Changes

- Updated dependencies [[`4121c36`](https://github.com/portabletext/editor/commit/4121c365871569f7ca0afe54e8400534be54b8e7)]:
  - @portabletext/editor@7.1.1

## 4.0.7

### Patch Changes

- Updated dependencies [[`8ef89bd`](https://github.com/portabletext/editor/commit/8ef89bd074ebcc0484183d69458e5c16bee1398f)]:
  - @portabletext/editor@7.1.0

## 4.0.6

### Patch Changes

- Updated dependencies [[`f0a46d1`](https://github.com/portabletext/editor/commit/f0a46d1362395ff2d10b07c12577212ce5946086)]:
  - @portabletext/editor@7.0.6

## 4.0.5

### Patch Changes

- Updated dependencies [[`e0e974e`](https://github.com/portabletext/editor/commit/e0e974e2ece2590dfd7c7fa908d25290300899fc)]:
  - @portabletext/editor@7.0.5

## 4.0.4

### Patch Changes

- Updated dependencies [[`eb0b234`](https://github.com/portabletext/editor/commit/eb0b234ac1c16ebf89ae0253d02d0845f3d9224d)]:
  - @portabletext/editor@7.0.4

## 4.0.3

### Patch Changes

- Updated dependencies [[`44d5d47`](https://github.com/portabletext/editor/commit/44d5d471ecb95373a7c06d476dd72b5756ad1ba0), [`6ed97e9`](https://github.com/portabletext/editor/commit/6ed97e98b1e6900ad8c48daf7e4c4f265d86bf1d)]:
  - @portabletext/editor@7.0.3

## 4.0.2

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@7.0.2

## 4.0.1

### Patch Changes

- Updated dependencies [[`fdedf2d`](https://github.com/portabletext/editor/commit/fdedf2da4820dc403868fb3027d5945c92ca8a88)]:
  - @portabletext/editor@7.0.1

## 4.0.0

### Patch Changes

- [#2484](https://github.com/portabletext/editor/pull/2484) [`18876ca`](https://github.com/portabletext/editor/commit/18876caecca1f3e7c12d289e53d5665236888caf) Thanks [@renovate](https://github.com/apps/renovate)! - fix(deps): update react monorepo

- [#2617](https://github.com/portabletext/editor/pull/2617) [`4515e65`](https://github.com/portabletext/editor/commit/4515e65f8278ae2883cc297408be80e492623e34) Thanks [@christianhg](https://github.com/christianhg)! - fix: respect the sub-schema at the focus when computing the link annotation

  The schema passed to the consumer's `link` matcher is now scoped to the focus block's sub-schema rather than the root schema. Inside a registered editable container that does not declare the link annotation, pasting a URL is left to default paste handling instead of being wrapped in a link annotation that the sub-schema does not allow. The active-decorator filter when pasting at the caret is also scoped to the sub-schema.

- Updated dependencies [[`ba16137`](https://github.com/portabletext/editor/commit/ba1613704642dbdcc0b596d9195e45c6e9814a11), [`8a91cd2`](https://github.com/portabletext/editor/commit/8a91cd261c27ee2ee5d1be66de55cb32e7cacb6b), [`750f5f4`](https://github.com/portabletext/editor/commit/750f5f49f3c985d55a186ade1ca41e2fa6a1d31e), [`3a3bb24`](https://github.com/portabletext/editor/commit/3a3bb2467fb459fa506744c56f3a62bca78388c5), [`9ee7aed`](https://github.com/portabletext/editor/commit/9ee7aed618a22e34bf28638e9a50ba523b4db8ba), [`63c123d`](https://github.com/portabletext/editor/commit/63c123d533fe97e1f6ad6ceceef44fea60ca7991), [`2053ff7`](https://github.com/portabletext/editor/commit/2053ff75a056f4ff69ae501acc6191c09337c9bc), [`7d1ab61`](https://github.com/portabletext/editor/commit/7d1ab617fbdbd9b6c86d8976af0cf9163f4f6d5f), [`cfdc5c3`](https://github.com/portabletext/editor/commit/cfdc5c397a9091b05678527ac9520bcd262267a0), [`be355f4`](https://github.com/portabletext/editor/commit/be355f49600bb7dd5e01a0b3a88ae6ac21693212), [`7ac3cdc`](https://github.com/portabletext/editor/commit/7ac3cdc1bef5c86c09bbc3320b23e085f71ec0b0), [`3201611`](https://github.com/portabletext/editor/commit/3201611d1af144cdf51f7df72f6783dcf7e034a4), [`4c80f1b`](https://github.com/portabletext/editor/commit/4c80f1b9d0c0e92d93971f64e00a8cca61edc0ea), [`27aff19`](https://github.com/portabletext/editor/commit/27aff19b6d14f49eee24f5d8419e786a972375c4), [`54f47c4`](https://github.com/portabletext/editor/commit/54f47c4661848595119414176787703d097fb23f), [`313428b`](https://github.com/portabletext/editor/commit/313428b35be15cb63681d29ec005593f69508c59), [`7a1fc73`](https://github.com/portabletext/editor/commit/7a1fc738ca907ad479fadc97dca4fcffee766793), [`fe9f223`](https://github.com/portabletext/editor/commit/fe9f2232e3ea549dd1e95e0b481246a54d1fc7be), [`9a36b1e`](https://github.com/portabletext/editor/commit/9a36b1e61a55bb4018d6d2d612cc903a17e109d7), [`18876ca`](https://github.com/portabletext/editor/commit/18876caecca1f3e7c12d289e53d5665236888caf), [`d128d51`](https://github.com/portabletext/editor/commit/d128d51e378e62c204ca8d2ed7b24ade6ccdf02a), [`56edded`](https://github.com/portabletext/editor/commit/56edded088ab9174e1002fc9701929ac6e2900a0), [`84e000f`](https://github.com/portabletext/editor/commit/84e000f7cb272b0b2a35ed85a753e148acff5e7c), [`0715971`](https://github.com/portabletext/editor/commit/07159710b3c7af7b59040a470f5b55ec0c8a8f34), [`1b64415`](https://github.com/portabletext/editor/commit/1b64415cd2a13e3d96aed9f86b8101b2f1907d15), [`345b52b`](https://github.com/portabletext/editor/commit/345b52b73135499575cc8ac3915ed5434989ee76), [`cced43b`](https://github.com/portabletext/editor/commit/cced43bc73c7de85dc7b3a289f5b07d6cf3222be), [`2c6d3a7`](https://github.com/portabletext/editor/commit/2c6d3a7b09bdb04012f6165246a00f71acec1d4a), [`39b0534`](https://github.com/portabletext/editor/commit/39b05340c668e9a1681354bbfdcb60189422851c), [`7ef0f16`](https://github.com/portabletext/editor/commit/7ef0f16f3dd73b327e5b3c75dbc3ae3ffdd4ddac), [`80a648a`](https://github.com/portabletext/editor/commit/80a648a2326a33bc03b0ada49403d0f6419ecd03), [`1206b17`](https://github.com/portabletext/editor/commit/1206b17a66a4611c55ba8b6750db8bdd4efd5c34), [`fc0d815`](https://github.com/portabletext/editor/commit/fc0d8151e909606a499b6c29dd1e46aa48c483cb), [`19fdca2`](https://github.com/portabletext/editor/commit/19fdca2e16c359b6f199196c2fe51abdbd6a24b2), [`c4eb27e`](https://github.com/portabletext/editor/commit/c4eb27e09173b8fa6618107cea5fb7ffd1c2b28f), [`47d6574`](https://github.com/portabletext/editor/commit/47d6574fa215975df6637bf14bead333cf769fa8), [`3d78d55`](https://github.com/portabletext/editor/commit/3d78d55acd9f1771200a4f771f711b235cd287f8), [`703e4a9`](https://github.com/portabletext/editor/commit/703e4a991f540b15ccdfbb0cab3d2d03d9298a0f), [`3a7f607`](https://github.com/portabletext/editor/commit/3a7f60728f8c97d9b31290c86114ed4a8d4b1f48), [`c4bcc8a`](https://github.com/portabletext/editor/commit/c4bcc8a72b4276b74447928936ea83e8d93424aa), [`1e93256`](https://github.com/portabletext/editor/commit/1e93256ca41f2d72cecb992ed2d871b8845c7b2c), [`ff3bc6f`](https://github.com/portabletext/editor/commit/ff3bc6ffef691922eb5656b2f672832789868b7c), [`47d6574`](https://github.com/portabletext/editor/commit/47d6574fa215975df6637bf14bead333cf769fa8), [`d97187d`](https://github.com/portabletext/editor/commit/d97187d4a99524298c1aefacf1330e5b6a2311ed), [`395d017`](https://github.com/portabletext/editor/commit/395d0176f8c82453824699e67770693cf744b6bd), [`8ec6b97`](https://github.com/portabletext/editor/commit/8ec6b973bcb762474aa399c47a2a9f023477331e), [`47d6574`](https://github.com/portabletext/editor/commit/47d6574fa215975df6637bf14bead333cf769fa8), [`f06e37d`](https://github.com/portabletext/editor/commit/f06e37d605aab6e4a5b2f81195528ed21273b487), [`add7f51`](https://github.com/portabletext/editor/commit/add7f5125489fe666aaabe6f79aad90e0f1d598d), [`87ff2dd`](https://github.com/portabletext/editor/commit/87ff2dd2045b33945e5d8a82bbb9b5ae0a345dfb), [`57cd552`](https://github.com/portabletext/editor/commit/57cd552813b3c4a14b47406fc4d8d341eca3ef18), [`b6816f3`](https://github.com/portabletext/editor/commit/b6816f3a595f9ae03c47196e566861c11c5e71ac), [`4daf9bf`](https://github.com/portabletext/editor/commit/4daf9bfe845b15dc9a65dbde0e69937465e9f399), [`a5833da`](https://github.com/portabletext/editor/commit/a5833dac088b9bea6f1de67114c4424bc2634c71), [`aaf491d`](https://github.com/portabletext/editor/commit/aaf491d6b4ffd518f320cad81cb3beaa9f92222c), [`47d6574`](https://github.com/portabletext/editor/commit/47d6574fa215975df6637bf14bead333cf769fa8), [`7d499a0`](https://github.com/portabletext/editor/commit/7d499a035758fbe730457908eab3e4089bc71d37), [`97f9710`](https://github.com/portabletext/editor/commit/97f97102c0249e2ff4c106fedd2a82183768f4f6), [`e365150`](https://github.com/portabletext/editor/commit/e36515014c70337c35ec167a03bed78710632304), [`47d6574`](https://github.com/portabletext/editor/commit/47d6574fa215975df6637bf14bead333cf769fa8), [`57ae20f`](https://github.com/portabletext/editor/commit/57ae20fbc67b4a41cb131b8a0cc22cbb657fd859), [`18c4dcb`](https://github.com/portabletext/editor/commit/18c4dcbed4427aed1f9af4c1545d63e5b6ec6eac), [`3f5f45e`](https://github.com/portabletext/editor/commit/3f5f45e3cc822e87a40edcb56402cb91a9dbe4d9), [`28c2eef`](https://github.com/portabletext/editor/commit/28c2eef89c94af6912194f684899b25717489e7a), [`b7554e0`](https://github.com/portabletext/editor/commit/b7554e00225a4007d81aa9ff070b8f793339de5b), [`47d6574`](https://github.com/portabletext/editor/commit/47d6574fa215975df6637bf14bead333cf769fa8), [`1e7dbd3`](https://github.com/portabletext/editor/commit/1e7dbd3646e9d926b469121c2561e470ab7b31d4), [`1b305c2`](https://github.com/portabletext/editor/commit/1b305c26961eaf40ae8dbe8219188668bbd9d8ea), [`bebcf8b`](https://github.com/portabletext/editor/commit/bebcf8b599e0f8ff73c95b0268c32d768504045f), [`fd73b6e`](https://github.com/portabletext/editor/commit/fd73b6e654fa101273caec75967ddf99cef1f089), [`5b16936`](https://github.com/portabletext/editor/commit/5b16936601b397bd35c645dca1beacf36d4720f6), [`d6e55e3`](https://github.com/portabletext/editor/commit/d6e55e3e71742e20202c5ae68eadb70437857991), [`3a75130`](https://github.com/portabletext/editor/commit/3a751303abb39a12f4f83b9d8fdbd738405a2ee3), [`54138bd`](https://github.com/portabletext/editor/commit/54138bd4295e6a8700cfa5becbb149aa97509452), [`cfd6d48`](https://github.com/portabletext/editor/commit/cfd6d48e9c787844583395966ad27b8c062db1d3), [`6d7f965`](https://github.com/portabletext/editor/commit/6d7f9655019a4b7e225363a012310feec1c33c34)]:
  - @portabletext/editor@7.0.0

## 3.0.25

### Patch Changes

- Updated dependencies [[`2a3e039`](https://github.com/portabletext/editor/commit/2a3e03934d4715b8cb296c3ad81c0a2d104ab449)]:
  - @portabletext/editor@6.6.2

## 3.0.24

### Patch Changes

- Updated dependencies [[`1f14d95`](https://github.com/portabletext/editor/commit/1f14d9503d129d96554b04efce3bf11c6175fd4e), [`1883b7c`](https://github.com/portabletext/editor/commit/1883b7ccfc197d8f40ca965d4a5c8d5875001846), [`550ab67`](https://github.com/portabletext/editor/commit/550ab67d7030a6a2860221877a5c71f8553a58ae), [`ef6daba`](https://github.com/portabletext/editor/commit/ef6dabae69e60abe6c3a35f9716f63fc53b1f73c), [`388ccd3`](https://github.com/portabletext/editor/commit/388ccd39a4d63df1dda2cc99aea741d0a98510ed), [`b849bc7`](https://github.com/portabletext/editor/commit/b849bc7120815fd8e3c9b8874371a6f34d21e374), [`69d82a3`](https://github.com/portabletext/editor/commit/69d82a3e34653b4b12f72a954f3d2e580838ccb2), [`0250fe0`](https://github.com/portabletext/editor/commit/0250fe0e6ff6f29e52fc15ceaa3e295c33430003), [`6334c3a`](https://github.com/portabletext/editor/commit/6334c3a8b616cccc21f2be899b3d887af9442bd4), [`9ac3212`](https://github.com/portabletext/editor/commit/9ac3212c6d7e3c14461c3c5adef9254f69afa4c2), [`995adc6`](https://github.com/portabletext/editor/commit/995adc68d3351332c6c1f2bb82432a5e85bc6d38), [`0464f65`](https://github.com/portabletext/editor/commit/0464f65bb76403b1bce7cfaeaa4ceb09b6596e50)]:
  - @portabletext/editor@6.6.1

## 3.0.23

### Patch Changes

- Updated dependencies [[`ff8220d`](https://github.com/portabletext/editor/commit/ff8220db49b8407664b06d840f3d20b393b0effd), [`f1a6fb4`](https://github.com/portabletext/editor/commit/f1a6fb46291d862f385ebb0ecdacc712feed8d52), [`a8bdabb`](https://github.com/portabletext/editor/commit/a8bdabbb644bec953a29a52b4241a5d279399246), [`b97146c`](https://github.com/portabletext/editor/commit/b97146ccf45cc6d51dbd6b4d0d86015fa2af8039), [`4247d17`](https://github.com/portabletext/editor/commit/4247d174801ffac782906a4569de3536dd7e2079), [`055bdb1`](https://github.com/portabletext/editor/commit/055bdb160eb0b4e83e291ac3bf508ed6865747b8), [`041fef0`](https://github.com/portabletext/editor/commit/041fef01c7663317e7e13fc9197536c23822709f), [`56c20c3`](https://github.com/portabletext/editor/commit/56c20c34a7378e141126d5e63aded6e3b4d810da), [`d1928a2`](https://github.com/portabletext/editor/commit/d1928a2661ef5319f3bf7602b03bf650f726f3f2)]:
  - @portabletext/editor@6.6.0

## 3.0.22

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@6.5.2

## 3.0.21

### Patch Changes

- Updated dependencies [[`746bad3`](https://github.com/portabletext/editor/commit/746bad3e3199fa15cdd87c08396f120c01f4a3e8), [`182af30`](https://github.com/portabletext/editor/commit/182af3025562c832d553c11badea49cd18665ad2)]:
  - @portabletext/editor@6.5.1

## 3.0.20

### Patch Changes

- Updated dependencies [[`cbccc01`](https://github.com/portabletext/editor/commit/cbccc0178f0eab4732424a579411a7e711786266), [`3d026ee`](https://github.com/portabletext/editor/commit/3d026ee624e62970429199b9082b7a3bab7e26db), [`a1992ab`](https://github.com/portabletext/editor/commit/a1992abed6f2a38486c9c9734949f0cc2ae97396), [`d93fd9b`](https://github.com/portabletext/editor/commit/d93fd9b17fc1bbae0c70fe323537563e81944238), [`4e86fc3`](https://github.com/portabletext/editor/commit/4e86fc34824fe5e2c6eb78e6277475702f434c99)]:
  - @portabletext/editor@6.5.0

## 3.0.19

### Patch Changes

- Updated dependencies [[`e6815f7`](https://github.com/portabletext/editor/commit/e6815f794bbf282ad434b42992181db8c27eaa0c), [`71f1d38`](https://github.com/portabletext/editor/commit/71f1d38465a8c5b4e4c79116dbb9c105855e48b6), [`a698b0a`](https://github.com/portabletext/editor/commit/a698b0ae35f690ce31d4410d47e16698b1998cf4), [`c512b8b`](https://github.com/portabletext/editor/commit/c512b8bf4bd091afccedd535d93ebad9f383bacf), [`61abd09`](https://github.com/portabletext/editor/commit/61abd09b56e76de97bc0617bc824087f4e5457a9), [`014c3b4`](https://github.com/portabletext/editor/commit/014c3b4656efcc75f81c3a27fc9a637cab91f12c), [`19eb009`](https://github.com/portabletext/editor/commit/19eb009158853dae411e9f2bcd700381a1b62f9a), [`9299613`](https://github.com/portabletext/editor/commit/9299613d8876cdd60c31fb0b71c3c84cb2548c6c), [`1d7b52e`](https://github.com/portabletext/editor/commit/1d7b52e7c86486545514b33bb9dee54efeeb266c)]:
  - @portabletext/editor@6.4.0

## 3.0.18

### Patch Changes

- Updated dependencies [[`b245c6e`](https://github.com/portabletext/editor/commit/b245c6e3b9dea50e3eab1f475df85d68bd4d0f94), [`dba286d`](https://github.com/portabletext/editor/commit/dba286de99fe63debc543fc354713dcf0b1fd0bf), [`6e7ef87`](https://github.com/portabletext/editor/commit/6e7ef8735a7e4ce66866cc54ef8d21f8350ef1d6), [`75dcbad`](https://github.com/portabletext/editor/commit/75dcbad57e7a220a9d8c0cb4d1581037a7134bab), [`d5d8fc9`](https://github.com/portabletext/editor/commit/d5d8fc98ad4b8482e6724644bdfe4dcac2f71d5c), [`a02e017`](https://github.com/portabletext/editor/commit/a02e017bf09a071caceea4648deee9becb311408), [`d4068ce`](https://github.com/portabletext/editor/commit/d4068ceb273aec29a789c76d8706ce8e00ad9138), [`b89f7f2`](https://github.com/portabletext/editor/commit/b89f7f2b35893004afd77ceb27de4def9a8279ef), [`a657b0d`](https://github.com/portabletext/editor/commit/a657b0d6c1061f13ec9c8c6229ff10201dc525a5), [`e6b2825`](https://github.com/portabletext/editor/commit/e6b28255d13404ace2ea12193d432f9a7da96748)]:
  - @portabletext/editor@6.3.2

## 3.0.17

### Patch Changes

- Updated dependencies [[`262b0bc`](https://github.com/portabletext/editor/commit/262b0bc01b35491b82700e63c5a98d6ddc4d9513), [`d992e30`](https://github.com/portabletext/editor/commit/d992e30c5d91876ae43b0d5d82caee3c48259595), [`f06602e`](https://github.com/portabletext/editor/commit/f06602ea0e2d288c306230358e37e9fa8e7a9f5d), [`6a6ef2b`](https://github.com/portabletext/editor/commit/6a6ef2be1aa039de899a845f3a79f3e9958f51bc)]:
  - @portabletext/editor@6.3.1

## 3.0.16

### Patch Changes

- Updated dependencies [[`58d4eb1`](https://github.com/portabletext/editor/commit/58d4eb11bf2f069acd10c4ef8ae2c1e87b57f75c), [`eb3c4ce`](https://github.com/portabletext/editor/commit/eb3c4cef6f14d5ec7fa0325e5f19c6191524d44c)]:
  - @portabletext/editor@6.3.0

## 3.0.15

### Patch Changes

- Updated dependencies [[`d312abd`](https://github.com/portabletext/editor/commit/d312abd5b07affa20b5defb2fe587a66394e0831)]:
  - @portabletext/editor@6.2.0

## 3.0.14

### Patch Changes

- Updated dependencies [[`761233d`](https://github.com/portabletext/editor/commit/761233d7dc3493eebfb7fe8e0f841a382105b543)]:
  - @portabletext/editor@6.1.2

## 3.0.13

### Patch Changes

- Updated dependencies [[`626a8c4`](https://github.com/portabletext/editor/commit/626a8c4bfb0f739c3bdf1b4df3db42a38fd4ac90)]:
  - @portabletext/editor@6.1.1

## 3.0.12

### Patch Changes

- Updated dependencies [[`a7cc971`](https://github.com/portabletext/editor/commit/a7cc9717e2438fcb461c7119136234f691fb9bbb), [`da1e5ff`](https://github.com/portabletext/editor/commit/da1e5ffd3a82f350aa4b6d30b21972d18cc16abd), [`67089e4`](https://github.com/portabletext/editor/commit/67089e4a9b38cb5711f050c47d0fb029a9d1a828), [`1eb5078`](https://github.com/portabletext/editor/commit/1eb50782640e274fa085f8032d8643b0791198e0), [`94ed1ea`](https://github.com/portabletext/editor/commit/94ed1ea6c4bd8d19fba2ac79abc95b5f5e756750), [`919c976`](https://github.com/portabletext/editor/commit/919c97670fd1446dea189792639ea90d6a43cee0), [`d1692de`](https://github.com/portabletext/editor/commit/d1692de11f086fd7e95f0799de295922b2244cf7), [`e939322`](https://github.com/portabletext/editor/commit/e939322b1e087a6f927b4d6f82b9b02154c181b4), [`82b41bf`](https://github.com/portabletext/editor/commit/82b41bf170355f24c4db501567b51bd89c8a71fc), [`92aafc5`](https://github.com/portabletext/editor/commit/92aafc59990627a56aff431214fecaffc60b9d96)]:
  - @portabletext/editor@6.1.0

## 3.0.11

### Patch Changes

- Updated dependencies [[`4f31f06`](https://github.com/portabletext/editor/commit/4f31f06917b216f25cff8a04a204e15a6750ab91)]:
  - @portabletext/editor@6.0.11

## 3.0.10

### Patch Changes

- Updated dependencies [[`eec5bfa`](https://github.com/portabletext/editor/commit/eec5bfab7d50cc25a9de27bf6f21a586701a8650)]:
  - @portabletext/editor@6.0.10

## 3.0.9

### Patch Changes

- Updated dependencies [[`3149548`](https://github.com/portabletext/editor/commit/314954827b7c1df1d10b581dfe33c7ad175030ca), [`55ceaf2`](https://github.com/portabletext/editor/commit/55ceaf258948ad1dc9a2e41086821095f730ca25)]:
  - @portabletext/editor@6.0.9

## 3.0.8

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@6.0.8

## 3.0.7

### Patch Changes

- Updated dependencies [[`ef4fe18`](https://github.com/portabletext/editor/commit/ef4fe182bec3696d3b4588c7c44e4ed9c3f680fd)]:
  - @portabletext/editor@6.0.7

## 3.0.6

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@6.0.6

## 3.0.5

### Patch Changes

- Updated dependencies [[`c90dd12`](https://github.com/portabletext/editor/commit/c90dd12039ddb2502f740a5e84ece54b32ea2008)]:
  - @portabletext/editor@6.0.5

## 3.0.4

### Patch Changes

- Updated dependencies [[`e71f420`](https://github.com/portabletext/editor/commit/e71f420de68de7d99eaacee405c8eeaa7f983c35)]:
  - @portabletext/editor@6.0.4

## 3.0.3

### Patch Changes

- Updated dependencies [[`08d7e56`](https://github.com/portabletext/editor/commit/08d7e56e0623ddfde4af4f827af09f19deabe44d), [`bfa7feb`](https://github.com/portabletext/editor/commit/bfa7feb46aca3e9ef5fcd8f35a87177a2f75816d)]:
  - @portabletext/editor@6.0.3

## 3.0.2

### Patch Changes

- Updated dependencies [[`68d4f82`](https://github.com/portabletext/editor/commit/68d4f82bf596724d8bed31721786f21f5dea3377)]:
  - @portabletext/editor@6.0.2

## 3.0.1

### Patch Changes

- Updated dependencies [[`da6e04f`](https://github.com/portabletext/editor/commit/da6e04f3685de0ecab1bee38c941d5cdd3cd1aac), [`a4b0b48`](https://github.com/portabletext/editor/commit/a4b0b484e865a83174d27196112c619ffd9b1605), [`9e768b1`](https://github.com/portabletext/editor/commit/9e768b1d88446d89bbfc9dd7d0e54ba3d7d09765), [`d28c017`](https://github.com/portabletext/editor/commit/d28c017bec5a064cd3402b9a99a3358f693c4238), [`c3b7905`](https://github.com/portabletext/editor/commit/c3b79057c4992409dde5646d86d3b7c5d3db26a3), [`e9bcda3`](https://github.com/portabletext/editor/commit/e9bcda385fb8217fddffe039325a9d338a51adec), [`80c7378`](https://github.com/portabletext/editor/commit/80c73781a0d45fce376083a810f16b1438c9d94f), [`77a10ce`](https://github.com/portabletext/editor/commit/77a10ced03fe211bd912b520e7fb469985fec1af), [`018857f`](https://github.com/portabletext/editor/commit/018857fc34d9d600d4a45c06b1b62926759e4164), [`398adef`](https://github.com/portabletext/editor/commit/398adefc035c177dafd0b16d7dbdcd8de6f86fde), [`7d5b051`](https://github.com/portabletext/editor/commit/7d5b051a4a310b798b62ba78b6fea0a11351ed48)]:
  - @portabletext/editor@6.0.1

## 3.0.0

### Patch Changes

- Updated dependencies [[`79b69a5`](https://github.com/portabletext/editor/commit/79b69a5cd7f5a19d4393453b993611916ab86a95), [`5a3e8bf`](https://github.com/portabletext/editor/commit/5a3e8bf33d9591b9cfbf310e37ae95f736862942), [`2f8d366`](https://github.com/portabletext/editor/commit/2f8d36694ddad97a5b1ca910ffc7f7e60937c642), [`3ce0561`](https://github.com/portabletext/editor/commit/3ce056153812bf75c3d95a452417f1f7e45f352e)]:
  - @portabletext/editor@6.0.0

## 2.0.6

### Patch Changes

- Updated dependencies [[`837aab4`](https://github.com/portabletext/editor/commit/837aab4fa86dd32b4cf59b81a0a1ee53aab525aa)]:
  - @portabletext/editor@5.1.1

## 2.0.5

### Patch Changes

- Updated dependencies [[`9840585`](https://github.com/portabletext/editor/commit/9840585b286929ff095cd2ebf3b1ead8b47a0edf)]:
  - @portabletext/editor@5.1.0

## 2.0.4

### Patch Changes

- Updated dependencies [[`a3eb985`](https://github.com/portabletext/editor/commit/a3eb985d2fe074ac5a62b53acc50d9f4f1cbddcb)]:
  - @portabletext/editor@5.0.4

## 2.0.3

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@5.0.3

## 2.0.2

### Patch Changes

- Updated dependencies []:
  - @portabletext/editor@5.0.2

## 2.0.1

### Patch Changes

- Updated dependencies [[`0155283`](https://github.com/portabletext/editor/commit/0155283c5b398f5678222acfdf7da7229a6fe0a6), [`921d03c`](https://github.com/portabletext/editor/commit/921d03c3d42b80949b25940d85cbc913dcc91f18)]:
  - @portabletext/editor@5.0.1

## 2.0.0

### Patch Changes

- Updated dependencies [[`aadc179`](https://github.com/portabletext/editor/commit/aadc179d1a1181fb52af5905d9be9360b804ab81)]:
  - @portabletext/editor@5.0.0

## 1.0.4

### Patch Changes

- Updated dependencies [[`3900875`](https://github.com/portabletext/editor/commit/3900875d6cefc6b66e0b0282eda1216ae8ede67c)]:
  - @portabletext/editor@4.3.10

## 1.0.3

### Patch Changes

- Updated dependencies [[`b700377`](https://github.com/portabletext/editor/commit/b7003778bfff174842f264c392d4bb7641e02001)]:
  - @portabletext/editor@4.3.9

## 1.0.2

### Patch Changes

- Updated dependencies [[`9e5cab1`](https://github.com/portabletext/editor/commit/9e5cab1d73b1bdfa011bc69654d1476a42a2fd94)]:
  - @portabletext/editor@4.3.8

## 1.0.1

### Patch Changes

- Updated dependencies [[`ed5e0a0`](https://github.com/portabletext/editor/commit/ed5e0a06523ff4a46579156e0093c778f0478f94)]:
  - @portabletext/editor@4.3.7
