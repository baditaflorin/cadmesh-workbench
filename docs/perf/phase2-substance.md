# Phase 2 Substance Performance Notes

The fixture suite records local analysis durations for the 10 real-data fixtures. Budgets from ADR 0046:

- Median preflight under 1 second for inputs up to 15 MB.
- p95 under 2 seconds for inputs up to 15 MB.
- UI-heavy parsing runs in a worker.
- Large inputs receive preflight warnings before full processing.

Numbers are refreshed in the Phase 2 postmortem after implementation.
