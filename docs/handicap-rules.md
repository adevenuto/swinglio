# Handicap System Reference

WHS-style handicap calculation implemented in `lib/handicap.ts` with types in `types/handicap.ts`.

## Minimum Requirements

- **3 eligible rounds** required to produce a Handicap Index
- Only the **most recent 20** eligible rounds are considered
- Rounds excluded if missing course rating, slope, par, attestation, or if player withdrew

## Differential Table

| Eligible Rounds | Lowest Used | Adjustment |
|:-:|:-:|:-:|
| 3 | 1 | -2.0 |
| 4 | 1 | -1.0 |
| 5 | 1 | 0 |
| 6 | 2 | -1.0 |
| 7–8 | 2 | 0 |
| 9–11 | 3 | 0 |
| 12–14 | 4 | 0 |
| 15–16 | 5 | 0 |
| 17–18 | 6 | 0 |
| 19 | 7 | 0 |
| 20 | 8 | 0 |

**Lowest Used** = how many of the lowest differentials are averaged.
**Adjustment** = offset applied to the average (benefits early-stage players).

## Core Formulas

**Differential** = `((AGS - courseRating) * 113) / slope`

**Handicap Index** = `round(avg(lowest N differentials) + adjustment, 1 decimal)`

**Course Handicap (CH)** = `round(HI * (slope / 113) + (courseRating - par))`

**Net Double Bogey (NDB)** = `par + 2 + strokesReceived`
- `strokesReceived = floor(CH / 18) + (strokeIndex <= CH % 18 ? 1 : 0)`

**Adjusted Gross Score (AGS)** = sum of per-hole scores, each capped at its NDB. If no handicap index or stroke index data exists, raw gross score is used (no NDB cap).

## How Rounds Accumulate

1. With **0–2 rounds**, no index is produced — the system reports how many more rounds are needed.
2. At **3 rounds**, only the single lowest differential is used, with a **-2.0 adjustment** that compensates for the small sample (assumes the player's best is better than their average).
3. At **4 rounds** the adjustment softens to **-1.0**, and at **5 rounds** it drops to **0** — still using just the best 1 of the batch.
4. At **6 rounds** the system begins using **2 lowest**, with a final **-1.0 adjustment**.
5. From **7 rounds onward** all adjustments are **0** — the growing sample is self-correcting.
6. The count of used differentials scales up gradually (2 → 3 → 4 → 5 → 6 → 7 → 8) as more rounds become available, always selecting the best performances.
7. At **20 rounds** the index averages the **8 lowest** differentials from the most recent 20. Rounds beyond 20 fall off (oldest first).

Bad rounds are naturally filtered out because only the lowest N differentials contribute. This means a single blow-up round has limited impact — it simply won't be among the selected lowest.

## Exclusion Reasons

A round is excluded from handicap calculation for any of these reasons (see `ExclusionReason` type):

| Reason | Meaning |
|---|---|
| `no_course_rating` | Course rating data unavailable |
| `no_slope` | Slope rating data unavailable |
| `no_par` | Par data unavailable |
| `not_attested` | Round was not attested |
| `total_only` | Only total score recorded (no hole-by-hole) |
| `withdrew` | Player withdrew from the round |

## Display Formatting

- Positive index: `"12.3"`
- Plus handicap (negative index): `"+2.1"`
- No index: `"N/A"`

## Not Yet Implemented

- **PCC** (Playing Conditions Calculation) — daily course difficulty adjustment
- **Soft/Hard Cap** — limits on upward index movement between updates
- **ESR** (Exceptional Score Reduction) — extra reduction after unusually low rounds
- **Iterative NDB refinement** — two-pass AGS recalculation using the newly computed index
