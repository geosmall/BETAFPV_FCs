# BETAFPVG473 family — upstream git trace (gyro, HSE, ESC-reading)

Trace of the relevant `betaflight/config` history behind the `BETAFPVG473`,
`BETAFPVG473_V2`, and `BETAFPVG473_V3` unified targets archived in this repo, plus the exact
upstream commit each archived `config.h` matches. The `config.h` files here are upstream
**source** (not device captures) with a canonical home and a moving HEAD; this doc stamps the
snapshot so it's clear which release the archived files correspond to.

Source repo: <https://github.com/betaflight/config> — `configs/BETAFPVG473*/config.h`

## Snapshot provenance (what our archived files match)

All five archived targets match the `betaflight/config` commit pinned by the
**Betaflight 2025.12.4** release (the latest stable, 2026-06-02). That release's firmware repo
pins `config` as a git submodule at commit **`1359bbecb`** (2026-05-31 — the then-current
`config` HEAD; the commit itself is an unrelated target addition).

| Archived file | Last `config.h` change at this snapshot |
| --- | --- |
| `BETAFPVF405/config.h`      | [#886](https://github.com/betaflight/config/pull/886) (2025-08-29) |
| `BETAFPVF405_ELRS/config.h` | [#993](https://github.com/betaflight/config/pull/993) (2025-12-24) |
| `BETAFPVG473/config.h`      | HSE reverted to 0 ([#1075](https://github.com/betaflight/config/pull/1075), 2026-04-29) |
| `BETAFPVG473_V2/config.h`   | BMI270 + ICM42622P added ([#1101](https://github.com/betaflight/config/pull/1101), 2026-05-14) |
| `BETAFPVG473_V3/config.h`   | BMI270 + ICM42622P added ([#1101](https://github.com/betaflight/config/pull/1101), 2026-05-14) |

To re-verify or move to a newer release, diff each archived `config.h` against
`configs/<BOARD>/config.h` at the submodule SHA pinned by the desired Betaflight release tag
(`src/config` in `betaflight/betaflight`).

### The "SUPPORTED TARGET" comment in V2/V3

The V2/V3 files carry an upstream block like:

```
/*
SUPPORTED TARGET - THANK YOU
REFERENCE: sha256_92fef4e6...
DATE: 2025-12-01
*/
```

This is Betaflight's **manufacturer-validation marker**, not something we add. Under the
unified-target scheme (config.h replaced the old per-board targets from 4.5.0), a manufacturer
must submit and maintain the target to keep it "supported." The `sha256`/`DATE` stamp records
that this config was validated and accepted into the official supported-target set. Keep it
verbatim — it's part of the released file. (V1's file carries no marker even though it was last
touched in 2026-04 — after the marker scheme existed — i.e. it simply isn't a submitted/
validated supported target, consistent with the board being superseded.)

## Gyro / IMU timeline (V2 & V3)

| Date | PR | Change |
| --- | --- | --- |
| 2025-05-30 | [#693](https://github.com/betaflight/config/pull/693)  | `BETAFPVG473_V2` target added |
| 2025-12-04 | [#928](https://github.com/betaflight/config/pull/928)  | `BETAFPVG473_V3` target added |
| 2026-02-24 | [#1027](https://github.com/betaflight/config/pull/1027) | Add **LSM6DSK320X** to V2, V3 (and H725) |
| 2026-05-14 | [#1101](https://github.com/betaflight/config/pull/1101) | Add **BMI270** and **ICM42622P** to the recognized-IMU list on V2 & V3 |

These boards have a **single gyro position** — Betaflight's `GYRO_1` device (one SPI bus, one
CS pin, one EXTI pin), with the IMU chip soldered to that one footprint. The firmware compiles
in several gyro drivers and **auto-detects whichever chip is actually fitted** (it reads the
chip's WHO_AM_I ID over SPI) — manufacturers second-source the IMU, so one firmware binary must
cover them all (the user does not pick the chip). `ICM42688P` is the reference/default part:
it's wired via the explicit `USE_ACC_SPI_ICM42688P` / `USE_GYRO_SPI_ICM42688P` defines and is
what every board in this repo reports in `status`. The `USE_ACCGYRO_*` entries are the
alternates the firmware will also recognize on that same `GYRO_1` device. So #1101 did **not**
change the primary or add a second gyro — it only grew the auto-detect list. (V1's list is just `ICM42688P` + `BMI270`; V1↔V2
differences are in `BETAFPVG473_V1_vs_V2.md`.)

## HSE (system clock) timeline — the V1 flip-flop

| Date | PR / issue | Change |
| --- | --- | --- |
| 2024-02-26 | [#337](https://github.com/betaflight/config/pull/337)  | V1 board added — no HSE define, runs on internal **HSI** |
| 2025-04-01 | [#737](https://github.com/betaflight/config/pull/737)  | V1: **add HSE=8** — "missing HSE was causing FC to use HSI, reduced clock accuracy" |
| 2026-01-11 | [#1007](https://github.com/betaflight/config/pull/1007) | V2: **add HSE=8** — "tested and confirmed working on this FC" (never reverted) |
| 2026-04-29 | [#1075](https://github.com/betaflight/config/pull/1075) | V1: **revert HSE 8 → 0**, fixes [betaflight#14427](https://github.com/betaflight/betaflight/issues/14427) |

Betaflight release dates for cross-reference: 4.5.0 (2024-04-28), 4.5.1 (2024-07-27),
**4.5.2 (2025-03-19)**, 4.5.3 (2025-11-23), 4.5.4 (2026-05-31); the date-based line —
2025.12.0-RC4 (2025-12-10), 2025.12.1 (2025-12-25), 2025.12.4 (2026-06-02).

### ESC-reading regression (#14427): root cause

[betaflight#14427](https://github.com/betaflight/betaflight/issues/14427) (esc-configurator
fails to read ESCs after 4.5.1) is an ESC-driver bug, not a clock issue — though it is commonly
attributed to HSE. The HSE flip-flop is a parallel change that was tagged to the same issue.

- **The regression bisects to 4.5.2 (2025-03-19), and HSE=8 postdates it.** Config #737 added
  HSE on 2025-04-01, *after* 4.5.2, so HSE cannot be the 4.5.1→4.5.2 trigger.
- **Trigger:**
  [betaflight#13922 "Fix kiss passthrough"](https://github.com/betaflight/betaflight/pull/13922)
  (merged 2024-09, shipped in 4.5.2) reworked the serial ESC passthrough driver
  (`openEscSerial`) to require a **dedicated TX timer**, which STM32G4 boards cannot always
  allocate. Passthrough then hard-failed, so esc-configurator could not read the ESCs (ESC 3/4 —
  the timer-starved outputs — fail first).
- **Fix:**
  [betaflight#14794 "Fix openEscSerial"](https://github.com/betaflight/betaflight/pull/14794)
  (merged 2025-11-27, milestone 2025.12, so present in 2025.12.4) removes the hard failure and
  **falls back to reusing the RX timer for TX** when no dedicated TX timer is free. Stated goal:
  "preserve the KISS passthrough fix but restore G4 ESC compatibility."

The STM32G4 clock fixes that also shipped in 4.5.2 (#14161/#14215 SPI clock, #13991 bidir-DSHOT
timer) are unrelated to #14427, despite the shared release.

### Cross-board comparison: V1 is the lone HSE outlier

Across all 21 `STM32G47X` targets in `betaflight/config` (HEAD, June 2026):

| HSE setting | Count | Notable boards |
| --- | --- | --- |
| `8` (8 MHz crystal) | 12 | **BETAFPVG473_V2, _V3**, AOCODARCG473V1, SPEDIXG473, CRAZYBEE473, TAKERG4AIO, JHEG474, HYBRIDG4, HDZERO_GAMMA, HDZERO_AIO15, NEUTRONRCG4AIO, AIRBOTG4AIO |
| `16` (16 MHz crystal) | 1 | MERCURYG4 |
| no define (implicit HSI) | 7 | MAMBAG4, KAKUTEG4AIO, GEPRC_TAKER_G473AIO, NUCLEOG474, SUB250_REDFOX_G473AIO, LUXHDAIO-G4, LUXMICROAIO |
| **`0` (explicitly forced HSI)** | **1** | **BETAFPVG473 (V1) — the only forced-0 target** |

Two conclusions:

- **Not a general G4/HSE/DSHOT incompatibility.** 12 other G47X targets — including BetaFPV's
  own V2 and V3 — run HSE=8 without a forced revert. V1's problem is board-specific.
- **Crystal frequency varies across boards** (MERCURYG4 = 16 MHz, not 8).

### Why HSE=8 was reverted on V1: a shared target

The HSE revert is independently justified, separate from the ESC bug. `BETAFPVG473` is flashed
to **several distinct physical products** (Matrix 1S 5in1, Matrix 1S 3in1 HD, Air Brushless
5in1, and the AIR75 archived here). A single `SYSTEM_HSE_MHZ` must be correct for *every* one of
those PCBs at once. If any variant lacks an 8 MHz crystal (or uses another value), HSE=8 yields
a wrong system clock on that variant, and anything derived from it (DSHOT bit timing, USB,
serial bauds) drifts. HSI gives the correct *nominal* 168 MHz on every variant (just less
accurate), so HSI is the only clock setting guaranteed safe across all boards sharing the
target.

On the retracted wrong-crystal theory (a contributor suspected an 8 kHz crystal, then withdrew
it as a bad scope measurement — "probing the wrong pin"): the underlying possibility — that
HSE=8 doesn't match the hardware on some variants — was neither confirmed nor disproven. #1075
cited #14427, but the substantive ESC fix was the firmware change (#14794); the HSE revert's
contribution to ESC reading is unconfirmed.

### Assessment: hardware fault, or process gap?

- **Not a manufacturer-side investigation.** #737 (add) and #1075 (revert) were Betaflight
  community volunteers (ot0tot, haslinghuis), not BetaFPV. BetaFPV's own 4.5.0/4.5.1 `.hex` works
  and is the known-good fallback.
- **No confirmed hardware defect.** Whether the board carries an HSE crystal, and at what
  frequency, was never documented; bench investigation was attempted but invalidated (wrong probe
  pin) and not resumed.
- **The revert is a reasonable default**, not a diagnosis — HSI is the safe universal setting for
  a shared, superseded target. The avoidable error is upstream of the revert: #737 added HSE=8 to
  a multi-board target assuming every variant carries an 8 MHz crystal, without verifying.

### Keeping HSE on V1

Keeping HSE is possible and preferable for timing-sensitive bidir DSHOT, since a crystal is far
more accurate than HSI (per ST, trimmed HSI still drifts ~0.3%/step with temperature and
voltage; HSE is crystal-accurate). The obstacle is the shared target:

- **Proper fix:** split the target per board variant, each with its verified crystal value —
  which is exactly what V2/V3 are. Betaflight effectively did this going forward; V2's HSE was
  added separately (#1007), tested working, and never reverted.
- **Individual-user fix:** if you confirm *your specific* board has an 8 MHz crystal on the
  MCU's HSE pins, set `SYSTEM_HSE_MHZ 8` in a local custom build for working, more-accurate HSE.
  You must verify the crystal first — the whole problem is that the shared target couldn't.

### How to test whether a board has a working HSE crystal

`system_hse_mhz` is a runtime CLI setting (it appears as `set system_hse_mhz = 8` in the V2
diff), so the firmware's own clock-init can tell you — no instruments needed:

1. CLI: `set system_hse_mhz = 8` then `save` (board reboots).
2. Reconnect, run `status`, read the **Clock** line:
   - `Clock=168MHz (PLLR-HSE)` → a working 8 MHz crystal **is present** (HSE started, PLL locked).
   - `Clock=168MHz (PLLR-HSI)` → **no usable HSE crystal** (HSE didn't start; fell back to HSI).
   - won't enumerate / unstable → likely a crystal of the *wrong* frequency (PLL targets a wrong
     multiple).
3. Restore: `set system_hse_mhz = 0` then `save`.

Betaflight's G4 clock init falls back to HSI if HSE fails to start, so the normal failure mode
is "reports HSI," not an unbootable board; recover via DFU/reflash if needed. This determines
whether a specific V1-target board carries an HSE crystal — a question the upstream discussion
left unresolved. (The `betafpv_75mm.txt` AIR75 capture shows `PLLR-HSI`, but it was taken with
HSE=0, so it does not answer this; forcing HSE=8 and re-reading `status` would.)

### Corroboration from this repo's own captures

`betafpv_75mm.txt` bench logs match the upstream end state exactly:

- `BETAFPVG473` (V1) reports `Clock=168MHz (PLLR-HSI)` — running on the internal oscillator
  (consistent with the #1075 revert).
- `BETAFPVG473_V2` reports `Clock=168MHz (PLLR-HSE)` — running on the validated external
  crystal.

## Summary

- **Gyro:** every G473 revision has a single gyro position (`GYRO_1`) with ICM42688P as the reference part;
  the other `USE_ACCGYRO_*` entries are auto-detect alternates for second-sourced chips, not a
  second gyro. V2/V3 gained LSM6DSK320X (#1027) then BMI270 + ICM42622P (#1101); at the 2025.12.4
  set their auto-detect list holds all four chips.
- **ESC-reading regression (#14427):** root cause was an ESC-driver timer-allocation bug, not a
  clock issue. The 4.5.2 "Fix kiss passthrough" (#13922) made `openEscSerial` need a dedicated
  TX timer that G4 can't always spare; fixed in the 2025.12 line by #14794 (fall back to the RX
  timer).
- **HSE:** V1 toggled HSI → HSE → HSI. The final state is HSI because `BETAFPVG473` is a
  *shared* target across several physical boards, so HSE=8 couldn't be guaranteed correct on all
  of them — HSI is the safe universal default. No confirmed hardware fault; root cause never
  bench-confirmed (use the CLI test above to check a specific board). V1 is the only one of 21
  G47X targets forced to HSE=0. V2/V3 keep a working, tested HSE because they're narrower
  targets with consistent crystals. The HSE revert (#1075) was a parallel cleanup tagged to
  #14427, not the substantive ESC fix. Our archived V1 reflects the post-revert (HSI) state.

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
  ESC-driver regression [#13922](https://github.com/betaflight/betaflight/pull/13922) (cause) and
  [#14794](https://github.com/betaflight/betaflight/pull/14794) (fix, in 2025.12);
  unrelated 4.5.2 G4 changes #14161/#14215/#13991 ([releases](https://github.com/betaflight/betaflight/releases))
- BetaFPV firmware pages (shared `BETAFPVG473` target across Matrix 1S / Air / AIR75 products)
- ST: [STM32G4 RCC training](https://www.st.com/resource/en/product_training/STM32G4-System-Reset_and_clock_control_RCC.pdf),
  [HSI accuracy AN](https://www.st.com/resource/en/application_note/dm00425536-how-to-optimize-stm32-mcus-internal-rc-oscillator-accuracy-stmicroelectronics.pdf)
- HSE comparison: 21 `STM32G47X` targets surveyed in `betaflight/config` @ HEAD (June 2026)
