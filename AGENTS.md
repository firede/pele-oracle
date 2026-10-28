# Working on pele-oracle

pele-oracle writes what Pele makes of its suites' cases, as fixtures for the tests of Pele's
ports, limu and limu-rs, to compare with.

## Layout

- `run.mjs` runs the suites and holds the helpers each is given. `register.mjs` and
  `hooks.mjs` let Node run Pele's TypeScript, and patch what the suites need into it.
- A suite in `suites/` is a module whose default export receives the helpers to import
  Pele's sources and write fixtures. A suite `x` writes `x.json.gz`. A suite named
  `x-render` writes drawings, whose cases past the first 300 hold a digest of their lines.
- What the suites share is in `lib/`, and the cases of the first suites are in `cases/`.
- What the hooks patch into Pele is in the table at the top of `hooks.mjs`. Each patch must
  find what it replaces exactly as many times as it says, or the oracle fails. The patches
  write a label as `<oracle-label …/>` and a marker as `<oracle-marker …/>` before Pele's
  own markup for it, as `lib/marks.mjs` says, and only while `oracleExactNumbers` is set.

## Rules

- A fixture holds what Pele makes of its cases and nothing of a port's. Where a port must
  read Pele's output its own way, as it reads the author's style or draws an arc, the suite
  keeps the lines that reading changes in full, with `keep`.
- A change to a suite that changes a fixture is released with a new tag, and the ports pin
  it when they are ready. Say in the release which fixtures changed and why.
- Run the suites with Node 24 on arm64 (`mise.toml` pins Node). The fixtures follow Pele
  1.12.0, commit 8aff183.

## Writing

Comments and documents are plain and exact. Say what a thing does and why, in full
sentences, without selling it. In documents, write short, natural sentences, and avoid
semicolons and lists led by a colon in running prose. Commit messages say what changed, in
the imperative.
