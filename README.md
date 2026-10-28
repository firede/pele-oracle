# pele-oracle

pele-oracle writes what [Pele](https://github.com/obsidianmd/pele), the Mermaid renderer of
the Obsidian team, makes of a large set of cases, as fixtures for the tests of its ports to
compare with. [limu](https://github.com/firede/limu), in Go, and
[limu-rs](https://github.com/firede/limu-rs), in Rust, check that they lay diagrams out as
Pele does with them, number for number.

It runs Pele's TypeScript sources as they are, with Node 24 and nothing to install. Its
suites read Pele's parsers, layouts and SVG, and write the models Pele parses, the numbers
its layouts give, and what its SVG draws, read back as one line per thing drawn. Nothing in a
fixture depends on the language of the port that reads it.

## Fixtures

Each release holds the fixtures of one version of Pele, in `fixtures.tar`, with its SHA-256
beside it. A tag is `pele-<version>-<n>`, where
`n` counts the releases for that version of Pele, so `pele-1.12.0-2` holds the fixtures of
Pele 1.12.0 written by suites changed since `pele-1.12.0-1`. The archive holds one
`<suite>.json.gz` for each suite, and `manifest.json`, which records the version and commit
of Pele, the commit of pele-oracle that wrote them, and the SHA-256 of each fixture.

A port pins a release by its tag and the archive's SHA-256, downloads it once, and runs its
tests offline after that.

## Writing them

```sh
./scripts/oracle.sh ../pele              # every suite, into out/
./scripts/oracle.sh ../pele flowchart-render
./scripts/oracle.sh --full ../pele       # also the full lines of every drawing
./scripts/pack.sh pele-1.12.0-1          # dist/pele-1.12.0-1/fixtures.tar
```

The checkout of Pele must be at the commit the fixtures are for. The oracle runs only on
arm64, because the fixtures of the trigonometry hold the last bits V8 gives there. A port
tries fixtures before they are released by reading them from `out/`.

[AGENTS.md](AGENTS.md) has the rules for changing the suites.

## License

MIT. See [LICENSE](LICENSE), which also includes Pele's license.
