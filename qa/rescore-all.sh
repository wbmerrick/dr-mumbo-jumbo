#!/bin/bash
# Re-score every stored run with the current checker, each on the cases that run actually ran.
# Usage: qa/rescore-all.sh [OUTDIR]
# The raw part files live in qa/evidence/raw-runs*.tar.gz (runs 9–22); extract them into qa/ first:
#   cd qa && for t in evidence/raw-runs*.tar.gz; do tar xzf "$t"; done
# Runs whose raw files are not present are skipped.
cd "$(dirname "$0")"
OUT=${1:-rescore}
mkdir -p "$OUT"
AF="A-sleep-paraphrase B-inpatient-loc-photo C-prior-auth-biologic D-oon-er-eob E-coding-bundling F-medicare-advantage-pmd"
AH="$AF G-medicaid-mri-redflags H-oon-anesthesia-asc"
AJ="$AH I-original-medicare-ambulance J-urgent-irf-pdf-records"
score() { # run-dir cases...
  local r=$1; shift
  [ -d "$r" ] || return 0
  rm -rf "${OUT:?}/$r"; mkdir -p "$OUT/$r"
  for c in "$@"; do [ -d "$r/$c" ] && cp -r "$r/$c" "$OUT/$r/"; done
  FP_TODAY=2026-10-30 node fp-check.js "$OUT/$r" "$@" > "$OUT/$r/check.out" 2> "$OUT/$r.score.err"
  printf '%-14s %s\n' "$r" "$(grep -o 'TOTAL: [^*]*' "$OUT/$r/check.out")"
}
score runs3-final $AF
score runs4-final $AF
for n in 5 6 7 8 9 10 11 12 13 14 15; do score runs$n $AH; done
score runs16 I-original-medicare-ambulance J-urgent-irf-pdf-records
score runs17 C-prior-auth-biologic I-original-medicare-ambulance J-urgent-irf-pdf-records
score runs18 C-prior-auth-biologic I-original-medicare-ambulance J-urgent-irf-pdf-records
for n in 19 20 21 23; do score runs$n $AJ; done
score runs22-free G-medicaid-mri-redflags J-urgent-irf-pdf-records
