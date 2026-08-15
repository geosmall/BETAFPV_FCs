# Vendor product pages

Archived BetaFPV product pages for the boards and aircraft in this repo, kept because
BetaFPV revises and retires listings without notice and these pages are the only public
record of several hardware details (VTX power tables, motor/prop specs, pinout diagrams,
revision history).

**This is a fourth artifact type.** It is not a CLI backup, not a firmware build target,
and not an upgrade campaign. Nothing here is restorable to a flight controller. These are
*vendor marketing claims* — where a page disagrees with a CLI dump or a `configs/*/config.h`,
**the dump or the target wins.** Specifically: product pages routinely describe a family
("4IN1/5IN1", "V1/V2") without saying which revision a given physical board is, and they are
not updated when a target changes upstream.

## Layout

```
vendor_pages/
  capture.mjs                  regenerates product.json / SPECS.md / images
  capture_mhtml.mjs            regenerates the page.mhtml snapshots
  MANIFEST.md                  index: handle, title, image count, size, omissions
  <shopify-handle>/
    product.json               canonical record — the diffable archive
    SPECS.md                   readable rendering, with source URL + capture date
    images/                    gallery + inline spec images, ≤1600px wide
    page.mhtml                 full rendered-page snapshot (optional)
```

`product.json` is the authoritative capture. It is the raw Shopify record, so a
`git diff` on it shows exactly what BetaFPV changed between captures — a silently
edited spec value shows up as a one-line diff. `SPECS.md` is generated *from* it;
if the two ever disagree, regenerate rather than hand-editing the Markdown.

## What is captured, and what is not

Captured: title, full description HTML, variants and SKUs, publish date, and every
image referenced by the gallery or embedded in the description.

Not captured: prices (volatile and irrelevant here), reviews, related-product
carousels, and any asset over 2 MB after resizing. Omissions are listed per product
in an "Images not archived" table in `SPECS.md` and counted in `MANIFEST.md` — the
capture never drops something silently. The one current size omission is a 15 MB
marketing video loop on the Meteor75 Pro P1 page; Shopify's CDN ignores both
`?width=` and `?format=` for GIFs, so it cannot be downscaled.

## Refreshing

```bash
node vendor_pages/capture.mjs      # from the repo root
```

Requires `node` and `curl`. Idempotent — safe to re-run. Commit the resulting diff
to record what the vendor changed; do not squash captures together, the history is
the point.

To add a product, append its Shopify handle to `PRODUCTS` in `capture.mjs` along with
an honest note on what it documents in this repo. Find a handle from any BetaFPV
collection with:

```bash
curl -s 'https://betafpv.com/collections/<collection>/products.json?limit=250' \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>
      JSON.parse(s).products.forEach(p=>console.log(p.handle,"|",p.title)))'
```

## Board mapping caveat

Two mappings are **confirmed** by hardware identifiers rather than by name:

- `air75-brushless-whoop-quadcopter` → `AIR75_G473/`, via the 0802SE 23000KV motors
  matching the OEM package `A75_0802SE_23000kv_GF 40mm_450mAh_4.5.0 0520`.
- `pavo-pico-ii-brushless-whoop-quadcopter` → `BETAFPVF405/` and
  `Pavo_Pico_II_BF2026_Upgrade/`, via STM32F405 in the description.

The four `matrix-1s-*` pages are captured as **G473 family context and are not
individually confirmed against a `board_name`.** The 5IN1 II listing advertises the
ICM42688P / ICM42622 / BMI270 alternate-IMU set, which resembles the
`BETAFPVG473_V2`/`V3` targets, but the targets also carry `LSM6DSK320X`, which no
page mentions. Do not use these pages to decide which target a physical board needs
— read `board_name` off the board with the CLI.

## Full-page snapshots (`page.mhtml`)

The Markdown + JSON capture above deliberately discards page layout. `page.mhtml`
preserves it: a complete rendered-page archive in MHTML (RFC 2557), a single
multipart/related file with the HTML, stylesheets, and images all embedded.

```bash
npm install ws                          # only dependency
node vendor_pages/capture_mhtml.mjs     # all products, or pass handles for a subset
```

These are produced by the browser itself through the DevTools `Page.captureSnapshot`
call — a genuine snapshot of the rendered page, not a reconstruction. The script
scrolls each page and waits for the network to go quiet first, because the galleries
lazy-load and an unscrolled capture silently omits most images. Each part carries a
`Content-Location` header and the file records `Snapshot-Content-Location`, so the
source URL of every asset survives.

**Reading them requires a Chromium-family browser.** This machine has Microsoft Edge
(`/opt/microsoft/msedge`), which is what the script drives; Chrome and Chromium work
too, via `BROWSER=/path/to/binary`. **Firefox cannot open MHTML** — that is a real
long-term constraint on this format, and the reason the JSON/Markdown capture is the
primary archive and these snapshots are a supplement. Note also that Chromium omits
scripts from MHTML, so the archive is the rendered DOM plus styling, not a working
interactive page. That is what you want for archival.

Expect ~2.5–3 MB per page. Two environment notes, both handled by the script: it
redirects `HOME` into a throwaway profile directory (Chromium aborts if `HOME` is not
writable), and that directory must sit at a short path — Chromium puts its singleton
socket inside the profile, and Unix socket paths cap near 108 characters, so a long
`TMPDIR` makes the browser fail at startup with "Socket path too long". Override with
`MHTML_PROFILE_DIR` if `/tmp` is unsuitable.

The script only ever signals the browser process it spawned itself, and runs that
browser on an isolated profile, so it will not disturb a running Edge session.
