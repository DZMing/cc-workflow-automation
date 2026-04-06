#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
FAIL=0
TOTAL=0

# macOS 兼容：优先用 gtimeout（brew install coreutils），否则跳过 timeout
TIMEOUT_CMD=""
if command -v timeout &>/dev/null; then
  TIMEOUT_CMD="timeout 60"
elif command -v gtimeout &>/dev/null; then
  TIMEOUT_CMD="gtimeout 60"
fi

for s in test-c1-hash-consistency.js test-c2-context-proxy.js \
         test-c3-instruction-strings.js test-c4-quality-fsm.js \
         test-c5-integration-smoke.js; do
  if [ ! -f "$DIR/$s" ]; then
    echo "=== $s === MISSING"
    FAIL=1
    continue
  fi
  echo "=== $s ==="
  $TIMEOUT_CMD node "$DIR/$s" || FAIL=1
  TOTAL=$((TOTAL + 1))
  echo ""
done
echo "--- $TOTAL suites executed ---"
[ $FAIL -eq 0 ] && echo "ALL SUITES PASSED ($TOTAL suites)" || { echo "SOME SUITES FAILED ($TOTAL suites)"; exit 1; }
