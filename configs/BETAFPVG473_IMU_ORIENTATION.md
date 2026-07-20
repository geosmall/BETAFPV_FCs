# BETAFPVG473 — IMU Orientation (`GYRO_1_ALIGN CW180_DEG`)

Establishes what the IMU's sensor axes physically point at on the **AIR75 (V1 `BETAFPVG473`)
board**, and confirms that the shipped `GYRO_1_ALIGN CW180_DEG` correctly describes how the chip
is soldered.

Two independent derivations are recorded: one from the firmware target, one from the OEM board
photographs plus the TDK datasheet. They agree.

## Conclusion

With the board flat and the silkscreen arrow pointing forward:

| Sensor axis | Physical direction |
| --- | --- |
| +X | **Rearward** (aft) |
| +Y | **Right** (starboard) |
| +Z | **Up** |

The chip is mounted **rotated 180° about Z** relative to the board frame, right-way-up (no flip).
A user mounting this FC flat with the arrow forward needs **zero** alignment configuration —
`CW180_DEG` is compiled in and `align_board_*` stays at 0.

Betaflight's board/vehicle frame is **FLU** (+X forward, +Y **left**, +Z up) — see
`/home/geo/Arduino/doc/BF_BODY_FRAME.md`. The `+Y = left` half of that is what makes the sign
bookkeeping below non-obvious.

## Physical part

The IMU is the **LGA-14, 2.5 × 3.0 mm** package on the **top (component/VTX) side**, immediately
left of the Winbond 25Q128 flash and just above the `+5V` pad. In
`OEM/A75_0802SE_23000kv_GF 40mm_450mAh_4.5.0 0520/Images/front.png` it occupies roughly
x 515–572, y 843–906.

Scale reference for that image: the STM32G473**CEU6** on the reverse is UFQFPN48, exactly
7 × 7 mm, and measures ~130 px → **18.6 px/mm**. The IMU measures ~2.4 × 2.9 mm against that.

The laser marking is **not legible** at the resolution of the OEM photos. The part is therefore
identified by package alone, which cannot separate **ICM-42688-P** from **BMI270** — both are
LGA-14 2.5 × 3 mm, and `config.h` lists both (`USE_ACCGYRO_BMI270`, `USE_GYRO_SPI_ICM42688P`)
because BetaFPV fits either depending on supply. To determine which die is actually on a given
unit, read the `GYRO=` line from a CLI `status`. This does not affect alignment: a single
`GYRO_1_ALIGN` covers whichever chip is detected, so BetaFPV must place both footprints
axis-compatible.

## Derivation A — from the firmware target

`configs/BETAFPVG473/config.h:109`

```c
#define GYRO_1_ALIGN CW180_DEG
```

Betaflight applies this sensor→board rotation to every sample
(`src/main/sensors/boardalignment.c:110-113`):

```c
case CW180_DEG:
    dest->x = -tmp.x;   dest->y = -tmp.y;   dest->z = tmp.z;
```

So sensor→board is `(x, y, z) → (−x, −y, z)`. Inverting against the FLU board frame: sensor +X
lies along board −X (aft), sensor +Y along board −Y (right), sensor +Z along board +Z (up).
No `_FLIP`, so Z is unnegated and the chip is right-way-up.

## Derivation B — from the board photo and the datasheet

Datasheet: `/home/geo/Arduino/libraries/ICM42688P/doc/ds-000347_icm-42688-p-datasheet.pdf`
(DS-000347 rev 1.8).

**§4.1 Fig. 5 + §10.1 Fig. 16** — top view with the pin-1 dot at upper-left, pads 1–4 left,
5–7 bottom, 8–11 right, 12–14 top. In that pose: **+X = right, +Y = up, +Z = out of the marked
face.**

**§11 Fig. 18** — the part-number marking is drawn in that *same* pose (dot upper-left), text
stacked `I428P` / `XXXXXX` / `YYWW` reading left→right, top→bottom. That yields a marking→axis
rule readable straight off a photograph:

