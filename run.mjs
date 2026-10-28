// Writes what Pele makes of the cases its suites hold, as fixtures for the tests of a port of
// Pele to compare with.
//
//   node --experimental-transform-types --no-warnings --import ./register.mjs run.mjs [--full] <pele> <out> [suite…]
//
// scripts/oracle.sh runs it. Each suite is a module in ./suites whose default export is an
// async function given the helpers below; with no suites named, all of them run. The modules
// the suites share are in ./lib.
//
// A suite writes the fixture named for it, x.json.gz in the folder out, as flowchart-render
// writes flowchart-render.json.gz. The gantt suite also writes gantt-dates.json.gz.
//
// A suite named x-render writes drawings: for each case, as lines, the lines it read out of
// what Pele drew, one per thing drawn. The first FULL cases keep their lines; each case after
// them holds a digest of its lines in their place, as digest, which a port's tests compare
// with the digest of the lines they write. A test that reads some of Pele's lines through the
// port's own code, as the author's style or the arcs of a path, cannot write those lines as
// Pele wrote them, so its suite gives write a predicate, keep, of the lines to keep in full
// beside the digest, as kept, by their index. With --full, the lines of every case are also
// written to x.full.json.gz beside the fixture, which a release leaves out: a test reads it
// only to show which line differs from a digest, and the fixture stays what it compares with.
//
// The fixtures of the trigonometry are the last bits V8 gives on arm64, where clang fuses
// multiplies and adds that it does not fuse on x86-64, and a port's sines and logarithms are
// ported to match them; so the oracle runs only on arm64.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';

const args = process.argv.slice(2);
const full = args[0] === '--full';
if (full) args.shift();
const [pele, outDir, ...only] = args;
if (!pele || !outDir) {
  console.error('usage: run.mjs [--full] <pele> <out> [suite…]');
  process.exit(2);
}
if (process.arch !== 'arm64') {
  console.error(
    `run.mjs: this is ${process.arch}; the fixtures hold what V8 on arm64 computes, as its sines and logarithms ` +
      'come out otherwise where clang does not fuse multiply-adds, so they are written only on arm64'
  );
  process.exit(2);
}

const dir = new URL('./suites/', import.meta.url);
const all = readdirSync(dir)
  .filter((f) => f.endsWith('.mjs'))
  .map((f) => f.slice(0, -4))
  .sort();
const unknown = only.filter((name) => !all.includes(name));
if (unknown.length > 0) {
  console.error(`run.mjs: no suite ${unknown.join(', ')}; the suites are ${all.join(' ')}`);
  process.exit(2);
}

let commit = '';
try {
  commit = execFileSync('git', ['-C', pele, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
} catch {}
const { version } = JSON.parse(readFileSync(join(pele, 'package.json'), 'utf8'));
const origin = { version, commit, arch: process.arch, node: process.version };

// How many cases of a fixture of drawings keep their lines in full: enough that a difference
// in the cases a suite writes out by hand, which come first, and in a share of the rest is
// shown line by line. A port that reads the fixtures takes the same number.
const FULL = 300;

// The digest of the lines of a drawing: the first 16 bytes of the SHA-256 of the lines, each
// in UTF-8 followed by a newline, in lowercase hexadecimal, as a port takes it too.
// takes it.
function digest(lines) {
  const h = createHash('sha256');
  for (const line of lines) h.update(line + '\n', 'utf8');
  return h.digest().subarray(0, 16).toString('hex');
}

// The cases of a fixture of drawings as the fixture holds them: past the first FULL, each with
// a digest of its lines in their place, and after it the lines keep is true of, by their
// index. Every other field of a case stays as it is, where it is.
function drawings(cases, keep) {
  return cases.map((c, i) => {
    if (i < FULL || !Array.isArray(c.lines)) return c;
    const out = {};
    for (const [key, value] of Object.entries(c)) {
      if (key !== 'lines') {
        out[key] = value;
        continue;
      }
      out.digest = digest(value);
      const kept = {};
      value.forEach((line, k) => {
        if (keep?.(line)) kept[k] = line;
      });
      if (Object.keys(kept).length > 0) out.kept = kept;
    }
    return out;
  });
}

// Writes json, gzipped, as name.json.gz in the folder out, unless the file holds it already.
function save(name, json) {
  const out = join(outDir, name + '.json.gz');
  if (existsSync(out) && gunzipSync(readFileSync(out)).toString('utf8') === json) {
    console.log(`unchanged ${name}.json.gz`);
    return;
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(out, gzipSync(json, { level: 9 }));
  console.log(`wrote ${name}.json.gz`);
}

const helpers = {
  pele,
  // Imports a module of Pele's sources, by its path under src.
  src: (path) => import(join(pele, 'src', path)),
  // Reads ./cases/<name>.json.
  cases: (name) => JSON.parse(readFileSync(new URL(`./cases/${name}.json`, import.meta.url), 'utf8')),
  // Writes the fixture name, with the version of Pele it came from, gzipped as name.json.gz
  // in the folder out. A fixture whose JSON is what the file holds already is left as it is.
  // Of a fixture of drawings, one named x-render with its cases in cases, the cases past the
  // first FULL hold digests of their lines, with the lines keep(line) is true of kept in full.
  write(name, data, { keep } = {}) {
    if (!name.endsWith('-render') || !Array.isArray(data.cases)) {
      save(name, JSON.stringify({ pele: origin, ...data }) + '\n');
      return;
    }
    save(name, JSON.stringify({ pele: origin, ...data, cases: drawings(data.cases, keep) }) + '\n');
    if (full) save(name + '.full', JSON.stringify({ pele: origin, ...data }) + '\n');
  },
  // A random number generator in [0, 1) that gives the same numbers for the same seed.
  random(seed) {
    let s = seed >>> 0;
    return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32;
  },
};

for (const name of all.filter((name) => only.length === 0 || only.includes(name))) {
  const suite = await import(new URL(`${name}.mjs`, dir));
  await suite.default(helpers);
}
