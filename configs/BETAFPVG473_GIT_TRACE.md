# BETAFPVG473 family — upstream git trace (gyro & HSE)

Trace of the relevant `betaflight/config` history behind the `BETAFPVG473`,
`BETAFPVG473_V2`, and `BETAFPVG473_V3` unified targets archived in this repo, plus the
upstream commit each archived `config.h` was captured at. The `config.h` files here are
upstream **source** (not device captures), so they have a canonical home and a moving HEAD;
this doc stamps the snapshot and records why the archived values differ from current upstream.

Source repo: <https://github.com/betaflight/config> — `configs/BETAFPVG473*/config.h`

## Snapshot provenance (what our archived files match)

| Archived file | Matches upstream commit | PR | Captured state |
| --- | --- | --- | --- |
| `BETAFPVG473/config.h`    | `4b320bcc6` (2026-04-29) | [#1075](https://github.com/betaflight/config/pull/1075) | after HSE reverted to 0 |
| `BETAFPVG473_V2/config.h` | `af00bf93e` (2026-02-24) | [#1027](https://github.com/betaflight/config/pull/1027) | LSM6DSK320X added, **before** #1101 |
| `BETAFPVG473_V3/config.h` | `af00bf93e` (2026-02-24) | [#1027](https://github.com/betaflight/config/pull/1027) | LSM6DSK320X added, **before** #1101 |

Note the V1 snapshot is newer than the V2/V3 snapshots — V1 was captured after the Apr 2026
HSE revert, while V2/V3 were captured in the Feb 2026 LSM6DSK320X era.

### Known drift from current upstream

`BETAFPVG473_V2` and `_V3` upstream have since gained two more selectable IMUs that our
archived snapshots do **not** contain:

- Upstream HEAD V2/V3 IMUs: `ICM42688P` (primary, SPI) + `LSM6DSK320X` + `BMI270` + `ICM42622P`
- Our archived V2/V3 IMUs: `ICM42688P` (primary, SPI) + `LSM6DSK320X` only

The `BMI270` and `ICM42622P` options were added by [#1101](https://github.com/betaflight/config/pull/1101)
(2026-05-14), after our snapshot. Decision (intentional): keep the dated snapshot, document
the drift here rather than refresh — the archived files match the 4.5.x firmware the boards
are actually running.

## Gyro / IMU timeline (V2 & V3)

| Date | PR | Change |
| --- | --- | --- |
| 2025-05-30 | [#693](https://github.com/betaflight/config/pull/693)  | `BETAFPVG473_V2` target added |
| 2025-12-04 | [#928](https://github.com/betaflight/config/pull/928)  | `BETAFPVG473_V3` target added |
| 2026-02-24 | [#1027](https://github.com/betaflight/config/pull/1027) | Add **LSM6DSK320X** to V2, V3 (and H725) |
| 2026-05-14 | [#1101](https://github.com/betaflight/config/pull/1101) | Add **BMI270** and **ICM42622P** as additional selectable IMUs on V2 & V3 |

Throughout, `ICM42688P` remains the primary SPI gyro/acc on every revision; these PRs only
add/replace the alternate `USE_ACCGYRO_*` drivers. (V1 carries `ICM42688P` + `BMI270`; the
V1↔V2 differences are detailed in `BETAFPVG473_V1_vs_V2.md`.)

## HSE (system clock) timeline — the V1 flip-flop

| Date | PR / issue | Change |
| --- | --- | --- |
| 2024-02-26 | [#337](https://github.com/betaflight/config/pull/337)  | V1 board added — no HSE define, runs on internal **HSI** |
| 2025-04-01 | [#737](https://github.com/betaflight/config/pull/737)  | V1: **add HSE=8** — "missing HSE was causing FC to use HSI, reduced clock accuracy" |
| 2026-01-11 | [#1007](https://github.com/betaflight/config/pull/1007) | V2: **add HSE=8** — "tested and confirmed working on this FC" (never reverted) |
| 2026-04-29 | [#1075](https://github.com/betaflight/config/pull/1075) | V1: **revert HSE 8 → 0**, fixes [betaflight#14427](https://github.com/betaflight/betaflight/issues/14427) |

### Why V1's HSE was reverted (and whether it's a hardware fault)

It was **never conclusively proven to be a hardware defect** — the project disabled HSE rather
than fully diagnose it, because the V1 board is effectively end-of-life:

- Enabling `SYSTEM_HSE_MHZ 8` on V1 caused a real regression: **ESC/DSHOT reading broke**
  after Betaflight 4.5.2 (issue #14427, reproduced by multiple users; BetaFPV's own 4.5.1
  `.hex` worked, stock 4.5.2+ did not). Reverting to HSI (`0`) fixed it.
- The contributor who added *and* reverted the HSE define first suspected BetaFPV fitted an
  8 **kHz** crystal instead of 8 **MHz**, but **retracted that** in the same comment ("I take
  that back. I was probing the wrong pin"). So the wrong-crystal theory was withdrawn — V1
  does have a crystal; it just isn't reliable as the system clock.
- Maintainer rationale for the revert was pragmatic, not forensic: the V1 board "has been
  replaced with new versions (V2 and V3) and assume is out of production," so HSI (the safe
  default, at slightly lower clock accuracy) was restored instead of chasing the root cause.
- V2's HSE, by contrast, was added separately (#1007), tested working, and never reverted.

### Corroboration from this repo's own captures

`betafpv_75mm.txt` bench logs match the upstream end state exactly:

- `BETAFPVG473` (V1) reports `Clock=168MHz (PLLR-HSI)` — running on the internal oscillator
  (consistent with the #1075 revert).
- `BETAFPVG473_V2` reports `Clock=168MHz (PLLR-HSE)` — running on the validated external
  crystal.

## Summary

- **Gyro:** ICM42688P is primary on all G473 revisions. V2/V3 gained LSM6DSK320X (#1027) and
  later BMI270 + ICM42622P (#1101); our V2/V3 archive predates #1101 and lacks the latter two.
- **HSE:** V1 toggled HSI → HSE → HSI; the final state is HSI because HSE broke ESC reading on
  an EOL board (no confirmed hardware fault, just disabled as the safe default). V2 uses a
  working, tested HSE. Our archived V1 reflects the post-revert (HSI) state.
