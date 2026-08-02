## Release Process

First, update and tidy up `CHANGELOG.md`.

```sh
# Bumps "version" in package.json, commits ("v3.1.0"), and tags the commit
# to match. Run from packages/rspress/ (or add --filter @live-demo/rspress
# from the repo root).
#
# Other bump types: major | minor | patch | premajor | preminor | prepatch |
# prerelease. You can also pass an explicit version instead, e.g.
# `pnpm version 3.1.0`.
pnpm version minor

# Builds the package and publishes it to npm. Needs an interactive terminal —
# the registry requires an OTP and pnpm can't prompt for one non-interactively.
pnpm release

# Pushes the commit and the tag pnpm version just created.
git push --follow-tags
```

Then create a GitHub release from the tag, using the matching `CHANGELOG.md`
section as the notes — don't hand-write separate release prose.

### Legacy major-version installs

No dist-tag needed for old majors: `npm install @live-demo/rspress@2` already
resolves via semver-range matching to the newest published `2.x`. (`npm
dist-tag add` also rejects a tag literally named `@2` — `@` isn't a legal
tag-name character, so this isn't a road worth going down.)

## Rollback

If a release turns out broken, point `latest` back at the last known good
version — no unpublish needed:

```sh
npm dist-tag add @live-demo/rspress@<lastGood> latest
```
