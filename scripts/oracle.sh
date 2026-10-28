#!/bin/sh
# Writes the fixtures from Pele's sources.
#
#   ./scripts/oracle.sh [--full] [--out folder] [path to pele] [suite…]
#
# The path defaults to $PELE, then ../pele beside this repository; with suites named, it must
# be given. The fixtures are written to out/, or to the folder --out names. Node 24 or later
# runs Pele's TypeScript as it is; nothing needs to be installed. The suites are the modules in
# suites/; with none named, all of them run. A fixture whose JSON has not changed is left as
# it is.
#
# With --full, the lines of every case of a fixture of drawings are also written beside it, to
# x.full.json.gz, which a release leaves out.
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
full=
out=$root/out
while [ $# -gt 0 ]; do
	case $1 in
	--full) full=--full ;;
	--out) out=$2; shift ;;
	*) break ;;
	esac
	shift
done
pele=${1:-${PELE:-$root/../pele}}
if [ ! -f "$pele/package.json" ] || [ ! -f "$pele/src/index.ts" ]; then
	echo "oracle.sh: $pele is not a checkout of Pele" >&2
	echo "usage: ./scripts/oracle.sh [--full] [--out folder] [path to pele] [suite…]" >&2
	exit 2
fi
pele=$(cd "$pele" && pwd)
mkdir -p "$out"
out=$(cd "$out" && pwd)
if [ $# -gt 0 ]; then shift; fi
cd "$root"
exec node --experimental-transform-types --no-warnings --import ./register.mjs run.mjs $full "$pele" "$out" "$@"