| Marking feature | Sensor axis |
| --- | --- |
| Text reading direction (left→right) | **+X** |
| Text block "up" (`YYWW` → `I428P`) | **+Y** |
| Pin-1 dot corner | **(−X, +Y)** |
| Out of the marked face | **+Z** |

**Observed on the board:**

1. **Pad pattern.** Rotating the chip crop 90° CCW resolves the pads as 4 / 3 / 4 / 3 matching
   Fig. 5. So in the as-photographed board view the **4-pad edges are top and bottom**, meaning
   the chip sits **±90°** from the datasheet pose. Pad geometry alone is symmetric under 180°
   and cannot distinguish CW from CCW.
2. **Marking rotation.** The markings read rotated **90° CW** relative to the board's front-up
   orientation. This picks CW from the ±90° pair.

Combining, with image-up = board +X (fwd) and image-right = board −Y (right):

```
+X_sensor = image down  = board aft   = −X_board
+Y_sensor = image right = board right = −Y_board
+Z_sensor = out of face = up          = +Z_board
```

`(x, y, z) → (−x, −y, z)` — identical to Derivation A.

## The 90° trap

The marking appears rotated **90°** but the alignment constant is **180°**. They differ because
the chip's text runs along **+X_sensor**, whereas the board's natural left-to-right reading
direction is **−Y_board**. Reading "markings look 90° CW" off a photo and writing
`GYRO_1_ALIGN CW90_DEG` is wrong by exactly that 90°.

Full mapping for a top-side chip photographed with the board's front pointing up:

| Marking appears rotated | Correct `GYRO_1_ALIGN` |
| --- | --- |
| 90° CCW | `CW0_DEG` |
| upright / horizontal | `CW90_DEG` |
| **90° CW** | **`CW180_DEG`** ← this board |
| 180° | `CW270_DEG` |

## Confidence

**Verified:** the 4/3 pad geometry, the package size against the STM32 scale reference, the
datasheet axis and marking conventions, the `boardalignment.c` transform, and the fact that OEM
Betaflight 4.5.0 flies this board correctly — a 180° error in X and Y would be immediately and
violently obvious on takeoff, which independently rules out the one failure mode that would
matter.

**Asserted, not measured here:** the CW-vs-CCW direction of the marking rotation. The laser text
could not be read at the OEM photo's resolution; the CW call is an operator observation. It is
load-bearing — had the marking been 90° **CCW**, the same derivation gives `CW0_DEG`, a 180°
disagreement with `config.h`.

**Falsifiable prediction:** the pin-1 dot sits at (−X_s, +Y_s) = the package's **front-right**
corner viewed from the top of the FC. If magnification shows it elsewhere, Derivation B is wrong
and needs redoing.

**To measure directly rather than infer:** `./ci/imu_align_check.py` (props off) per
`/home/geo/Arduino/doc/IMU_ALIGNMENT_BENCH_PROCEDURE.md`. Nose-down should read accel −X in the
raw sensor frame, given the 180° mount.

## Scope — which boards this covers

`GYRO_1_ALIGN CW180_DEG` is declared identically on **V1, V2 and V3**, but only the **V1 / AIR75**
placement was checked against photographs here. V2 and V3 are different PCB layouts (gyro
CS/EXTI move from PA4/PC4 to PC14/PC15 — see `BETAFPVG473_V1_vs_V2_vs_V3.md`), so their chip
placement is **assumed, not verified**. The F405 targets are a different rotation entirely
(`CW270_DEG`) and nothing here transfers to them.

## See also

- `BETAFPVG473_V1_vs_V2_vs_V3.md` — full V1/V2/V3 target differences
- `BETAFPVG473_GIT_TRACE.md` — upstream history of the G473 gyro/HSE changes
- `/home/geo/Arduino/doc/BF_IMU_ALIGNMENT.md` — the two alignment layers, and why layer 1 belongs
  in `config.h`
- `/home/geo/Arduino/doc/BF_BODY_FRAME.md` — the FLU body-frame convention (pinned to a
  Betaflight commit)
