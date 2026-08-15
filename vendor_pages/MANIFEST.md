# Capture manifest

Captured 2026-08-14 from <https://betafpv.com> via the Shopify product JSON endpoint.
Images fetched at width=1600. Regenerate with `node vendor_pages/capture.mjs`.

| Handle | Title | Images | KB | Omitted |
|---|---|---|---|---|
| [`air-brushless-flight-controller`](air-brushless-flight-controller/SPECS.md) | Air 1S Brushless Flight Controller | 23 | 3830 | — |
| [`f4-2-3s-20a-aio-fc-v1`](f4-2-3s-20a-aio-fc-v1/SPECS.md) | F4 2-3S 20A AIO FC V1 | 14 | 2986 | — |
| [`matrix-1s-5in1-ii-brushless-flight-controller`](matrix-1s-5in1-ii-brushless-flight-controller/SPECS.md) | Matrix 1S Brushless Flight Controller (5IN1 II) | 17 | 2753 | — |
| [`matrix-1s-brushless-flight-controller-hd`](matrix-1s-brushless-flight-controller-hd/SPECS.md) | Matrix 1S Brushless Flight Controller (3IN1/4IN1) | 21 | 3619 | — |
| [`matrix-1s-brushless-flight-controller`](matrix-1s-brushless-flight-controller/SPECS.md) | Matrix 1S Brushless Flight Controller (5IN1) | 12 | 2310 | 1 |
| [`matrix-1s-brushless-flight-controller-aio-p1-hd-vtx`](matrix-1s-brushless-flight-controller-aio-p1-hd-vtx/SPECS.md) | [BETA TEST] Matrix 1S Brushless Flight Controller (AIO P1 HD VTX) | 13 | 1549 | — |
| [`air75-brushless-whoop-quadcopter`](air75-brushless-whoop-quadcopter/SPECS.md) | Air75 Brushless Whoop Quadcopter | 13 | 2475 | — |
| [`meteor75-pro-p1-brushless-whoop-quadcopter`](meteor75-pro-p1-brushless-whoop-quadcopter/SPECS.md) | Meteor75 Pro P1 Brushless Whoop Quadcopter | 14 | 2205 | 1 |
| [`pavo-pico-ii-brushless-whoop-quadcopter`](pavo-pico-ii-brushless-whoop-quadcopter/SPECS.md) | Pavo Pico II Brushless Whoop Quadcopter | 21 | 3263 | — |

## What each page documents

- **Air 1S Brushless Flight Controller** — STM32G473CEU6 1S FC — the bare board archived in BETAFPVG473/ (board_name BETAFPVG473)
- **F4 2-3S 20A AIO FC V1** — STM32F405RGT6 20A AIO — the FC archived in BETAFPVF405/ (board_name BETAFPVF405)
- **Matrix 1S Brushless Flight Controller (5IN1 II)** — STM32G473CEU6 5IN1 II — candidate for the BETAFPVG473_V2/V3 revisions (lists the ICM42688P/ICM42622/BMI270 alt-IMU set). UNCONFIRMED against board_name
- **Matrix 1S Brushless Flight Controller (3IN1/4IN1)** — STM32G473CEU6 3IN1/4IN1 — G473 family context; likely the Meteor75 Pro P1 FC lineage. UNCONFIRMED
- **Matrix 1S Brushless Flight Controller (5IN1)** — STM32G473CEU6 5IN1 — G473 family context. UNCONFIRMED
- **[BETA TEST] Matrix 1S Brushless Flight Controller (AIO P1 HD VTX)** — STM32G473 AIO P1 HD VTX (BETA TEST listing) — G473 family context. UNCONFIRMED
- **Air75 Brushless Whoop Quadcopter** — AIR75 75mm drone — the aircraft in AIR75_G473/. Confirmed by 0802SE 23000KV motors matching OEM package A75_0802SE_23000kv_...
- **Meteor75 Pro P1 Brushless Whoop Quadcopter** — Meteor75 Pro P1 — the aircraft for OEM package BF4.5.3 G473 3in1_12A_M75 Pro P1_ELRS_BMI270
- **Pavo Pico II Brushless Whoop Quadcopter** — Pavo Pico II — the aircraft for both fleet units (BETAFPVF405/ and Pavo_Pico_II_BF2026_Upgrade/). Confirmed STM32F405 in description
