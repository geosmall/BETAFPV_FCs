# BETAFPVF405 — IMU Orientation (`GYRO_1_ALIGN CW270_DEG` + `align_board_roll = 180`)

Establishes what the IMU's sensor axes physically point at on the **Pavo Pico II** F405 board.

Unlike `BETAFPVG473_IMU_ORIENTATION.md`, this board needs **both** Betaflight alignment layers to
answer the question: the target sets a sensor→board rotation, *and* the shipped CLI config sets a
non-zero board→vehicle rotation. The bare-board answer and the as-installed answer are different,
and the difference includes a **sign flip on Z**.

## Conclusion

**Layer 1 only — bare board, flat, silkscreen arrow forward** (what `config.h` alone describes):

| Sensor axis | Direction |
| --- | --- |
| +X | **Left** |
| +Y | **Rearward** (aft) |
| +Z | **Up** |

**Layers 1 + 2 — as installed in the Pavo Pico II** (what the aircraft actually flies with):

| Sensor axis | Direction |
| --- | --- |
| +X | **Right** |
| +Y | **Rearward** (aft) |
| +Z | **Down** |

The `align_board_roll = 180` means the FC is mounted **inverted** in this airframe — the chip's
+Z, which exits the board's top face, points at the ground. That the config implies inversion is
certain; the mechanical arrangement producing it has not been verified here.

Betaflight's board/vehicle frame is **FLU** (+X forward, +Y **left**, +Z up) — see
`/home/geo/Arduino/doc/BF_BODY_FRAME.md`.

## Targets covered

`GYRO_1_ALIGN CW270_DEG` is declared identically by both F405 targets:

- `configs/BETAFPVF405/config.h:122`
- `configs/BETAFPVF405_ELRS/config.h:115` (same board, CRSF baked in on USART3)

This is a **different rotation from the G473 boards** (`CW180_DEG`). Nothing in
`BETAFPVG473_IMU_ORIENTATION.md` transfers here.

## Physical part

BetaFPV labels it directly on the OEM board photo — no inference needed for identification.
`OEM/BF4.5.3 F405_20A_Pavo_Pico_ELRS 20260104/images/top.png` carries the callout
**"ICM42688P / ICM42605"** pointing at the LGA-14 package in the upper-left of the top side, at
roughly x 534–592, y 338–386 (~3.0 wide × 2.5 tall mm; image scale ≈ 19.3 px/mm).

### The ICM42605 wrinkle

The silkscreen callout offers **ICM42605** as an alternate, but neither F405 `config.h` defines
`USE_GYRO_SPI_ICM42605` — they define `USE_GYRO_SPI_ICM42688P`, `USE_ACCGYRO_BMI270`, and
`USE_GYRO_SPI_MPU6000`. This is **not** a gap. Betaflight's `accgyro_spi_icm426xx.c` compiles if
*any* icm426xx-family macro is defined (`:31`), and its WHO_AM_I switch handles
`ICM42605_WHO_AM_I_CONST → ICM_42605_SPI` unconditionally inside that file (`:273-274`). So
`USE_GYRO_SPI_ICM42688P` alone pulls in a driver that detects and runs an ICM-42605.

Alignment is unaffected either way: one `GYRO_1_ALIGN` covers whichever die is detected, so
BetaFPV must place all the alternates axis-compatible. As with the G473, package alone cannot
tell you which chip is fitted on a given unit — read the `GYRO=` line from a CLI `status`.

The ICM-42605 axis convention is **assumed** to match the ICM-42688-P (same LGA-14 2.5 × 3 mm
body, same TDK icm426xx family). That assumption is not checked against an ICM-42605 datasheet
here.

## Derivation — Layer 1 (sensor → board)

`configs/BETAFPVF405/config.h:122`

```c
#define GYRO_1_ALIGN CW270_DEG
```

`src/main/sensors/boardalignment.c:115-119`:

```c
case CW270_DEG:
    dest->x = -tmp.y;   dest->y = tmp.x;   dest->z = tmp.z;
```

Board = `(−s_y, s_x, s_z)`. So sensor +X → board +Y (**left**), sensor +Y → board −X (**aft**),
sensor +Z → board +Z (**up**).

## Derivation — Layer 2 (board → vehicle)

