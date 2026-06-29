# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

This is **not a software project** — it has no build, test, or lint commands. It is a
version-controlled archive of **Betaflight configuration backups** for the owner's BETAFPV
flight controllers. The "code" here is Betaflight CLI text. Treat changes as configuration
edits to real flight hardware: a wrong value (motor protocol, board alignment, cell voltages,
motor reordering) can damage hardware or cause an uncontrolled craft. Do not invent or "tidy"
setting values — only transcribe what comes from an actual FC dump.

## Layout

Two kinds of artifact live here, and they must not be confused:

1. **CLI config backups** — one directory per board (`BETAFPV<board>/`), holding Betaflight
   CLI text that *tunes* a board.
2. **Firmware build targets** — `configs/<BOARD_NAME>/config.h`, the source that *defines* a
   board for the firmware build. See "Firmware build targets" below.

### CLI config backups

One directory per physical product (some share a `board_name`):

- `BETAFPVF405/` — STM32F405 board (`board_name BETAFPVF405`), craft "Pavo Pico II", BF 4.5.0
- `BETAFPVG473/` — standalone **Air Brushless 4in1 flight controller** (bare board,
  `board_name BETAFPVG473`), BF 4.5.0, factory config
- `AIR75_G473/` — the complete **AIR75 75mm drone** (same `board_name BETAFPVG473`), BF 4.5.0,
  backup with the external clock enabled (`system_hse_mhz = 8`)
- `BETAFPVG473_V2/` — newer STM32G473 revision (`board_name BETAFPVG473_V2`), **BF 4.5.3**,
  captured at factory defaults (no craft name, no tuned profiles)

`BETAFPVG473/` and `AIR75_G473/` are different products on the same `BETAFPVG473` target. The
FC's factory firmware sets `craft_name` to "AIR75", so the craft name does **not** distinguish
the bare 4in1 FC from the drone — the directory does.

Each board directory holds two file types, both Betaflight CLI text:

- `BTFL_cli_<craft>_<timestamp>_<board>.txt` — full Configurator CLI backup. Begins with a
  `status` block (live MCU/sensor/flash readout, **not** settings) followed by the `diff all`
  output. The status block is diagnostic context, not configuration.
- `BTFL_<craft>_<timestamp>_<board>.diff` — pure `diff all`: only settings that differ from
  firmware defaults, wrapped in `batch start` … `save`.

The top-level `OEM/` folder archives **as-shipped factory firmware packages** downloaded from
BetaFPV support, one subfolder per product. Each holds the factory **compiled firmware** (`.hex`,
an Intel HEX binary — a *third* artifact type, distinct from the CLI text and the `config.h`
source) plus its matching factory `diff all` saved with a `.txt` extension. **Inside `OEM/`, that
`.txt` is a pure `diff all`** (no leading `status` block) — i.e. it means what `.diff` means in a
board directory, despite the extension; do not assume it carries a status block. These are
BetaFPV's known-good reference builds; the paired diff may duplicate a CLI backup elsewhere. Do
not treat the `.hex` as editable config. (This `OEM/` folder replaces the older per-board
`OEM Firmware and Diff/` subfolders.)

The three archived packages (folder → product · board · firmware · BetaFPV source):

- `A75_0802SE_..._4.5.0 0520/` → AIR75 drone · `BETAFPVG473` · 4.5.0 (predates the HSE define, so
  runs HSI) · <https://support.betafpv.com/hc/en-us/articles/32986946281113>
- `BF4.5.3 F405_20A_Pavo_Pico_ELRS 20260104/` → Pavo Pico Ⅱ F405 · `BETAFPVF405` · see wrinkle
  below · <https://support.betafpv.com/hc/en-us/articles/50758255044889>
- `BF4.5.3 G473 3in1_12A_M75 Pro P1_ELRS_BMI270/` → Meteor75 Pro P1 · `BETAFPVG473` · 4.5.3 (HSI,
  `system_hse_mhz = 0`) · <https://support.betafpv.com/hc/en-us/articles/53664040865817>

The Pavo Pico Ⅱ package is internally inconsistent, and this is **not** a labeling error: the
`.hex` binary is Betaflight **4.5.3** (verified from the embedded version string via
`objcopy -I ihex -O binary <hex> <bin>` then `strings`), but the bundled `diff all`'s `# version`
line is **4.5.0** (`Dec 25 2024`). BetaFPV shipped a 4.5.3 firmware binary alongside a CLI dump
captured on a 4.5.0 unit. Keep the `BF4.5.3` folder name (it matches the firmware) and do **not**
edit the `# version` line (it correctly records the build the dump came from). Meteor75 Pro is a
*new* product on the `BETAFPVG473` target — distinct from the bare 4in1 FC, the AIR75 drone, and
the V2 board.

