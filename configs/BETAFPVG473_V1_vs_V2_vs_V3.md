# BETAFPVG473 V1 vs V2 vs V3 — Betaflight Unified Target (`config.h`) Differences

Compares the three `BETAFPVG473` board revisions, all at the Betaflight 2025.12.4 set:

- `configs/BETAFPVG473/config.h` (`BOARD_NAME BETAFPVG473`) — "V1"
- `configs/BETAFPVG473_V2/config.h` (`BOARD_NAME BETAFPVG473_V2`)
- `configs/BETAFPVG473_V3/config.h` (`BOARD_NAME BETAFPVG473_V3`)

## Summary

These are three distinct hardware revisions, not config tweaks. V2 is a respin of V1 (working
external clock, dropped barometer, reworked motor/LED/gyro/flash pin map). V3 is the largest
change: on top of V2 it re-adds the barometer, adds a **gyro clock input**, **HD-OSD support**,
a **VTX-power PINIO**, and **conditional dual serial-RX** (CRSF or SBUS on different UARTs).
**The three targets are NOT interchangeable** — flashing the wrong one mis-maps motors, LEDs,
the gyro, ADC inputs, and the system clock.

## At a glance

| Area | V1 | V2 | V3 |
| --- | --- | --- | --- |
| Clock source | HSI (`SYSTEM_HSE_MHZ 0`) | 8 MHz HSE | 8 MHz HSE |
| IMU alternates (+ICM42688P primary) | BMI270 | BMI270, ICM42622P, LSM6DSK320X | BMI270, ICM42622P, LSM6DSK320X |
| Barometer (BMP280/DPS310) | yes | none | yes (re-added) |
| Gyro clock input | no | no | **yes** (`USE_GYRO_CLKIN`, PA1) |
| Serial RX | USART3 / CRSF | USART3 / CRSF | USART3 / CRSF, or USART1 if SBUS |
| HD OSD (MSP DisplayPort) | no | no | **yes** (UART4 when `USE_OSD_HD`) |
| VTX-power PINIO | no | no | **yes** (PA13, "VTX PWR") |
| MOTOR1 / 2 / 3 / 4 | PB0 / PB1 / PB6 / PC13 | PB0 / PB1 / PC6 / PA4 | PB0 / PB1 / PB6 / PB9 |
| LED0 / LED1 | PC15 / PC14 | PB6 / PC4 | PC6 / PC4 |
| Gyro EXTI / CS | PC4 / PA4 | PC15 / PC14 | PC15 / PC14 |
| ADC VBAT / CURR | PA0 / PA1 | PA0 / PA1 | PA4 / PA0 |
| Flash CS | PB9 | PC13 | PC13 |
| Board-yaw default | none | none | `-45` |
| SPI DMA options | explicit | default (auto) | default (+ `ADC2_DMA_OPT`) |

## Common to all three

STM32G47X (G474), manufacturer `BEFH`, MAX7456 analog OSD, M25P16 SPI flash, ICM42688P as the
primary gyro on `GYRO_1`/SPI1 with `GYRO_1_ALIGN CW180_DEG`, SPI instances (gyro SPI1, OSD SPI2,
flash SPI3), UART1–4 TX/RX pins, I2C1 (PA15/PB7), `BEEPER_PIN PA8` + `BEEPER_INVERTED`, blackbox
to flash, DSHOT burst off / bitbang on, ADC voltage/current metering. Formatting-only changes
(tabs vs spaces, `TIMER_PIN_MAP` indentation) are omitted.

## Details

### 1. Clock source — HSI on V1, working HSE on V2/V3

```
V1:  SYSTEM_HSE_MHZ 0     (internal HSI oscillator)
V2:  SYSTEM_HSE_MHZ 8     (8 MHz external crystal)
V3:  SYSTEM_HSE_MHZ 8     (8 MHz external crystal)
```

Corroborated by CLI `status`: V1 reports `Clock=168MHz (PLLR-HSI)`, V2 reports `(PLLR-HSE)`. V1
originally carried `HSE=8` too, but it was reverted to `0`; the full history and rationale are in
`BETAFPVG473_GIT_TRACE.md`.

### 2. IMU set

All three use ICM42688P as the primary (`USE_ACC_SPI_ICM42688P` / `USE_GYRO_SPI_ICM42688P`) on a
single `GYRO_1` position, with the listed `USE_ACCGYRO_*` entries as auto-detect alternates for
second-sourced chips (not extra gyros):

```
V1:  BMI270
V2:  BMI270, ICM42622P, LSM6DSK320X
V3:  BMI270, ICM42622P, LSM6DSK320X
```

