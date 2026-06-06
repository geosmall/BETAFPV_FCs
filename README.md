# BETAFPV Flight Controllers

Archive of **factory (OEM) Betaflight configurations** for BETAFPV flight controllers.
These are the as-shipped settings captured from each board so they can be restored or
compared after tuning, flashing, or a full chip erase.

Boards run **Betaflight 4.5.x** (manufacturer `BEFH`, MSP API 1.46); see the table below for
the exact firmware per board.

## Boards

| Directory         | MCU       | Board name        | Craft        | Firmware |
| ----------------- | --------- | ----------------- | ------------ | -------- |
| `BETAFPVF405/`    | STM32F405 | `BETAFPVF405`     | Pavo Pico II | 4.5.0    |
| `BETAFPVG473/`    | STM32G473 | `BETAFPVG473`     | AIR75        | 4.5.0    |
| `BETAFPVG473_V2/` | STM32G473 | `BETAFPVG473_V2`  | Bare board   | 4.5.3    |

`BETAFPVG473_V2` is a newer hardware revision running Betaflight 4.5.3; its backup is at
factory defaults (no craft name or tuned PID profiles).

## CLI config backups

Each board directory holds two CLI text exports:

- **`BTFL_<craft>_<timestamp>_<board>.diff`** — output of `diff all`: only the settings
  that differ from firmware defaults, wrapped in `batch start` … `save`. This is the
  authoritative, replayable config.
- **`BTFL_cli_<craft>_<timestamp>_<board>.txt`** — the full Configurator CLI backup: a
  live `status` readout followed by the same `diff all`.

Filenames carry a `YYYYMMDD_HHMMSS` timestamp; the newest reflects the most recent capture.

### OEM firmware

A board may also include an `OEM Firmware and Diff/` folder holding the **as-shipped factory
firmware** — the compiled Betaflight `.hex` BetaFPV flashes at the factory, plus its matching
`diff all`. This is the known-good reference build (e.g. for re-flashing or comparing against
later Betaflight versions). The `.hex` is the actual firmware binary; the paired `.diff` is the
factory config that came with it (and may duplicate a CLI backup above). `BETAFPVG473/` has the
AIR75 4.5.0 OEM build.

> **Note:** each `.diff` begins with `defaults nosave`, which resets every setting back to
> firmware defaults in RAM only — nothing is committed and the board does not reboot. This
> gives the restore a clean baseline before the captured settings are applied on top; the
> trailing `save` then commits everything to flash at once. Because it is `nosave`, the
> reset is harmless on its own — powering off before `save` leaves the board unchanged.

## Bench safety: the VTX is powered over USB

On these BetaFPV G4 AIO boards the onboard 5.8 GHz VTX is powered over **USB**, not just from a
battery — so it transmits whenever the board is connected, even with no battery. **Attach the
VTX antenna (or set VTX power to 0 / pit) before you plug in USB**, or you can burn out the VTX
chip (transmitting into no antenna reflects RF back into the amplifier). A `status` line showing
`0S battery` does **not** mean the VTX is off — that only means no battery; USB still powers it.

## Generate and save your backup

Connect the FC, open the Betaflight Configurator, and go to the **CLI** tab.

1. Type `diff all` into the command box and press **Enter**.
2. Wait for the text scroll to stop completely.
3. Click the **Save to File** button in the bottom-right corner of the window.
4. Name the file clearly and save it to your computer.

## Restore or apply settings

1. Connect your drone to Betaflight and enter the **CLI** tab.
2. Click **Load from file** (bottom of the CLI tab) and select the `.diff` to apply.
3. Press **Enter** to run the loaded commands, and wait a few seconds for them to execute.
4. Type `save` and press **Enter** to finalize the changes and reboot.

