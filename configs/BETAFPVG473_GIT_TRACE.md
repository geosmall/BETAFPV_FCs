# BETAFPVG473 family — upstream git trace (gyro & HSE)

Trace of the relevant `betaflight/config` history behind the `BETAFPVG473`,
`BETAFPVG473_V2`, and `BETAFPVG473_V3` unified targets archived in this repo, plus the exact
upstream commit each archived `config.h` matches. The `config.h` files here are upstream
**source** (not device captures) with a canonical home and a moving HEAD; this doc stamps the
snapshot so it's clear which release the archived files correspond to.

Source repo: <https://github.com/betaflight/config> — `configs/BETAFPVG473*/config.h`

## Snapshot provenance (what our archived files match)

All five archived targets now match the `betaflight/config` commit pinned by the
**Betaflight 2025.12.4** release (the latest stable, 2026-06-02). That release's firmware repo
pins `config` as a git submodule at commit **`1359bbecb`** (2026-05-31, config PR
[#1098](https://github.com/betaflight/config/pull/1098)).

| Archived file | Last meaningful change in this snapshot |
| --- | --- |
| `BETAFPVF405/config.h`      | unchanged since before 2025.12.x |
| `BETAFPVF405_ELRS/config.h` | unchanged since before 2025.12.x |
| `BETAFPVG473/config.h`      | HSE reverted to 0 ([#1075](https://github.com/betaflight/config/pull/1075), 2026-04-29) |
| `BETAFPVG473_V2/config.h`   | BMI270 + ICM42622P added ([#1101](https://github.com/betaflight/config/pull/1101), 2026-05-14) |
| `BETAFPVG473_V3/config.h`   | BMI270 + ICM42622P added ([#1101](https://github.com/betaflight/config/pull/1101), 2026-05-14) |

### Refresh history

These files were originally archived as an older dated snapshot (V2/V3 from the Feb 2026
`#1027` era, before the #1101 IMU additions) and deliberately kept frozen. That decision was
**later reversed**: the targets were refreshed to the 2025.12.4 released set (commit
`1359bbecb`). Only V2 and V3 changed in that refresh — they gained the `BMI270` and
`ICM42622P` IMU options plus an upstream "SUPPORTED TARGET" provenance comment; F405,
F405_ELRS, and G473 were already current. To re-verify or re-refresh, diff each archived
`config.h` against `configs/<BOARD>/config.h` at the submodule SHA pinned by the desired
Betaflight release tag (`src/config` in `betaflight/betaflight`).

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

Betaflight release dates for cross-reference: 4.5.0 (2024-04-28), 4.5.1 (2024-07-27),
**4.5.2 (2025-03-19)**, 4.5.3 (2025-11-23), 4.5.4 (2026-05-31).

### Two separate clock problems, conflated in one issue thread

The dates show the popular "HSE=8 broke 4.5.2" story is wrong — there are **two distinct
regressions** that issue #14427 ran together:

1. **The 4.5.2 trigger (not HSE).** Users reported ESC reading broke going 4.5.1 → 4.5.2, but
   HSE=8 did not exist yet — #737 merged **2025-04-01, after 4.5.2 shipped (2025-03-19)**. What
   4.5.2 actually changed was a cluster of STM32G4 clock-domain fixes: "Fix STM32G4 SPI2/SPI3
   busses running at double intended clock rate" (betaflight #14161), "Fix G4 SPI clock being
   double what it should be" (#14215), and "fix timer based bidirectional dshot command not
   working" (#13991). One of these is the real 4.5.1→4.5.2 trigger.
2. **HSE=8 (added later).** #737 added it after 4.5.2; it first shipped in 4.5.3 (2025-11-23)
   and dev builds, *compounding* the timing problem rather than fixing it. #1075 then reverted
   HSE→HSI and was accepted as the fix (tested on real hardware by the contributor).

So the maintainer-accepted resolution is "revert to HSI," but the original 4.5.2 trigger was a
separate G4 clock change — the thread never cleanly separated them.

### Cross-board comparison: V1 is the lone HSE outlier

Across all 21 `STM32G47X` targets in `betaflight/config` (HEAD, June 2026):

| HSE setting | Count | Notable boards |
| --- | --- | --- |
| `8` (8 MHz crystal) | 13 | **BETAFPVG473_V2, _V3**, AOCODARCG473V1, SPEDIXG473, CRAZYBEE473, TAKERG4AIO, JHEG474, HYBRIDG4, HDZERO_GAMMA/AIO15, NEUTRONRCG4AIO, AIRBOTG4AIO |
| `16` (16 MHz crystal) | 1 | MERCURYG4 |
| no define (implicit HSI) | 6 | MAMBAG4, KAKUTEG4AIO, LUX/AIO boards |
| **`0` (explicitly forced HSI)** | **1** | **BETAFPVG473 (V1) — the only forced-0 target** |

Two conclusions:

- **Not a general G4/HSE/DSHOT incompatibility.** 13 other G473 targets — including BetaFPV's
  own V2 and V3 — run HSE=8 with bidir DSHOT fine. V1's problem is board-specific.
- **Crystal frequency genuinely varies** (MERCURYG4 = 16 MHz, not 8), which matters next.

### Likely real root cause: `BETAFPVG473` is a *shared* target

The V1 target is flashed to **several distinct physical products** — Matrix 1S 5in1, Matrix 1S
3in1 HD, Air Brushless 5in1, and the AIR75 archived here. A single `SYSTEM_HSE_MHZ` must be
correct for *every* one of those PCBs at once. If even one variant lacks an 8 MHz crystal (or
uses another value), HSE=8 yields a wrong system clock on that variant — and since bitbanged
bidir DSHOT (which the AIR75 diff uses) derives its bit timing directly from the system clock,
telemetry decode / ESC passthrough breaks. HSI gives the correct *nominal* 168 MHz on every
variant (just less accurate), so **reverting to HSI is the only setting guaranteed safe across
all boards sharing the target.**

This reframes the retracted wrong-crystal theory: the contributor's *scope measurement* was
invalid ("probing the wrong pin"), but the underlying idea — HSE=8 doesn't match the hardware
on at least some variants — was never disproven, just never bench-confirmed.

### Was it lazy / a hardware fault? (assessment)

- **It wasn't the OEM debugging.** #737 (add) and #1075 (revert) were Betaflight *volunteers*
  (ot0tot, haslinghuis), not BetaFPV. BetaFPV's own shipped 4.5.0/4.5.1 `.hex` works and is the
  known-good fallback.
- **No confirmed hardware defect.** Root cause (crystal present? what frequency?) was never
  documented; bench investigation was started but botched (wrong probe pin) and not resumed.
- **The revert was pragmatic, arguably correct** — HSI is the defensible universal default for
  a shared, superseded target. If anything is "lazy," it's *upstream* of the revert: #737 added
  HSE=8 to a multi-board target on the assumption all variants carry an 8 MHz crystal, without
  verifying.

### Could a fix have kept HSE on V1?

Yes — and HSE is *preferable* for timing-sensitive bidir DSHOT, since a crystal is far more
accurate than HSI (ST: trimmed HSI still drifts ~0.3%/step with temp/voltage; HSE is
crystal-accurate). The catch is the shared target:

- **Proper fix:** split the target per board variant, each with its verified crystal value —
  which is exactly what V2/V3 are. Betaflight effectively did this going forward; V2's HSE was
  added separately (#1007), tested working, and never reverted.
- **Individual-user fix:** if you confirm *your specific* board has an 8 MHz crystal on the
  MCU's HSE pins, set `SYSTEM_HSE_MHZ 8` in a local custom build for working, more-accurate HSE.
  You must verify the crystal first — the whole problem is that the shared target couldn't.

### Corroboration from this repo's own captures

`betafpv_75mm.txt` bench logs match the upstream end state exactly:

- `BETAFPVG473` (V1) reports `Clock=168MHz (PLLR-HSI)` — running on the internal oscillator
  (consistent with the #1075 revert).
- `BETAFPVG473_V2` reports `Clock=168MHz (PLLR-HSE)` — running on the validated external
  crystal.

## Summary

- **Gyro:** ICM42688P is primary on all G473 revisions. V2/V3 gained LSM6DSK320X (#1027) and
  later BMI270 + ICM42622P (#1101); our archive is now refreshed to the 2025.12.4 set, so V2/V3
  carry all four IMU options.
- **HSE:** V1 toggled HSI → HSE → HSI. The final state is HSI because `BETAFPVG473` is a
  *shared* target across several physical boards, so HSE=8 couldn't be guaranteed correct on
  all of them — HSI is the safe universal default. No confirmed hardware fault; root cause never
  bench-confirmed. V1 is the only one of 21 G47X targets forced to HSE=0. V2/V3 keep a working,
  tested HSE because they're narrower targets with consistent crystals. The 4.5.2 ESC-reading
  regression was a *separate* G4 clock change, not HSE (HSE postdates 4.5.2). Our archived V1
  reflects the post-revert (HSI) state.

## Sources

- `betaflight/config`: [#337](https://github.com/betaflight/config/pull/337),
  [#693](https://github.com/betaflight/config/pull/693),
  [#737](https://github.com/betaflight/config/pull/737),
  [#928](https://github.com/betaflight/config/pull/928),
  [#1007](https://github.com/betaflight/config/pull/1007),
  [#1027](https://github.com/betaflight/config/pull/1027),
  [#1075](https://github.com/betaflight/config/pull/1075),
  [#1101](https://github.com/betaflight/config/pull/1101)
- `betaflight/betaflight`: [issue #14427](https://github.com/betaflight/betaflight/issues/14427);
  4.5.2 clock fixes #14161, #14215, #13991 ([releases](https://github.com/betaflight/betaflight/releases))
- BetaFPV firmware pages (shared `BETAFPVG473` target across Matrix 1S / Air / AIR75 products)
- ST: [STM32G4 RCC training](https://www.st.com/resource/en/product_training/STM32G4-System-Reset_and_clock_control_RCC.pdf),
  [HSI accuracy AN](https://www.st.com/resource/en/application_note/dm00425536-how-to-optimize-stm32-mcus-internal-rc-oscillator-accuracy-stmicroelectronics.pdf)
- HSE comparison: 21 `STM32G47X` targets surveyed in `betaflight/config` @ HEAD (June 2026)
