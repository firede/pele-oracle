#!/bin/sh
# Packs the fixtures in out/ for a release, as dist/<tag>/fixtures.tar, with the archive's
# SHA-256 beside it.
#
#   ./scripts/pack.sh <tag>
#
# A tag is pele-<version>-<n>: the version of Pele the fixtures were written from, and the
# number of the release among those of that version, from 1, as pele-1.12.0-1. The archive holds every fixture,
# gzipped as the oracle writes it, but not the .full ones, and manifest.json, which records the
# version and commit of Pele, the commit of pele-oracle, and the SHA-256 of each fixture. It
# packs only fixtures that were all written from the version the tag names, by the suites as
# they are committed, so that the manifest's commit says what wrote them.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
tag=${1:-}
version=${tag#pele-}
version=${version%-*}
case $tag in
pele-*-[0-9]*) ;;
*)
	echo "usage: ./scripts/pack.sh pele-<version>-<n>" >&2
	exit 2
	;;
esac
if [ -n "$(git status --porcelain -- run.mjs register.mjs hooks.mjs lib suites cases)" ]; then
	echo "pack.sh: the suites have changes not committed; commit them and write the fixtures again" >&2
	exit 1
fi
exec node - "$tag" "$version" "$(git rev-parse HEAD)" <<'JS'
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { mkdirSync, readdirSync, readFileSync, writeFileSync } = require('node:fs');
const { gunzipSync } = require('node:zlib');
const [tag, version, oracle] = process.argv.slice(2);
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const names = readdirSync('out').filter((f) => f.endsWith('.json.gz') && !f.endsWith('.full.json.gz')).sort();
const suites = readdirSync('suites').filter((f) => f.endsWith('.mjs')).length;
if (names.length < suites) {
  console.error(`pack.sh: out/ holds ${names.length} fixtures for ${suites} suites; run ./scripts/oracle.sh`);
  process.exit(1);
}
let pele;
const files = {};
for (const name of names) {
  const data = readFileSync(`out/${name}`);
  const origin = JSON.parse(gunzipSync(data).toString('utf8')).pele;
  if (origin.version !== version) {
    console.error(`pack.sh: ${name} was written from Pele ${origin.version}, not ${version}`);
    process.exit(1);
  }
  if (pele && origin.commit !== pele.commit) {
    console.error(`pack.sh: ${name} was written from commit ${origin.commit}, not ${pele.commit}`);
    process.exit(1);
  }
  pele = { version: origin.version, commit: origin.commit };
  files[name] = sha256(data);
}
mkdirSync(`dist/${tag}`, { recursive: true });
writeFileSync('out/manifest.json', JSON.stringify({ tag, pele, oracle, files }, null, 2) + '\n');
const archive = `dist/${tag}/fixtures.tar`;
execFileSync('tar', ['-cf', archive, '-C', 'out', 'manifest.json', ...names]);
const sum = sha256(readFileSync(archive));
writeFileSync(`${archive}.sha256`, `${sum}  fixtures.tar\n`);
console.log(`${archive}\nsha256 ${sum}`);
JS
