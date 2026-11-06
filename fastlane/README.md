fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

### prepare

```sh
[bundle exec] fastlane prepare
```

Step 1 of docs/store-builds.md: a clean tree, yarn cap:sync, nothing new to commit

### release

```sh
[bundle exec] fastlane release
```

Bump versions, prepare, build and upload both apps, tag: release version:1.2 [push:false]

### check

```sh
[bundle exec] fastlane check
```

Checks both stores accept the credentials

----


## iOS

### ios build

```sh
[bundle exec] fastlane ios build
```

Archives the App Store build: ios build [version:1.2] [build:3]

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Builds and uploads to TestFlight: ios beta [version:1.2] [build:3]

### ios submit

```sh
[bundle exec] fastlane ios submit
```

Submits a processed TestFlight build for review: ios submit [build:3] [auto_release:true]

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Uploads the screenshots to the version's listing: ios screenshots [locales:en,fr] [version:1.2]

### ios metadata

```sh
[bundle exec] fastlane ios metadata
```

Uploads the listing texts: ios metadata [version:1.2]

### ios pull_metadata

```sh
[bundle exec] fastlane ios pull_metadata
```

Downloads the App Store listing texts into fastlane/metadata/ios

----


## Android

### android build

```sh
[bundle exec] fastlane android build
```

Builds the release bundle: android build [version:1.2] [build:3]

### android internal

```sh
[bundle exec] fastlane android internal
```

Builds and uploads to internal testing: android internal [version:1.2] [build:3]

### android promote

```sh
[bundle exec] fastlane android promote
```

Promotes internal testing to production (review): android promote [build:3] [rollout:0.2]

### android screenshots

```sh
[bundle exec] fastlane android screenshots
```

Uploads the screenshots (phone, 7″ and 10″ tablet): android screenshots [locales:en,fr]

### android metadata

```sh
[bundle exec] fastlane android metadata
```

Uploads the listing texts: android metadata

### android pull_metadata

```sh
[bundle exec] fastlane android pull_metadata
```

Downloads the Play listing into fastlane/metadata/android

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