`align_board_roll = 180` appears in **both** the factory and the owner's dumps — it is a property
of the product, not a local tweak:

- `OEM/BF4.5.3 F405_20A_Pavo_Pico_ELRS 20260104/....txt:59` (BetaFPV factory `diff all`)
- `BETAFPVF405/BTFL_PAVO_PICO II_20260605_043622_BETAFPVF405.diff:60` (owner's backup)

It appears in **no `config.h`** — exactly the case `BF_IMU_ALIGNMENT.md` warns about, where
reading only the target reconstructs the wrong orientation.

A 180° roll maps `(x, y, z) → (x, −y, −z)`. Composing with layer 1:

```
vehicle = ( −s_y , −s_x , −s_z )
```

sensor +X → vehicle −Y (**right**), sensor +Y → vehicle −X (**aft**), sensor +Z → vehicle −Z
(**down**). Determinant +1, so it is a proper rotation, as it must be.

## Photo cross-check — partial, weaker than the G473

**What the photo does establish.** The pads resolve as 4 on the left edge, 4 on the right, 3 top,
3 bottom, and the package measures ~3.0 wide × 2.5 tall mm. Per §10.2, the datasheet TOP VIEW has
**E = 3 mm horizontal** (3 pads/edge) and **D = 2.5 mm vertical** (4 pads/edge) — so the 4-pad
edges are the *short* ones. Aspect and pad count therefore agree: this chip sits in the
**datasheet pose family, 0° or 180°**, not ±90°.

That is a genuine constraint. Per the marking-rotation table in
`BETAFPVG473_IMU_ORIENTATION.md`, the 0/180 family corresponds to `CW90_DEG` or `CW270_DEG`, and
**rules out `CW0_DEG` and `CW180_DEG`**. The declared `CW270_DEG` is in the surviving set.

**What the photo does not establish.** The remaining 0-vs-180 ambiguity — i.e. `CW90_DEG` vs
`CW270_DEG` — is exactly a 180° yaw, and pad geometry is symmetric under it. Resolving it needs
the marking or the pin-1 dot, and **the laser marking on this chip is not readable** in the OEM
photo; the die face is uniformly dark at this resolution and heavy enhancement produces only
noise. The G473 board had a legible-enough marking rotation to close this gap. **This board does
not.**

## Confidence

**Verified:** the part identification (BetaFPV's own callout), the pad geometry and aspect
agreeing on the 0/180 pose family, both `config.h` alignment declarations, `align_board_roll = 180`
in two independent dumps, the two `boardalignment.c` transforms, and the icm426xx driver behaviour.

**Not verified:** the 180° discrimination between `CW90_DEG` and `CW270_DEG` from imagery. The
conclusion rests on `config.h` for that step.

**Indirect but strong:** the aircraft flies correctly on OEM firmware. A 180° yaw error would
invert roll and pitch response and be immediately obvious on takeoff. That independently rules out
the one failure mode the photo could not exclude.

**Falsifiable prediction:** under `CW270_DEG` the pin-1 dot sits at (−X_s, +Y_s) = image right and
image down = the package's **rear-right** corner viewed from the top of the FC with the arrow
pointing away. If magnification puts it at front-left, the alignment is `CW90_DEG` instead.

**To measure directly:** `./ci/imu_align_check.py` (props off) per
`/home/geo/Arduino/doc/IMU_ALIGNMENT_BENCH_PROCEDURE.md`.

## Practical note

If you ever run this FC **outside** the Pavo Pico II airframe — on a bench, or in a different
frame mounted right-way-up — `align_board_roll` must go back to **0**. Restoring one of the
archived `.diff` files replays `set align_board_roll = 180` along with everything else, which is
correct for the Pavo Pico II and wrong for a flat bench mount. The inverted-Z result above is a
property of the *installation*, not of the board.

## See also

- `BETAFPVG473_IMU_ORIENTATION.md` — same treatment for the AIR75 / G473 (`CW180_DEG`), including
  the marking-rotation → `GYRO_1_ALIGN` table this document refers to
- `/home/geo/Arduino/doc/BF_IMU_ALIGNMENT.md` — the two alignment layers; cites this board as the
  example of a product needing a user-set `align_board_*` that appears in no `config.h`
- `/home/geo/Arduino/doc/BF_BODY_FRAME.md` — the FLU body-frame convention
