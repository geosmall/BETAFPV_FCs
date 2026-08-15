#!/usr/bin/env node
// Capture BetaFPV product pages for the boards archived in this repo.
//
// Produces, per product, under vendor_pages/<handle>/:
//   product.json  — canonical Shopify record (title, description HTML, variants, image URLs)
//   SPECS.md      — readable/greppable rendering of the description
//   images/       — gallery + inline spec images, capped at IMG_WIDTH
//
// Re-run to refresh. product.json is the diffable record: a git diff on it shows
// exactly what BetaFPV changed. Run from the repo root:  node vendor_pages/capture.mjs
//
// The page.mhtml full-page snapshots are NOT produced here (they need a browser);
// see capture_mhtml.mjs and vendor_pages/README.md.

import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const OUT_ROOT = dirname(fileURLToPath(import.meta.url));
const ORIGIN = 'https://betafpv.com';
const IMG_WIDTH = 1600;
// Shopify's CDN honours ?width= for JPEG/PNG but ignores it (and ?format=) for
// GIFs, so a single marketing animation can outweigh every other asset combined.
// Anything still over this after resizing is skipped and listed in SPECS.md —
// its URL remains in product.json, so nothing is silently lost.
const MAX_IMG_BYTES = 2 * 1024 * 1024;

// handle -> what it documents in this repo. Keep this mapping honest: it is the
// only thing tying a marketing page to a board directory.
const PRODUCTS = [
  // --- Flight controllers ---
  ['air-brushless-flight-controller',
   'STM32G473CEU6 1S FC — the bare board archived in BETAFPVG473/ (board_name BETAFPVG473)'],
  ['f4-2-3s-20a-aio-fc-v1',
   'STM32F405RGT6 20A AIO — the FC archived in BETAFPVF405/ (board_name BETAFPVF405)'],
  ['matrix-1s-5in1-ii-brushless-flight-controller',
   'STM32G473CEU6 5IN1 II — candidate for the BETAFPVG473_V2/V3 revisions (lists the ICM42688P/ICM42622/BMI270 alt-IMU set). UNCONFIRMED against board_name'],
  ['matrix-1s-brushless-flight-controller-hd',
   'STM32G473CEU6 3IN1/4IN1 — G473 family context; likely the Meteor75 Pro P1 FC lineage. UNCONFIRMED'],
  ['matrix-1s-brushless-flight-controller',
   'STM32G473CEU6 5IN1 — G473 family context. UNCONFIRMED'],
  ['matrix-1s-brushless-flight-controller-aio-p1-hd-vtx',
   'STM32G473 AIO P1 HD VTX (BETA TEST listing) — G473 family context. UNCONFIRMED'],

  // --- Complete aircraft ---
  ['air75-brushless-whoop-quadcopter',
   'AIR75 75mm drone — the aircraft in AIR75_G473/. Confirmed by 0802SE 23000KV motors matching OEM package A75_0802SE_23000kv_...'],
  ['meteor75-pro-p1-brushless-whoop-quadcopter',
   'Meteor75 Pro P1 — the aircraft for OEM package BF4.5.3 G473 3in1_12A_M75 Pro P1_ELRS_BMI270'],
  ['pavo-pico-ii-brushless-whoop-quadcopter',
   'Pavo Pico II — the aircraft for both fleet units (BETAFPVF405/ and Pavo_Pico_II_BF2026_Upgrade/). Confirmed STM32F405 in description'],
];

// ---------------------------------------------------------------- HTML -> MD

const ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', deg: '°', times: '×',
  rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”',
  hellip: '…', trade: '™', reg: '®', copy: '©',
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);
}

// Collapse a run of inline HTML into plain text with markdown emphasis/links.
//
// Deliberately does NOT decode entities. This runs on fragments (headings, list
// items) whose output is spliced back into the document and stripped again later;
// decoding here would turn `&lt;12dBm` into a literal `<12dBm`, which the next
// stripTags() pass reads as an unclosed tag and deletes through to the following
// `>` — silently eating whole sections. Entities are decoded once, at the end of
// htmlToMarkdown, after all tag processing is finished.
function inlineToMd(html, imgMap) {
  let s = html;
  s = s.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = (tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i) || [])[1];
    const alt = (tag.match(/\balt\s*=\s*["']([^"']*)["']/i) || [])[1] || '';
    if (!src) return '';
    return `\n\n![${alt}](${imgMap.get(normalizeImg(src)) || src})\n\n`;
  });
  s = s.replace(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_, href, txt) => {
      const t = stripTags(txt).trim();
      return t ? `[${t}](${href.startsWith('//') ? 'https:' + href : href})` : '';
    });
  s = s.replace(/<(strong|b)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, __, t) => { const x = stripTags(t).trim(); return x ? `**${x}**` : ''; });
  s = s.replace(/<(em|i)\b[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, __, t) => { const x = stripTags(t).trim(); return x ? `*${x}*` : ''; });
  s = s.replace(/<br\s*\/?>/gi, '\n');
  return cleanText(stripTags(s));
}

