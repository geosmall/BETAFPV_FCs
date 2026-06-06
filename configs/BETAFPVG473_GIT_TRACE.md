# BETAFPVG473 family — upstream git trace (gyro & HSE)

Trace of the relevant `betaflight/config` history behind the `BETAFPVG473`,
`BETAFPVG473_V2`, and `BETAFPVG473_V3` unified targets archived in this repo, plus the exact
upstream commit each archived `config.h` matches. The `config.h` files here are upstream
**source** (not device captures) with a canonical home and a moving HEAD; this doc stamps the
snapshot so it's clear which release the archived files correspond to.

Source repo: <https://github.com/betaflight/config> — `configs/BETAFPVG473*/config.h`

## Snapshot provenance (what our archived files match)

All five archived targets match the `betaflight/config` commit pinned by the
**Betaflight 2025.12.4** release (the latest stable, 2026-06-02). That release's firmware repo
pins `config` as a git submodule at commit **`1359bbecb`** (2026-05-31, config PR
[#1098](https://github.com/betaflight/config/pull/1098)).

| Archived file | Last meaningful change |
| --- | --- |
| `BETAFPVF405/config.h`      | unchanged since before 2025.12.x |
| `BETAFPVF405_ELRS/config.h` | unchanged since before 2025.12.x |
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
verbatim — it's part of the released file. (V1's file doesn't carry one; it predates the marker
and wasn't re-submitted, consistent with the board being superseded.)

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

### What actually broke ESC reading (real root cause — not HSE)

The popular "HSE broke 4.5.2" story is wrong, and the maintainers ultimately traced and fixed
a **different** cause. The HSE flip-flop is a parallel cleanup that got tagged to the same
issue (#14427).

- **The regression bisects to 4.5.2 (2025-03-19), but HSE=8 didn't exist yet** — config #737
  added it 2025-04-01, *after* 4.5.2. So HSE cannot be the 4.5.1→4.5.2 trigger.
- **The real trigger was an ESC-driver change, not a clock change.**
  [betaflight #13922 "Fix kiss passthrough"](https://github.com/betaflight/betaflight/pull/13922)
  (merged 2024-09, shipped in 4.5.2) reworked the serial ESC passthrough driver
  (`openEscSerial`) to require a **dedicated TX timer** — which STM32G4 boards can't always
  allocate. Passthrough then hard-failed, so esc-configurator couldn't read the ESCs (users hit
  ESC 3/4 first — the timer-starved outputs).
- **The authoritative fix is**
  [betaflight #14794 "Fix openEscSerial"](https://github.com/betaflight/betaflight/pull/14794)
  (merged 2025-11-27, **milestone 2025.12** — i.e. in the 2025.12.x line our config now tracks).
  It removes the hard failure and **falls back to reusing the RX timer for TX** when no
  dedicated TX timer is free. Maintainer goal, verbatim: "preserve the KISS passthrough fix but
  restore G4 ESC compatibility."

So #14427 was an ESC-driver timer-allocation bug fixed in the firmware (#14794), **not** a
clock bug. The earlier guess in this doc — that 4.5.2's STM32G4 SPI-clock fixes (#14161/#14215)
or the bidir-DSHOT timer fix (#13991) caused it — was wrong; those are unrelated G4 changes
that happened to ship in the same release.

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

### Why HSE=8 was reverted on V1: it's a *shared* target

Even though HSE wasn't the ESC bug, reverting HSE=8→0 on V1 was still sound — because
`BETAFPVG473` is flashed to **several distinct physical products** (Matrix 1S 5in1, Matrix 1S
3in1 HD, Air Brushless 5in1, and the AIR75 archived here). A single `SYSTEM_HSE_MHZ` must be
correct for *every* one of those PCBs at once. If even one variant lacks an 8 MHz crystal (or
uses another value), HSE=8 yields a wrong system clock on that variant, and anything derived
from it (DSHOT bit timing, USB, serial bauds) goes off. HSI gives the correct *nominal* 168 MHz
on every variant (just less accurate), so **HSI is the only clock setting guaranteed safe
across all boards sharing the target.**

This reframes the retracted wrong-crystal theory: the contributor's *scope measurement* was
invalid ("probing the wrong pin"), but the underlying idea — HSE=8 doesn't match the hardware
on at least some variants — was never disproven, just never bench-confirmed. Note #1075 cited
#14427, but the substantive ESC fix was the firmware driver change (#14794); the HSE revert was
a parallel, board-specific cleanup whose actual contribution to ESC reading is unconfirmed.

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

Betaflight's G4 clock init has HSE-fail fallback to HSI, so the normal failure mode is "reports
HSI," not a brick; recover via DFU/reflash if needed. This is the concrete test that would
finally settle whether any given V1-target board carries an HSE crystal — the question the
upstream thread left open. (Our `betafpv_75mm.txt` AIR75 capture shows `PLLR-HSI`, but that was
taken with HSE=0, so it doesn't answer the question; forcing HSE=8 and re-reading `status`
would.)

### Corroboration from this repo's own captures

`betafpv_75mm.txt` bench logs match the upstream end state exactly:

- `BETAFPVG473` (V1) reports `Clock=168MHz (PLLR-HSI)` — running on the internal oscillator
  (consistent with the #1075 revert).
- `BETAFPVG473_V2` reports `Clock=168MHz (PLLR-HSE)` — running on the validated external
  crystal.

## Summary

- **Gyro:** ICM42688P is primary on all G473 revisions. V2/V3 gained LSM6DSK320X (#1027) and
  later BMI270 + ICM42622P (#1101); the archived files match the 2025.12.4 set, so V2/V3 carry
  all four IMU options.
- **ESC-reading regression (#14427):** root cause was an ESC-driver timer-allocation bug, not a
  clock issue. The 4.5.2 "Fix kiss passthrough" (#13922) made `openEscSerial` need a dedicated
  TX timer that G4 can't always spare; fixed in 2025.12.0 by #14794 (fall back to the RX timer).
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
