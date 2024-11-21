# Changelog

## [0.9.0](https://github.com/C4illin/ConvertX/compare/v0.8.1...v0.9.0) (2024-11-21)


### Features

* add inkscape for vector images ([f3740e9](https://github.com/C4illin/ConvertX/commit/f3740e9ded100b8500f3613517960248bbd3c210))
* Allow to chose webroot ([36cb6cc](https://github.com/C4illin/ConvertX/commit/36cb6cc589d80d0a87fa8dbe605db71a9a2570f9)), closes [#180](https://github.com/C4illin/ConvertX/issues/180)
* disable convert when uploading ([58e220e](https://github.com/C4illin/ConvertX/commit/58e220e82d7f9c163d6ea4dc31092c08a3e254f4)), closes [#177](https://github.com/C4illin/ConvertX/issues/177)


### Bug Fixes

* treat unknown as m4a ([1a442d6](https://github.com/C4illin/ConvertX/commit/1a442d6e69606afef63b1e7df36aa83d111fa23d)), closes [#178](https://github.com/C4illin/ConvertX/issues/178)
* wait for both upload and selection ([4c05fd7](https://github.com/C4illin/ConvertX/commit/4c05fd72bbbf91ee02327f6fcbf749b78272376b)), closes [#177](https://github.com/C4illin/ConvertX/issues/177)

## [0.8.1](https://github.com/C4illin/ConvertX/compare/v0.8.0...v0.8.1) (2024-10-05)


### Bug Fixes

* disable convert button when input is empty ([78844d7](https://github.com/C4illin/ConvertX/commit/78844d7bd55990789ed07c81e49043e688cbe656)), closes [#151](https://github.com/C4illin/ConvertX/issues/151)
* resize to fit for ico ([b4e53db](https://github.com/C4illin/ConvertX/commit/b4e53dbb8e70b3a95b44e5b756759d16117a87e1)), closes [#157](https://github.com/C4illin/ConvertX/issues/157)
* treat jfif as jpeg ([339b79f](https://github.com/C4illin/ConvertX/commit/339b79f786131deb93f0d5683e03178fdcab1ef5)), closes [#163](https://github.com/C4illin/ConvertX/issues/163)

## [0.8.0](https://github.com/C4illin/ConvertX/compare/v0.7.0...v0.8.0) (2024-09-30)


### Features

* add light theme, fixes [#156](https://github.com/C4illin/ConvertX/issues/156) ([72636c5](https://github.com/C4illin/ConvertX/commit/72636c5059ebf09c8fece2e268293650b2f8ccf6))


### Bug Fixes

* add support for usd for assimp, [#144](https://github.com/C4illin/ConvertX/issues/144) ([2057167](https://github.com/C4illin/ConvertX/commit/20571675766209ad1251f07e687d29a6791afc8b))
* cleanup formats and add opus, fixes [#159](https://github.com/C4illin/ConvertX/issues/159) ([ae1dfaf](https://github.com/C4illin/ConvertX/commit/ae1dfafc9d9116a57b08c2f7fc326990e00824b0))
* support .awb and clean up, fixes [#153](https://github.com/C4illin/ConvertX/issues/153), [#92](https://github.com/C4illin/ConvertX/issues/92) ([1c9e67f](https://github.com/C4illin/ConvertX/commit/1c9e67fc3201e0e5dee91e8981adf34daaabf33a))

## [0.7.0](https://github.com/C4illin/ConvertX/compare/v0.6.0...v0.7.0) (2024-09-26)


### Features

* Add support for 3d assets through assimp converter ([63a4328](https://github.com/C4illin/ConvertX/commit/63a4328d4a1e01df3e0ec4a877bad8c8ffe71129))


### Bug Fixes

* wrong layout on search with few options ([8817389](https://github.com/C4illin/ConvertX/commit/88173891ba2d69da46eda46f3f598a9b54f26f96))

## [0.6.0](https://github.com/C4illin/ConvertX/compare/v0.5.0...v0.6.0) (2024-09-25)


### Features

* ui remake with tailwind ([22f823c](https://github.com/C4illin/ConvertX/commit/22f823c535b20382981f86a13616b830a1f3392f))


### Bug Fixes

* rename css file to force update cache, fixes [#141](https://github.com/C4illin/ConvertX/issues/141) ([47139a5](https://github.com/C4illin/ConvertX/commit/47139a550bd3d847da288c61bf8f88953b79c673))

## [0.5.0](https://github.com/C4illin/ConvertX/compare/v0.4.1...v0.5.0) (2024-09-20)


### Features

* add option to customize how often files are automatically deleted ([317c932](https://github.com/C4illin/ConvertX/commit/317c932c2a26280bf37ed3d3bf9b879413590f5a))


### Bug Fixes

* improve file name replacement logic ([60ba7c9](https://github.com/C4illin/ConvertX/commit/60ba7c93fbdc961f3569882fade7cc13dee7a7a5))

## [0.4.1](https://github.com/C4illin/ConvertX/compare/v0.4.0...v0.4.1) (2024-09-15)


### Bug Fixes

* allow non lowercase true and false values, fixes [#122](https://github.com/C4illin/ConvertX/issues/122) ([bef1710](https://github.com/C4illin/ConvertX/commit/bef1710e3376baa7e25c107ded20a40d18b8c6b0))

## [0.4.0](https://github.com/C4illin/ConvertX/compare/v0.3.3...v0.4.0) (2024-08-26)


### Features

* add option for unauthenticated file conversions [#114](https://github.com/C4illin/ConvertX/issues/114) ([f0d0e43](https://github.com/C4illin/ConvertX/commit/f0d0e4392983c3e4c530304ea88e023fda9bcac0))
* add resvg converter ([d5eeef9](https://github.com/C4illin/ConvertX/commit/d5eeef9f6884b2bb878508bed97ea9ceaa662995))
* add robots.txt ([6597c1d](https://github.com/C4illin/ConvertX/commit/6597c1d7caeb4dfb6bc47b442e4dfc9840ad12b7))
* Add search bar for formats ([53fff59](https://github.com/C4illin/ConvertX/commit/53fff594fc4d69306abcb2a5cad890fcd0953a58))


### Bug Fixes

* keep unauthenticated user logged in if allowed [#114](https://github.com/C4illin/ConvertX/issues/114) ([bc4ad49](https://github.com/C4illin/ConvertX/commit/bc4ad492852fad8cb832a0c03485cccdd7f7b117))
* pdf support in vips ([8ca4f15](https://github.com/C4illin/ConvertX/commit/8ca4f1587df7f358893941c656d78d75f04dac93))
* Slow click on conversion popup does not work ([4d9c4d6](https://github.com/C4illin/ConvertX/commit/4d9c4d64aa0266f3928935ada68d91ac81f638aa))

## [0.3.3](https://github.com/C4illin/ConvertX/compare/v0.3.2...v0.3.3) (2024-07-30)


### Bug Fixes

* downgrade @elysiajs/html dependency to version 1.0.2 ([c714ade](https://github.com/C4illin/ConvertX/commit/c714ade3e23865ba6cfaf76c9e7259df1cda222c))

## [0.3.2](https://github.com/C4illin/ConvertX/compare/v0.3.1...v0.3.2) (2024-07-09)


### Bug Fixes

* increase max request body to support large uploads ([3ae2db5](https://github.com/C4illin/ConvertX/commit/3ae2db5d9b36fe3dcd4372ddcd32aa573ea59aa6)), closes [#64](https://github.com/C4illin/ConvertX/issues/64)

## [0.3.1](https://github.com/C4illin/ConvertX/compare/v0.3.0...v0.3.1) (2024-06-27)


### Bug Fixes

* release releases ([4d4c13a](https://github.com/C4illin/ConvertX/commit/4d4c13a8d85ec7c9209ad41cdbea7d4380b0edbf))

## [0.3.0](https://github.com/C4illin/ConvertX/compare/v0.2.0...v0.3.0) (2024-06-27)


### Features

* add version number to log ([4dcb796](https://github.com/C4illin/ConvertX/commit/4dcb796e1bd27badc078d0638076cd9f1e81c4a4)), closes [#44](https://github.com/C4illin/ConvertX/issues/44)
* change to xelatex ([fae2ba9](https://github.com/C4illin/ConvertX/commit/fae2ba9c54461dccdccd1bfb5e76398540d11d0b))
* print version of installed converters to log ([801cf28](https://github.com/C4illin/ConvertX/commit/801cf28d1e5edac9353b0b16be75a4fb48470b8a))

## [0.2.0](https://github.com/C4illin/ConvertX/compare/v0.1.2...v0.2.0) (2024-06-20)


### Features

* add libjxl for jpegxl conversion ([ff680cb](https://github.com/C4illin/ConvertX/commit/ff680cb29534a25c3148a90fd064bb86c71fb482))
* change from debian to alpine ([1316957](https://github.com/C4illin/ConvertX/commit/13169574f0134ae236f8d41287bb73930b575e82)), closes [#34](https://github.com/C4illin/ConvertX/issues/34)

## [0.1.2](https://github.com/C4illin/ConvertX/compare/v0.1.1...v0.1.2) (2024-06-10)


### Bug Fixes

* fix incorrect redirect ([25df58b](https://github.com/C4illin/ConvertX/commit/25df58ba82321aaa6617811a6995cb96c2a00a40)), closes [#23](https://github.com/C4illin/ConvertX/issues/23)

## [0.1.1](https://github.com/C4illin/ConvertX/compare/v0.1.0...v0.1.1) (2024-05-30)


### Bug Fixes

* :bug: make sure all redirects are 302 ([9970fd3](https://github.com/C4illin/ConvertX/commit/9970fd3f89190af96f8762edc3817d1e03082b3a)), closes [#12](https://github.com/C4illin/ConvertX/issues/12)

## 0.1.0 (2024-05-30)


### Features

* remove file from file list in index.html ([787ff97](https://github.com/C4illin/ConvertX/commit/787ff9741ecbbf4fb4c02b43bd22a214a173fd7b))


### Miscellaneous Chores

* release 0.1.0 ([54d9aec](https://github.com/C4illin/ConvertX/commit/54d9aecbf949689b12aa7e5e8e9be7b9032f4431))