> **Note:** the `.diff` files in this repo already end with a `save` command, so they
> normally finalize and reboot on their own. Step 4 is a catch-all — run it if the board
> didn't save for you (e.g. a diff saved without the trailing `save`).
>
> No **Load from file** button? Open the `.diff` in a text editor, copy all of it, paste into
> the CLI input box, then continue from step 3.

> **Warning:** these configs target specific hardware. Restoring a `.diff` to the wrong
> board, MCU, or firmware version can produce an unflyable or unsafe craft. Match the
> board name and Betaflight version before applying.

## Optional: enable HSE (external clock) on BETAFPVG473

The `BETAFPVG473` target ships with the internal oscillator (`SYSTEM_HSE_MHZ 0`, HSI). If your
specific board has a working 8 MHz crystal, you can switch it to the more accurate external
clock from the CLI:

```
set system_hse_mhz = 8
save
```

After it reboots, run `status` and check the clock source:

- `Clock=168MHz (PLLR-HSE)` → the crystal works; HSE is now active.
- `Clock=168MHz (PLLR-HSI)` → no usable crystal; it fell back. Revert with `set system_hse_mhz = 0` → `save`.

Notes:
- **Verify the crystal first** — not every board on this shared target has one; the command
  above is also the test (HSE vs HSI in `status`).
- It's a saved setting, so a full erase / reflash-to-defaults reverts it to HSI — re-apply or
  restore from a `.diff`.
- For working ESC reading too, run Betaflight **4.5.0/4.5.1 or ≥ 2025.12.1** (avoid 4.5.2–4.5.4).
- Full background and rationale: `configs/BETAFPVG473_GIT_TRACE.md`.

## Firmware build targets (`configs/`)

`configs/<BOARD_NAME>/config.h` holds the Betaflight **unified target definition** for each
board — the GPL-licensed source that describes the hardware (MCU, IMU, baro, OSD, default
serial RX) so firmware can be built or a custom build configured for it. These are *not* CLI
settings; they define the board, whereas the `.diff`/`.txt` files above tune it.

Each target uses the ICM42688P as its primary gyro/acc plus one or more alternate IMUs:

| Target               | MCU       | IMUs (primary + alt)                       | Notes                             |
| -------------------- | --------- | ------------------------------------------ | --------------------------------- |
| `BETAFPVF405`        | STM32F405 | ICM42688P + BMI270                         | analog OSD (MAX7456)              |
| `BETAFPVF405_ELRS`   | STM32F405 | ICM42688P + BMI270                         | CRSF serial RX baked in on USART3 |
| `BETAFPVG473`        | STM32G473 | ICM42688P + BMI270                         | CRSF on USART3                    |
| `BETAFPVG473_V2`     | STM32G473 | ICM42688P + BMI270 + ICM42622P + LSM6DSK320X | newer revision; no barometer    |
| `BETAFPVG473_V3`     | STM32G473 | ICM42688P + BMI270 + ICM42622P + LSM6DSK320X | CRSF on USART1 **and** USART3   |

Not every target has a matching CLI backup, and vice versa. The `config.h` files are tracked
to the **Betaflight 2025.12.4** released set (`betaflight/config` commit `1359bbecb`).

`configs/BETAFPVG473_V1_vs_V2_vs_V3.md` documents the hardware differences across the
`BETAFPVG473`, `_V2`, and `_V3` targets (clock source, IMU, barometer, gyro clock input, HD OSD,
motor/LED/gyro/ADC pin map).
`configs/BETAFPVG473_GIT_TRACE.md` traces the upstream `betaflight/config` history behind the
G473 gyro and HSE changes, and records the exact commit each archived `config.h` matches.

## Scratch log

`betafpv_75mm.txt` at the repo root is a raw, unstructured CLI session log — six `version` +
`status` captures taken on the bench across `BETAFPVG473`, `BETAFPVG473_V2`, and `BETAFPVF405`
boards. It records firmware versions and live sensor/clock readouts only; it contains **no
settings** and is not a restorable backup.
