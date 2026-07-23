# Writing the internal release notes

These form the GitHub release body (`gh release create`). They are not
committed anywhere else — the GitHub release is their home.

This is a judgment call, not a template. The principles below matter more
than any particular format.

- **Audience: Chris and future agents reading the repo's history.** The
  complete record of the release: user-facing changes _and_ everything the
  store notes deliberately omit — build/release tooling, refactors,
  dependency work, docs, test infrastructure.
- **Derive from the commit log** (`git log <prev-tag>..<new-tag> --oneline`),
  but synthesize rather than dump: group related commits, explain the why
  where a commit subject alone wouldn't age well, and flag anything with
  ongoing consequences (new setup steps, changed workflows, known issues).
- **Lead with the user-facing summary** (it can restate the store notes),
  then the internal changes. A reader should be able to tell at a glance
  what shipped to users vs. what only changed the machinery.
- **Same privacy rule as everywhere:** the repo is public — no personal
  dataset content, no secrets, no credential file paths beyond what the
  committed docs already show.