V2 and V3 share the same four-chip auto-detect list; V1 has only ICM42688P + BMI270.

### 3. Barometer — present on V1, dropped on V2, re-added on V3

```
V1:  USE_BARO + USE_BARO_BMP280 + USE_BARO_DPS310
V2:  (none)
V3:  USE_BARO + USE_BARO_BMP280 + USE_BARO_DPS310
```

V2 has no barometer (it does leave a stray `BARO_I2C_INSTANCE` define, but with no `USE_BARO` the
driver is not built). V3 restores baro support.

### 4. Gyro clock input — V3 only

V3 adds an external gyro clock:

```
USE_GYRO_CLKIN
GYRO_1_CLKIN_PIN PA1
TIMER_PIN_MAP( 5, GYRO_1_CLKIN_PIN, 1, -1 )
```

The MCU drives a reference clock into the gyro (CLKIN) so gyro sampling is synchronous with the
flight-control loop, reducing sample jitter/aliasing. V1 and V2 have no CLKIN.

### 5. Motor outputs re-pinned

| | V1 | V2 | V3 |
| --- | --- | --- | --- |
| MOTOR1 | PB0 | PB0 | PB0 |
| MOTOR2 | PB1 | PB1 | PB1 |
| MOTOR3 | PB6 | PC6 | PB6 |
| MOTOR4 | PC13 | PA4 | PB9 |

MOTOR1/2 are the same on all three; MOTOR3/4 differ on every revision (V3's MOTOR4 PB9 was the
flash CS on V1). The `TIMER_PIN_MAP` timer-selector field (3rd column — a 1-based index into the
timers available on each pin, **not** the literal timer number; the 4th column is the DMA option)
also differs per revision, so the motor timer grouping is not portable between targets.

### 6. LED / gyro / flash / ADC pins moved

```
LED0:        V1 PC15   V2 PB6    V3 PC6
LED1:        V1 PC14   V2 PC4    V3 PC4
GYRO_1_EXTI: V1 PC4    V2 PC15   V3 PC15
GYRO_1_CS:   V1 PA4    V2 PC14   V3 PC14
FLASH_CS:    V1 PB9    V2 PC13   V3 PC13
ADC_VBAT:    V1 PA0    V2 PA0    V3 PA4
ADC_CURR:    V1 PA1    V2 PA1    V3 PA0
```

V2 and V3 share the gyro EXTI/CS and flash-CS pins (PC15/PC14/PC13); V1 differs on all of them.
V3 additionally swaps the VBAT/CURR ADC pins (PA1 is repurposed as the gyro `CLKIN`). The gyro
SPI bus is `SPI1` on every revision.

### 7. Serial RX — V3 is conditional

```
V1 / V2:  SERIALRX_UART USART3 ; SERIALRX_PROVIDER CRSF
V3:       #ifdef USE_SERIALRX_SBUS  -> SERIALRX_UART USART1
          #else                     -> SERIALRX_UART USART3 ; SERIALRX_PROVIDER CRSF
```

V1/V2 are CRSF on USART3 only. V3 defaults to CRSF on USART3 but moves serial RX to USART1 for
SBUS builds — i.e. it wires RX on both USART1 and USART3 depending on the protocol.

### 8. HD OSD and VTX-power PINIO — V3 additions

V3 supports digital/HD OSD and a software-switched VTX power rail, neither present on V1/V2:

```
#ifdef USE_OSD_HD
#define MSP_DISPLAYPORT_UART SERIAL_PORT_UART4
#endif

PINIO1_PIN PA13 ; PINIO1_BOX 40 ; PINIO1_CONFIG 1 ; BOX_USER1_NAME "VTX PWR"
```

### 9. SPI DMA options

V1 pins down explicit SPI DMA streams:

```
SPI1_TX_DMA_OPT 14  SPI1_RX_DMA_OPT 13
SPI2_TX_DMA_OPT 10  SPI2_RX_DMA_OPT 11
SPI3_TX_DMA_OPT 9   SPI3_RX_DMA_OPT 8
```

V2 and V3 omit these (default DMA allocation). `ADC1_DMA_OPT 6` is on all three; V3 adds
`ADC2_DMA_OPT 7`.

### 10. Board-yaw default — V3 only

V3 bakes the board yaw offset into the target (`DEFAULT_ALIGN_BOARD_YAW -45`); V1 and V2 set no
target default (on V2 hardware the `-45` is applied as a saved CLI setting instead). Gyro chip
alignment (`GYRO_1_ALIGN CW180_DEG`) is the same on all three.
