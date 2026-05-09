# Phase 2 Substance Performance Notes

Measured locally on 2026-05-09 with:

`npm test -- --reporter=verbose frontend/src/features/intelligence/analyzer.fixtures.test.ts`

Budgets from ADR 0046:

- Median preflight under 1 second for inputs up to 15 MB.
- p95 under 2 seconds for inputs up to 15 MB.
- UI-heavy parsing runs in a worker.
- Large inputs receive preflight warnings before full processing.

## Fixture Timings

| Fixture                    | Preflight |
| -------------------------- | --------: |
| 01-mcmaster-step           |      5 ms |
| 02-step-assembly           |      2 ms |
| 03-3dbenchy-stl            |      2 ms |
| 04-thingi10k-truncated-stl |      9 ms |
| 05-stanford-bunny-ply      |      2 ms |
| 06-smithsonian-obj         |      2 ms |
| 07-modelnet40-off          |      2 ms |
| 08-colmap-south-building   |      2 ms |
| 09-eth3d-highres           |      2 ms |
| 10-partial-phone-photos    |      1 ms |

Median: 2 ms.

p95: 9 ms.

Worst: 9 ms, truncated STL recovery.

These fixtures are intentionally small committed excerpts/manifests, so the numbers validate parser behavior and worker-ready logic, not full native reconstruction throughput. The large-input policy remains the 15 MB browser preflight budget and the 80 MB photo-set budget documented in ADR 0046.
