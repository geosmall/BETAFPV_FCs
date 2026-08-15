#!/usr/bin/env node
// Capture full-page MHTML snapshots of the archived BetaFPV product pages.
//
// Writes <handle>/page.mhtml alongside the product.json/SPECS.md capture produced
// by capture.mjs. Operates on whatever product directories already exist, so run
// capture.mjs first.
//
//   npm install ws                     # only dependency
//   node vendor_pages/capture_mhtml.mjs
//   node vendor_pages/capture_mhtml.mjs air-brushless-flight-controller   # subset
//
// MHTML (RFC 2557) is produced by the browser itself via the DevTools
// Page.captureSnapshot call — it is a real rendered-page archive, not a
// reconstruction. It requires a Chromium-family browser; Microsoft Edge counts,
// which is what this machine has. Firefox cannot read the result.
//
// The pages lazy-load their galleries, so this scrolls to the bottom and waits
// for the network to go quiet before snapshotting. Skipping that silently loses
// most images.

import { writeFile, mkdir, readdir, stat, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const OUT_ROOT = dirname(fileURLToPath(import.meta.url));
const ORIGIN = 'https://betafpv.com';
const VIEWPORT = { width: 1440, height: 2000 };
const NAV_TIMEOUT_MS = 90_000;
const QUIET_MS = 2500;        // network must be idle this long before snapshotting

let WebSocket;
try {
  WebSocket = createRequire(import.meta.url)('ws');
} catch {
  console.error('Missing dependency: ws\n\n  npm install ws\n\n' +
    'Needed to speak the DevTools protocol; Node 20 has no built-in WebSocket client.');
  process.exit(1);
}

// ------------------------------------------------------------------ browser

function findBrowser() {
  if (process.env.BROWSER) return process.env.BROWSER;
  const candidates = [
    'microsoft-edge', 'microsoft-edge-stable',
    'google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser',
  ];
  for (const c of candidates) {
    try {
      return execFileSync('command', ['-v', c], { shell: '/bin/bash' }).toString().trim();
    } catch { /* not installed */ }
  }
  throw new Error(
    'No Chromium-family browser found. MHTML requires one (Firefox cannot write it).\n' +
    'Install Chrome/Chromium/Edge, or set BROWSER=/path/to/binary.');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch(binary, profileDir) {
  const port = 9222 + Math.floor((process.pid % 500));
  const args = [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--disable-crash-reporter', '--disable-breakpad', '--no-first-run',
    '--no-default-browser-check', '--disable-extensions',
    `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${port}`,
    'about:blank',
  ];
  // Edge/Chrome crash if HOME is not writable; keep all browser state in the profile dir.
  const proc = spawn(binary, args, {
    stdio: ['ignore', 'ignore', 'pipe'],
    env: { ...process.env, HOME: profileDir },
  });

  // Take the endpoint from the browser's own announcement rather than polling
  // HTTP: it is exact, and it avoids any ambiguity about which port it settled on.
  return new Promise((resolve, reject) => {
    let buf = '';
    const onData = (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        proc.stderr.off('data', onData);
        proc.stderr.on('data', () => {});      // keep draining crashpad chatter
        clearTimeout(timer);
        resolve({ proc, ws: m[1] });
      }
    };
    proc.stderr.on('data', onData);
    // Surface the browser's own complaint — a bare exit code is undiagnosable.
    const detail = () => buf.split('\n')
      .filter((l) => l.trim() && !/crashpad|Crash Reports|recvmsg|GPU|Vulkan|dbus/i.test(l))
      .slice(-8).join('\n  ');
    proc.once('exit', (code, signal) => reject(new Error(
      `browser exited (code=${code} signal=${signal}) before DevTools came up:\n  ${detail()}`)));
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`browser did not announce a DevTools endpoint in 30s:\n  ${detail()}`));
    }, 30_000);
  });
}

// -------------------------------------------------------------------- CDP

class Cdp {
  constructor(sock) {
    this.sock = sock;
    this.id = 0;
    this.pending = new Map();
    this.handlers = new Map();
    sock.on('message', (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id !== undefined) {
        const p = this.pending.get(msg.id);
        if (!p) return;
        this.pending.delete(msg.id);
        msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
      } else {
        for (const h of this.handlers.get(msg.method) || []) h(msg.params);
      }
    });
  }

  static connect(url) {
    return new Promise((resolve, reject) => {
      const sock = new WebSocket(url, { maxPayload: 512 * 1024 * 1024 });
      sock.once('open', () => resolve(new Cdp(sock)));
      sock.once('error', reject);
    });
  }

  on(method, fn) {
    if (!this.handlers.has(method)) this.handlers.set(method, []);
    this.handlers.get(method).push(fn);
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.sock.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`${method} timed out`));
      }, NAV_TIMEOUT_MS);
    });
  }

  close() { this.sock.close(); }
}

