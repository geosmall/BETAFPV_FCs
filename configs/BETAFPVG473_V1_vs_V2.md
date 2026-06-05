# BETAFPVG473 V1 vs V2 — Betaflight Unified Target (`config.h`) Differences

Compares:

- `configs/BETAFPVG473/config.h` (`BOARD_NAME BETAFPVG473`)
- `configs/BETAFPVG473_V2/config.h` (`BOARD_NAME BETAFPVG473_V2`)

## Summary

V2 is a board respin, not just a config tweak: it runs a working 8 MHz external clock
(HSE; V1 was reverted to internal HSI — see §1), swaps the secondary IMU
(BMI270 → LSM6DSK320X), drops the barometer, and reworks the motor/LED/gyro/flash pin map
(notably moving all four motors onto TIM1). **The targets are NOT interchangeable** — flashing
the wrong one will mis-map motors, LEDs, the gyro, and the system clock.

| Area | V1 | V2 |
| --- | --- | --- |
| Clock source | internal HSI (`SYSTEM_HSE_MHZ 0`) | 8 MHz crystal (`SYSTEM_HSE_MHZ 8`) |
| Secondary IMU | BMI270 | LSM6DSK320X |
| Barometer | BMP280 / DPS310 | none |
| Motor timers | spread across TIM1/2/3 | all four on TIM1 |
| MOTOR3 / MOTOR4 | PB6 / PC13 | PC6 / PA4 |
| LED0 / LED1 | PC15 / PC14 | PB6 / PC4 |
| Gyro EXTI / CS | PC4 / PA4 | PC15 / PC14 |
| Flash CS | PB9 | PC13 |
| SPI DMA options | explicit | default (auto) |

## Common to both

Both are STM32G47X (G474), manufacturer BEFH, MAX7456 analog OSD, M25P16 SPI flash, primary
gyro ICM42688P on SPI1, `GYRO_1_ALIGN CW180_DEG`. The differences below are real
hardware/wiring changes between the two board revisions, not just firmware tuning.
Formatting-only changes (tabs vs spaces, indentation in the `TIMER_PIN_MAP` block) are
omitted.

## Details

### 1. Clock source — HSI on V1, working HSE on V2 (most significant)

```
V1:  #define SYSTEM_HSE_MHZ 0     (internal HSI oscillator)
V2:  #define SYSTEM_HSE_MHZ 8     (8 MHz external crystal)
```

Corroborated by the CLI `status` output:

- V1 reports `Clock=168MHz (PLLR-HSI)`
- V2 reports `Clock=168MHz (PLLR-HSE)`

This is **not** simply "V2 added a crystal V1 lacks." V1 has a crystal too, but its HSE proved
unreliable: upstream briefly set V1 to `HSE=8` and reverted it to `0` because HSE broke
ESC/DSHOT reading (no confirmed hardware fault — disabled as the safe default on an EOL
board). V2's HSE was added and tested working, and was never reverted, so V2 runs the more
accurate external clock. Full history in `BETAFPVG473_GIT_TRACE.md`.

### 2. Secondary IMU support changed

```
V1:  USE_ACCGYRO_BMI270
V2:  USE_ACCGYRO_LSM6DSK320X
```

Both retain `USE_ACC_SPI_ICM42688P` / `USE_GYRO_SPI_ICM42688P` as the primary. The alternate
IMU the firmware can drive changed from BMI270 to LSM6DSK320X — reflecting a different
second-source gyro/acc fitted on the V2 PCB.

### 3. Barometer dropped on V2

V1 compiles in baro support:

```
USE_BARO
USE_BARO_BMP280
USE_BARO_DPS310
```

V2 removes all three (no `USE_BARO`).

> **Note:** V2 still leaves a stray `BARO_I2C_INSTANCE I2CDEV_1` define, but with no
> `USE_BARO` the baro driver is not built. V2 hardware has no barometer.

### 4. Motor outputs re-pinned and re-timed

| | V1 | V2 |
| --- | --- | --- |
| MOTOR1 | PB0 | PB0 *(unchanged)* |
| MOTOR2 | PB1 | PB1 *(unchanged)* |
| MOTOR3 | PB6 | PC6 |
| MOTOR4 | PC13 | PA4 |

Timer assignment (`TIMER_PIN_MAP`: pin, timer, channel):

- V1 spreads motors across timers — `PB2 (LED) TIM1, PB0 TIM1, PB1 TIM1, PB6 TIM3, PC13 TIM2`
- V2 puts everything on TIM1 — `PB2 (LED) TIM1, PB0 TIM1, PB1 TIM1, PC6 TIM1, PA4 TIM1`

V2 consolidates all four motors plus the LED strip onto TIM1.

### 5. Status LED pins moved

```
LED0:  PC15 -> PB6
LED1:  PC14 -> PC4
```

### 6. Gyro control pins moved

```
GYRO_1_EXTI_PIN:  PC4  -> PC15
GYRO_1_CS_PIN:    PA4  -> PC14
```

SPI instance unchanged: `GYRO_1_SPI_INSTANCE SPI1`.

Pin reuse worth noting: PA4 was the gyro CS on V1 and becomes MOTOR4 on V2; PC4 was the gyro
EXTI on V1 and becomes LED1 on V2. The whole PA4/PC4/PC14/PC15 group was reshuffled between
gyro, motor, and LED functions.

### 7. Flash chip-select moved

```
FLASH_CS_PIN:  PB9 -> PC13
```

(PC13 was MOTOR4 on V1.)

### 8. Explicit SPI DMA options removed on V2

V1 pins down SPI DMA streams:

```
SPI1_TX_DMA_OPT 14   SPI1_RX_DMA_OPT 13
SPI2_TX_DMA_OPT 10   SPI2_RX_DMA_OPT 11
SPI3_TX_DMA_OPT 9    SPI3_RX_DMA_OPT 8
```

V2 omits all of these (relies on Betaflight's default DMA allocation). `ADC1_DMA_OPT 6` is
present on both.

### 9. Cosmetic / no functional effect

V1 carries a leftover note that V2 dropped:

```
//TODO #define DSHOT_IDLE_VALUE 450
```

## Unchanged between V1 and V2 (selected)

UART1–4 TX/RX pins, I2C1 SCL/SDA, all SPI SCK/SDI/SDO pins, `ADC_VBAT_PIN PA0` /
`ADC_CURR_PIN PA1`, `MAX7456_SPI_CS_PIN PB12`, `VTX_SMARTAUDIO_UART USART2`,
`SERIALRX_UART USART3`, `SERIALRX_PROVIDER CRSF`, `DEFAULT_CURRENT_METER_SCALE 750`,
DSHOT burst off / bitbang on, blackbox to flash, `BEEPER_INVERTED`.
