# Release documentation checklist

Apply this checklist when publishing any version, including playtest patches. Documentation describes the branch being released; publishing a development branch does not mean it has been merged into `main`.

1. Update the version in `package.json` and the root package records in `package-lock.json`. Keep the in-game release label sourced from the package version.
2. Add a new entry at the top of `CHANGELOG.md`. Describe delivered behavior, fixes and material limitations. Retain earlier entries. Do not list planned work as delivered.
3. Update the README title and Current release table to match the package version, branch and save compatibility. Record validation only after it has passed for the released code.
4. Add a concise patch summary to README → Recent changelog and link to the full changelog. Older summaries may move to the full changelog; their history must remain available there.
5. Add or update the relevant row in README → Milestone history. Retain delivered milestone rows and their linked records. Do not label a development release as merged or production-ready without evidence.
6. Update the relevant `docs/PLAYTEST-*.md` record and `docs/ROADMAP.md` with actual checks, known limits and remaining work. Keep V3 as the complete-playability milestone until that decision changes.
7. Before pushing, verify README's version against `package.json`, check its local Markdown links and confirm that all release documents describe the same release. Update the PR description around the final delivered behavior.

Documentation-only corrections keep the existing game version unless executable behavior also changes. They do not require rerunning gameplay tests; verify version consistency, links and the documentation diff instead.
