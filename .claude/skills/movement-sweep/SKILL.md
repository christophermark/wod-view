---
name: movement-sweep
description: This skill should be used to audit and expand WOD View's movement detection (src/lib/movements.ts) against the local workout archive. Trigger on requests like "run a movement sweep", "check movement detection coverage", "are we missing any movements/spellings", or after importing a new SugarWOD export. It measures coverage with a committed script, mines unmatched programming text for missing movements and spellings, then widens the taxonomy safely with tests.
---

# Movement detection coverage sweep

Audit how well the movement taxonomy covers the local workout archive, then
expand it. The measurement is scripted; the judgment — deciding which mined
phrases are real movements versus noise — is the model's job.

## Workflow

### 1. Measure

```bash
npx tsx scripts/analyze-movement-coverage.ts          # add --top 120 for more mined lines
```

Uses the personal dataset when present (`src/data/workouts.json`, gitignored),
preview data otherwise. Record the headline numbers (workouts with ≥1
detection, line coverage %, reps-parsed %) to compare after changes.

### 2. Interpret the unmatched lines

Classify each frequent normalized line:

- **Missing spelling of an existing movement** (hyphenation, plural,
  abbreviation, gym slang like "freedom swings") → widen that pattern.
- **Missing movement entirely** → new `MovementDef` with modality/equipment.
- **Lift variant** (e.g. "low hang power clean") → def with `variantOf` so the
  display list doesn't double-count.
- **Not a movement's job**: benchmark names (Cindy, Murph → benchmarks
  feature), % -of-1RM schemes (title fallback handles them), partner/scoring
  chatter, headers → leave alone. Do not add noise patterns.

Line mining hides misses on lines that already match another movement, so
before adding anything, verify candidates with a direct term count:

```bash
npx tsx -e "const d=require('./src/data/workouts.json');console.log(d.filter(w=>/YOUR_PATTERN/i.test(w.description)).length)"
```

### 3. Change the taxonomy (`src/lib/movements.ts`)

Rules that keep the sweep safe to repeat:

- **Widen-only.** Never narrow a legacy pattern; the parity test asserts no
  workout the original 23 regexes matched is ever lost. False-positive guards
  (like the Cleans `(?!\s*up\b)`) are fine when the parity test stays green.
- **Short abbreviations need word boundaries** and a collision check against
  the archive before adding (`DL` was safe; bare `DU` was not).
- **Reps: null over guess.** New scheme parsing must return null when
  ambiguous. Complete schemes (ladders, sets×reps) skip round multipliers.

### 4. Test everything

Every new spelling, movement, and scheme gets a case in
`src/lib/__tests__/movements.test.ts` — synthetic recreations only, never
archive content (hard privacy rule, see AGENTS.md). Add false-positive tests
for any abbreviation or guard introduced.

### 5. Verify and report

```bash
npm test && npm run typecheck && npx eslint . && npx prettier --check .
npx tsx scripts/analyze-movement-coverage.ts   # re-measure
```

Report before → after aggregates (per-movement workout counts, coverage
percentages) and the judgment calls made, including what was deliberately
not added and why. Reports may contain movement names and counts, but never
dates, notes, scores, or quoted description lines from the personal archive.