const stripTags = (s) => s.replace(/<[^>]*>/g, '');

function cleanText(s) {
  return s
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Shopify serves size variants of the same asset; key on the path so a gallery
// image and its inline _1024x1024 twin dedupe to one local file.
function normalizeImg(url) {
  let u = url.startsWith('//') ? 'https:' + url : url;
  try {
    const p = new URL(u);
    // strip Shopify's _WxH suffix before the extension
    p.pathname = p.pathname.replace(/_\d+x\d*(?=\.[a-z0-9]+$)/i, '');
    p.search = '';
    return p.toString();
  } catch { return u; }
}

function htmlToMarkdown(html, imgMap) {
  let s = html;
  s = s.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, '');
  s = s.replace(/<!--[\s\S]*?-->/g, '');

  // Headings
  s = s.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, lvl, t) => {
    const txt = inlineToMd(t, imgMap).replace(/\n+/g, ' ').trim();
    // demote by one: the document already has an H1
    const n = Math.min(6, Number(lvl) + 1);
    return txt ? `\n\n${'#'.repeat(n)} ${txt}\n\n` : '\n\n';
  });

  // Lists
  s = s.replace(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/gi, (_, kind, body) => {
    let i = 0;
    const items = [...body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => {
      const txt = inlineToMd(m[1], imgMap).replace(/\n+/g, ' ').trim();
      if (!txt) return '';
      i += 1;
      return kind.toLowerCase() === 'ol' ? `${i}. ${txt}` : `- ${txt}`;
    }).filter(Boolean);
    return items.length ? `\n\n${items.join('\n')}\n\n` : '\n\n';
  });

  // Block containers -> paragraph breaks
  s = s.replace(/<\/(p|div|article|section|tr|table)>/gi, '\n\n');
  s = s.replace(/<(p|div|article|section)\b[^>]*>/gi, '\n\n');

  // Entities are decoded here and nowhere earlier — see the note on inlineToMd.
  return decodeEntities(inlineToMd(s, imgMap))
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[ \t]+/gm, '')
    .trim();
}

// ------------------------------------------------------------------- fetch

// curl rather than fetch(): Node 20's undici ignores the http_proxy/https_proxy
// environment, and curl is present everywhere this script would plausibly run.
const UA = 'betafpv-fc-archive/1.0';

