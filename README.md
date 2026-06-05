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

> **Note:** each `.diff` begins with `defaults nosave`, which resets every setting back to
> firmware defaults in RAM only — nothing is committed and the board does not reboot. This
> gives the restore a clean baseline before the captured settings are applied on top; the
> trailing `save` then commits everything to flash at once. Because it is `nosave`, the
> reset is harmless on its own — powering off before `save` leaves the board unchanged.

## Generate and save your backup

Connect the FC, open the Betaflight Configurator, and go to the **CLI** tab.

1. Type `diff all` into the command box and press **Enter**.
2. Wait for the text scroll to stop completely.
3. Click the **Save to File** button in the bottom-right corner of the window.
4. Name the file clearly and save it to your computer.

## Restore or apply settings

1. Open the diff text file you saved on your computer.
2. Select all text (**Ctrl+A** / **Cmd+A**) and copy it (**Ctrl+C** / **Cmd+C**).
3. Connect your drone to Betaflight and enter the **CLI** tab.
4. Click the input box at the bottom and paste the text (**Ctrl+V** / **Cmd+V**).
5. Press **Enter** and wait a few seconds for the commands to execute.
6. Type `save` in the input box and press **Enter** to finalize the changes and reboot.

> **Note:** the `.diff` files in this repo already end with a `save` command, so they
> normally finalize and reboot on their own. Step 6 is a catch-all — run it if the board
> didn't save for you (e.g. a diff saved without the trailing `save`).

> **Warning:** these configs target specific hardware. Restoring a `.diff` to the wrong
> board, MCU, or firmware version can produce an unflyable or unsafe craft. Match the
> board name and Betaflight version before applying.

## Firmware build targets (`configs/`)

`configs/<BOARD_NAME>/config.h` holds the Betaflight **unified target definition** for each
board — the GPL-licensed source that describes the hardware (MCU, IMU, baro, OSD, default
serial RX) so firmware can be built or a custom build configured for it. These are *not* CLI
settings; they define the board, whereas the `.diff`/`.txt` files above tune it.

Each target supports the ICM42688P as its primary gyro/acc plus one alternate IMU:

| Target               | MCU       | IMUs (primary + alt)    | Notes                             |
| -------------------- | --------- | ----------------------- | --------------------------------- |
| `BETAFPVF405`        | STM32F405 | ICM42688P + BMI270      | analog OSD (MAX7456)              |
| `BETAFPVF405_ELRS`   | STM32F405 | ICM42688P + BMI270      | CRSF serial RX baked in on USART3 |
| `BETAFPVG473`        | STM32G473 | ICM42688P + BMI270      | CRSF on USART3                    |
| `BETAFPVG473_V2`     | STM32G473 | ICM42688P + LSM6DSK320X | newer revision; no barometer      |
| `BETAFPVG473_V3`     | STM32G473 | ICM42688P + LSM6DSK320X | CRSF on USART1 **and** USART3     |

Not every target has a matching CLI backup, and vice versa.

`configs/BETAFPVG473_V1_vs_V2.md` documents the hardware differences between the `BETAFPVG473`
and `BETAFPVG473_V2` targets (clock source, IMU, barometer, motor/LED/gyro pin map).

## Scratch log

`betafpv_75mm.txt` at the repo root is a raw, unstructured CLI session log — six `version` +
`status` captures taken on the bench across `BETAFPVG473`, `BETAFPVG473_V2`, and `BETAFPVF405`
boards. It records firmware versions and live sensor/clock readouts only; it contains **no
settings** and is not a restorable backup.