// Resolve once no request has been in flight for QUIET_MS, or on hard timeout.
function networkQuiet(cdp, sessionId) {
  let inflight = 0;
  let timer = null;
  return new Promise((resolve) => {
    const done = () => resolve();
    const bump = () => {
      if (timer) clearTimeout(timer);
      if (inflight <= 0) timer = setTimeout(done, QUIET_MS);
    };
    cdp.on('Network.requestWillBeSent', (p) => { if (p.sessionId ?? true) { inflight += 1; bump(); } });
    const settle = () => { inflight = Math.max(0, inflight - 1); bump(); };
    cdp.on('Network.loadingFinished', settle);
    cdp.on('Network.loadingFailed', settle);
    bump();
    setTimeout(done, NAV_TIMEOUT_MS - 5000);
  });
}

async function scrollThrough(cdp, sessionId) {
  // Step down the page so lazy <img> elements enter the viewport, then return
  // to the top so the snapshot opens at a sensible scroll position.
  await cdp.send('Runtime.evaluate', {
    awaitPromise: true,
    expression: `(async () => {
      const step = window.innerHeight * 0.8;
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 250));
      }
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 800));
      // force-load anything still deferred
      for (const img of document.querySelectorAll('img[loading="lazy"]')) img.loading = 'eager';
      for (const el of document.querySelectorAll('img[data-src]')) {
        if (!el.src || el.src.startsWith('data:')) el.src = el.dataset.src;
      }
      await new Promise(r => setTimeout(r, 800));
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 400));
    })()`,
  }, sessionId);
}

// -------------------------------------------------------------------- main

const only = process.argv.slice(2);
const dirs = [];
for (const e of await readdir(OUT_ROOT, { withFileTypes: true })) {
  if (!e.isDirectory() || e.name.startsWith('.')) continue;
  if (only.length && !only.includes(e.name)) continue;
  try {
    await stat(join(OUT_ROOT, e.name, 'product.json'));
    dirs.push(e.name);
  } catch { /* not a captured product */ }
}
if (!dirs.length) {
  console.error('No product directories found. Run capture.mjs first.');
  process.exit(1);
}

const binary = findBrowser();
// Chromium places its singleton socket inside the profile directory, and Unix
// domain socket paths are capped near 108 bytes. A profile under a long TMPDIR
// makes the browser abort at startup with "Socket path too long", so default to
// a short path rather than inheriting TMPDIR.
const profileDir = join(process.env.MHTML_PROFILE_DIR || '/tmp', `mhtml-${process.pid}`);
if (profileDir.length > 60) {
  console.error(`Profile path too long for Chromium's singleton socket (${profileDir.length} chars):\n` +
    `  ${profileDir}\nSet MHTML_PROFILE_DIR to something shorter.`);
  process.exit(1);
}
await mkdir(profileDir, { recursive: true });
console.log(`browser: ${binary}\n`);

const { proc, ws } = await launch(binary, profileDir);
const cdp = await Cdp.connect(ws);
const results = [];

try {
  for (const handle of dirs) {
    const url = `${ORIGIN}/products/${handle}`;
    process.stdout.write(`== ${handle}\n`);

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    try {
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Network.enable', {}, sessionId);

      const loaded = new Promise((resolve) => cdp.on('Page.loadEventFired', resolve));
      const quiet = networkQuiet(cdp, sessionId);
      await cdp.send('Page.navigate', { url }, sessionId);
      await Promise.race([loaded, sleep(NAV_TIMEOUT_MS - 10000)]);
      await quiet;

      await scrollThrough(cdp, sessionId);
      await sleep(1000);

      const { data } = await cdp.send('Page.captureSnapshot', { format: 'mhtml' }, sessionId);
      const dest = join(OUT_ROOT, handle, 'page.mhtml');
      await writeFile(dest, data, 'utf8');

      const mb = (Buffer.byteLength(data, 'utf8') / 1048576).toFixed(1);
      const parts = (data.match(/^Content-Location:/gim) || []).length;
      console.log(`   ${mb} MB, ${parts} embedded resources`);
      results.push({ handle, mb: Number(mb), parts });
    } finally {
      await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
    }
  }
} finally {
  cdp.close();
  // Signals only the PID this script spawned — never any other browser process.
  proc.kill('SIGTERM');
  await sleep(500);
  if (proc.exitCode === null) proc.kill('SIGKILL');
  await rm(profileDir, { recursive: true, force: true }).catch(() => {});
}

const total = results.reduce((a, r) => a + r.mb, 0).toFixed(1);
console.log(`\n${results.length} snapshots, ${total} MB total`);