`AIR75_G473/` additionally holds a `GEO AIR75 Diff/` subfolder: the owner's **own tuning pass**
over the AIR75 (CLI `.diff` + `.txt`, same `BETAFPVG473` board and `mcu_id`, HSE enabled), as
opposed to a factory artifact. It is a delta from the dated AIR75 backup directly above it — the
`2026-06-15` capture remaps the ANGLE mode switch (AUX2 → AUX4) and re-tunes rateprofile 0
(throttle curve + roll/pitch/yaw expo/srate, throttle limit); master settings, profile 0 PIDs,
vtxtable, and OSD layout are unchanged. Treat it as the newest, owner-preferred AIR75 state.

### Firmware build targets

`configs/<BOARD_NAME>/config.h` are Betaflight **unified target definitions** — GPL-licensed
C headers (`#define BOARD_NAME`, `FC_TARGET_MCU`, `USE_*` peripheral flags, default
`SERIALRX_*`) used to build firmware for a board. They describe hardware, not settings; do
not edit them to change tuning, and do not treat them as restorable configs.

Targets present (a superset of the CLI backups — some have no backup, and vice versa):

- `BETAFPVF405`, `BETAFPVF405_ELRS` (F405 with CRSF baked in on USART3)
- `BETAFPVG473`, `BETAFPVG473_V2`, `BETAFPVG473_V3`

All targets use `ICM42688P` as the primary gyro/acc plus one or more alternate IMUs. The **V1
G473** target carries a single alternate (`BMI270`); the **F405 targets carry two** (`BMI270`,
`MPU6000`); **V2 and V3 carry three** (`BMI270`, `ICM42622P`, `LSM6DSK320X`). V2 also drops the
barometer; V3 wires serial RX on both USART1 and USART3. Match the target's `BOARD_NAME` to a
board exactly — the revisions are not interchangeable.

The `config.h` files are tracked to the **Betaflight 2025.12.4** released set
(`betaflight/config` submodule commit `1359bbecb`). `configs/BETAFPVG473_V1_vs_V2_vs_V3.md`
documents the full V1/V2/V3 target differences (clock source, IMU, barometer, gyro clock input,
HD OSD, motor/LED/gyro/ADC pin map). `configs/BETAFPVG473_GIT_TRACE.md` traces the upstream history behind the G473
gyro/HSE changes and stamps the exact commit each archived `config.h` matches. One thing to
know when working with these targets: the V1 HSE was reverted to HSI upstream (it broke ESC
reading; not a confirmed hardware fault). To update to a newer release, diff each
`config.h` against the `src/config` submodule SHA pinned by that release tag in
`betaflight/betaflight`.

### Scratch log

`betafpv_75mm.txt` at the repo root is a raw, unstructured CLI session log: six
`version`/`status` captures (no settings) taken on the bench across G473, G473_V2, and F405
boards. Scratch notes, not a restorable backup.

## Working with the configs

- A `.diff` file is the authoritative, replayable config: pasting it into the Betaflight CLI
  (`defaults nosave` → settings → `save`) reproduces that board's setup. The `.txt` differs
  only by the leading `status` block.
- Timestamps in filenames (`YYYYMMDD_HHMMSS`) order backups; the newest reflects current
  hardware state. Keep older backups rather than overwriting — they are the change history.
- All boards are manufacturer `BEFH`, MSP API 1.46. Across the **board-directory CLI backups**,
  firmware is **Betaflight 4.5.0** except `BETAFPVG473_V2`, which is on **4.5.3** (the `OEM/`
  firmware packages carry their own versions — see *OEM firmware* above). The `# version` line in
  each file records the exact firmware build; preserve it when editing. (4.5.3 falls in the 4.5.2–4.5.4 window of the G4
  ESC-passthrough bug documented in `configs/BETAFPVG473_GIT_TRACE.md` — but that affects only
  esc-configurator reading, not flight, and is unconfirmed on the V2 target; it does not affect
  the archived backup.)
- When diffing or comparing boards, expect per-board hardware fields to differ legitimately:
  `mcu_id`, `acc_calibration`, OSD element positions, and (G473) the `vtxtable`.