function curl(url, extraArgs = []) {
  let lastErr;
  // One retry: the Shopify CDN intermittently answers 502 under parallel load.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return execFileSync('curl', [
        '-sS', '--fail', '--location', '--max-time', '60',
        '--retry', '2', '--retry-delay', '1',
        '-A', UA, ...extraArgs, url,
      ], { maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

function getJson(url) {
  return JSON.parse(curl(url).toString('utf8'));
}

function sizedUrl(url) {
  const u = new URL(normalizeImg(url));
  u.searchParams.set('width', String(IMG_WIDTH));
  return u.toString();
}

// Content-Length of the *resized* asset, or null if the CDN won't say.
function sizeOf(url) {
  const head = curl(url, ['-I']).toString('utf8');
  const m = head.match(/^content-length:\s*(\d+)/im);
  return m ? Number(m[1]) : null;
}

async function downloadImage(url, dest) {
  const src = sizedUrl(url);
  const declared = sizeOf(src);
  if (declared !== null && declared > MAX_IMG_BYTES) {
    return { skipped: `${(declared / 1048576).toFixed(1)} MB exceeds cap` };
  }
  const buf = curl(src);
  if (buf.length > MAX_IMG_BYTES) {
    return { skipped: `${(buf.length / 1048576).toFixed(1)} MB exceeds cap` };
  }
  await writeFile(dest, buf);
  return { bytes: buf.length };
}

// ------------------------------------------------------------------- main

const capturedAt = new Date().toISOString().slice(0, 10);
const manifest = [];

for (const [handle, note] of PRODUCTS) {
  const pageUrl = `${ORIGIN}/products/${handle}`;
  process.stdout.write(`\n== ${handle}\n`);

  const { product } = getJson(`${pageUrl}.json`);
  const dir = join(OUT_ROOT, handle);
  await mkdir(join(dir, 'images'), { recursive: true });

  await writeFile(join(dir, 'product.json'), JSON.stringify(product, null, 2) + '\n');

  // Gather every image: gallery first (stable order), then inline body images.
  const body = product.body_html || '';
  const inline = [...body.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  const seen = new Map(); // normalized url -> local relative path
  const queue = [];
  // Gallery images are not referenced from body_html, so SPECS.md links them
  // separately — otherwise they would sit on disk unreachable from any document.
  const gallery = new Set(product.images.map((i) => normalizeImg(i.src)));
  for (const src of [...product.images.map((i) => i.src), ...inline]) {
    const key = normalizeImg(src);
    if (seen.has(key)) continue;
    const ext = (key.match(/\.([a-z0-9]+)$/i) || [, 'jpg'])[1].toLowerCase();
    const name = `img-${String(seen.size + 1).padStart(2, '0')}.${ext}`;
    seen.set(key, `images/${name}`);
    queue.push([key, join(dir, 'images', name)]);
  }

  let bytes = 0;
  const omitted = [];
  for (const [url, dest] of queue) {
    let result;
    try {
      result = await downloadImage(url, dest);
    } catch (e) {
      const code = (String(e.message).match(/error:?\s*(\d{3})/i) || [])[1] || 'error';
      result = { skipped: `unavailable from CDN (HTTP ${code})` };
    }
    if (result.skipped) {
      seen.delete(normalizeImg(url));         // don't link a file we didn't write
      omitted.push({ url: normalizeImg(url), why: result.skipped });
      process.stdout.write(`   ~ omitted: ${result.skipped} — ${normalizeImg(url).split('/').pop()}\n`);
    } else {
      bytes += result.bytes;
    }
  }

  const md = [
    `# ${product.title}`,
    '',
    '| | |',
    '|---|---|',
    `| Source | <${pageUrl}> |`,
    `| Captured | ${capturedAt} |`,
    `| Shopify handle | \`${handle}\` |`,
    `| Vendor | ${product.vendor || '—'} |`,
    `| Product type | ${product.product_type || '—'} |`,
    `| Published | ${(product.published_at || '').slice(0, 10) || '—'} |`,
    `| Relevance to this repo | ${note} |`,
    '',
    '> Archived marketing page. Vendor specifications, **not** a configuration',
    '> artifact — nothing here is restorable to a flight controller. Where this',
    '> page and a CLI dump or `config.h` disagree, the dump or target wins.',
    '',
    '## Variants',
    '',
    '| Variant | SKU | Available |',
    '|---|---|---|',
    ...product.variants.map((v) =>
      `| ${v.title} | ${v.sku || '—'} | ${v.available ? 'yes' : 'no'} |`),
    '',
    ...(() => {
      const shots = [...gallery].filter((u) => seen.has(u));
      return shots.length ? [
        '## Gallery',
        '',
        ...shots.map((u, i) => `![Gallery image ${i + 1}](${seen.get(u)})`),
        '',
      ] : [];
    })(),
    ...(omitted.length ? [
      '## Images not archived',
      '',
      'These remain linked to their original CDN URL in the description below,',
      'so they will break if BetaFPV takes the page down.',
      '',
      '| Asset | Reason |',
      '|---|---|',
      ...omitted.map((o) => `| [${o.url.split('/').pop()}](${o.url}) | ${o.why} |`),
      '',
    ] : []),
    '## Description',
    '',
    htmlToMarkdown(body, seen),
    '',
  ].join('\n');

  await writeFile(join(dir, 'SPECS.md'), md.replace(/\n{3,}/g, '\n\n'));

  const kb = Math.round(bytes / 1024);
  process.stdout.write(`   ${product.variants.length} variants, ${seen.size} images, ${kb} KB\n`);
  manifest.push({ handle, title: product.title, url: pageUrl, note, images: seen.size, kb, omitted: omitted.length });
}

const rows = manifest.map((m) =>
  `| [\`${m.handle}\`](${m.handle}/SPECS.md) | ${m.title} | ${m.images} | ${m.kb} | ${m.omitted || "—"} |`);
await writeFile(join(OUT_ROOT, 'MANIFEST.md'), [
  '# Capture manifest',
  '',
  `Captured ${capturedAt} from <${ORIGIN}> via the Shopify product JSON endpoint.`,
  `Images fetched at width=${IMG_WIDTH}. Regenerate with \`node vendor_pages/capture.mjs\`.`,
  '',
  '| Handle | Title | Images | KB | Omitted |',
  '|---|---|---|---|---|',
  ...rows,
  '',
  '## What each page documents',
  '',
  ...manifest.map((m) => `- **${m.title}** — ${m.note}`),
  '',
].join('\n'));

process.stdout.write(`\nWrote ${manifest.length} products + MANIFEST.md\n`);
