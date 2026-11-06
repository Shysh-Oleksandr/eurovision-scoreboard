#!/bin/sh
# yarn fastlane …: fastlane through Bundler (Gemfile) on a Homebrew Ruby.
# macOS's own Ruby 2.6 is too old for fastlane. `brew install ruby` once.
for dir in /opt/homebrew/opt/ruby/bin /usr/local/opt/ruby/bin; do
  if [ -x "$dir/ruby" ]; then
    PATH="$dir:$PATH"
    break
  fi
done
export PATH
export LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8
export FASTLANE_OPT_OUT_USAGE=1 FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_HIDE_CHANGELOG=1

cd "$(dirname "$0")/.." || exit 1
if ! bundle check >/dev/null 2>&1; then
  bundle install || exit 1
fi
exec bundle exec fastlane "$@"
