## Release Process

First, update and tidy up `CHANGELOG.md`.

```sh
# Bumps "version" in package.json, commits ("v2.1.0"), and tags the commit
# to match. Run from packages/rspress/ (or add --filter @live-demo/rspress
# from the repo root).
#
# Other bump types: major | minor | patch | premajor | preminor | prepatch |
# prerelease. You can also pass an explicit version instead, e.g.
# `pnpm version 2.1.0`.
pnpm version minor

# Builds the package and publishes it to npm.
pnpm release

# Pushes the commit and the tag pnpm version just created.
git push --follow-tags
```
