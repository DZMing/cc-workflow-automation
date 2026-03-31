#!/bin/bash
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
FAIL=0
for s in test-c1-hash-consistency.js test-c2-context-proxy.js \
         test-c3-instruction-strings.js test-c4-quality-fsm.js \
         test-c5-integration-smoke.js; do
  echo "=== $s ==="
  node "$DIR/$s" || FAIL=1
  echo ""
done
[ $FAIL -eq 0 ] && echo "ALL SUITES PASSED" || { echo "SOME SUITES FAILED"; exit 1; }
