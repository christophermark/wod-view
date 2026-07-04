# 05 — Benchmarks: detection, pages, standards, retest radar

**Effort:** M · **Depends on:** 03 (for disambiguation) · **Status:** done

## Why

Benchmarks are CrossFit's scoreboard — SugarWOD catalogs Girls/Heroes
separately, and coaching consensus says retest every 8–16 weeks. With no
community data, published level standards (beginner → elite, PRzilla-style)
give scores context offline: a 5:40 Fran reads as "intermediate, 20s off
advanced" instead of a bare time.

## Static data

`src/data/benchmarks.ts` (committed, no personal data):

```ts
export interface BenchmarkDef {
  name: string; // 'Fran'
  category: 'girl' | 'hero' | 'open' | 'other';
  aliases?: RegExp; // 'Open 24.1' | '24.1' etc.
  lowerIsBetter: boolean; // time WODs true; AMRAPs false
  /** Movement names (taxonomy canonical) used to confirm ambiguous matches. */
  movements: string[];
  /** Published level standards in score units; omit when none exist. */
  standards?: { beginner: number; intermediate: number; advanced: number; elite: number };
}
```

Seed with ~25 Girls (Fran, Grace, Helen, Cindy, Diane, Karen, Isabel, Jackie,
Elizabeth, Annie, Barbara, Chelsea, Mary, Nancy, Kelly, Angie…), ~10 common
Heroes (Murph, DT, JT, Michael, Randy, Chad…), and the Open pattern
(`\b2[0-9]\.[1-3][a-b]?\b`). Standards from published tables; leave
`standards` off rather than inventing numbers.

## Detection

`src/lib/benchmarks.ts` (pure):

```ts
matchBenchmark(w: Workout): BenchmarkDef | null
benchmarkHistory(list: Workout[]): Map<string, Workout[]>   // name → attempts, oldest first
retestRadar(list: Workout[], todayIso: string): { def: BenchmarkDef; lastDate: string; daysSince: number }[]
```

**False positives are the design problem.** Titles are "Tuesday 7.4.2023
Coach Marcus/Dana" — names like Grace, Karen, Diane can be coach or member
names. Rules:

- Name must appear in the _description_ (or a title without the weekday
  pattern), as a standalone word, typically with '"Fran"' quotes or a
  `Benchmark`/`Girl`/`Hero` nearby keyword — treat quotes/keywords as strong
  signals.
- Ambiguous hit → confirm via `detectMovements`: ≥ half the benchmark's
  movement list must be present. "Karen" without wall balls is a person.
- `retestRadar` includes only benchmarks with ≥1 past attempt; threshold 112
  days (16 weeks), sorted most-overdue first.

## UX

- **Benchmarks screen** — new route `src/app/benchmarks.tsx`, entered from a
  stats-screen card ("BENCHMARKS · 6 tracked"). Sections: Girls / Heroes /
  Open. Each row: name, best score (mono), attempts count, days since last.
- **Benchmark detail** — attempts as a simple bar timeline (hand-rolled
  Views, like the stats screen's year bars): x = attempt date, bar = score,
  best highlighted in `colors.gold`. When `standards` exist, render the four
  level bands behind the bars and a caption: "INTERMEDIATE — 0:20 OFF
  ADVANCED". Below: attempt list reusing the "last time" row style from 04.
- **Retest radar** — card on the stats screen listing the top 3 overdue:
  "FRAN · 214 DAYS AGO".
- Workout detail (`workout/[id].tsx`): when a workout matches a benchmark,
  show a `TagChip` with its name linking to the benchmark page.

## Testing

- detection: quoted names, bare names with/without confirming movements,
  coach-name false positives, Open `24.1` variants
- history ordering, best-attempt selection for lower/higher-is-better
- radar day math with fixed `todayIso`

## Out of scope

- User-defined custom benchmarks (v2 — the data shape already allows it).
- Score normalization across Rx/scaled attempts; show the Rx chip per attempt
  and let the athlete judge.
