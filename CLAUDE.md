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

One directory per board, named by MCU/board:

- `BETAFPVF405/` — STM32F405 board (`board_name BETAFPVF405`), craft "Pavo Pico II", BF 4.5.0
- `BETAFPVG473/` — STM32G473 board (`board_name BETAFPVG473`), craft "AIR75", BF 4.5.0
- `BETAFPVG473_V2/` — newer STM32G473 revision (`board_name BETAFPVG473_V2`), **BF 4.5.3**,
  captured at factory defaults (no craft name, no tuned profiles)

Each board directory holds two file types, both Betaflight CLI text:

- `BTFL_cli_<craft>_<timestamp>_<board>.txt` — full Configurator CLI backup. Begins with a
  `status` block (live MCU/sensor/flash readout, **not** settings) followed by the `diff all`
  output. The status block is diagnostic context, not configuration.
- `BTFL_<craft>_<timestamp>_<board>.diff` — pure `diff all`: only settings that differ from
  firmware defaults, wrapped in `batch start` … `save`.

### Firmware build targets

`configs/<BOARD_NAME>/config.h` are Betaflight **unified target definitions** — GPL-licensed
C headers (`#define BOARD_NAME`, `FC_TARGET_MCU`, `USE_*` peripheral flags, default
`SERIALRX_*`) used to build firmware for a board. They describe hardware, not settings; do
not edit them to change tuning, and do not treat them as restorable configs.

Targets present (a superset of the CLI backups — some have no backup, and vice versa):

- `BETAFPVF405`, `BETAFPVF405_ELRS` (F405 with CRSF baked in on USART3)
- `BETAFPVG473`, `BETAFPVG473_V2`, `BETAFPVG473_V3`

All targets use `ICM42688P` as the primary gyro/acc plus one or more alternate IMUs. V1 and
the F405 targets carry a single alternate (`BMI270`); **V2 and V3 carry three** (`BMI270`,
`ICM42622P`, `LSM6DSK320X`). V2 also drops the barometer; V3 wires serial RX on both USART1
and USART3. Match the target's `BOARD_NAME` to a board exactly — the revisions are not
interchangeable.

The `config.h` files are tracked to the **Betaflight 2025.12.4** released set
(`betaflight/config` submodule commit `1359bbecb`). `configs/BETAFPVG473_V1_vs_V2.md`
documents the full V1↔V2 target differences (clock source, IMU, barometer, motor/LED/gyro/flash
pin map). `configs/BETAFPVG473_GIT_TRACE.md` traces the upstream history behind the G473
gyro/HSE changes and stamps the exact commit each archived `config.h` matches. One thing to
know when working with these targets: the V1 HSE was reverted to HSI upstream (it broke ESC
reading; not a confirmed hardware fault). To refresh to a newer release, diff each
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
- All boards are manufacturer `BEFH`, MSP API 1.46. Firmware is **Betaflight 4.5.0** except
  `BETAFPVG473_V2`, which is on **4.5.3**. The `# version` line in each file records the exact
  firmware build; preserve it when editing.
- When diffing or comparing boards, expect per-board hardware fields to differ legitimately:
  `mcu_id`, `acc_calibration`, OSD element positions, and (G473) the `vtxtable`.
