const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');

const ROOT = __dirname;
const BIN = path.join(ROOT, 'bin');
const EXE = process.platform === 'win32' ? '.exe' : '';
const YTDLP = path.join(BIN, 'yt-dlp' + EXE);
const FFMPEG = path.join(BIN, 'ffmpeg' + EXE);
const FFPROBE = path.join(BIN, 'ffprobe' + EXE);

// Clips system ke Downloads folder mein jaati hain, app folder ke andar nahi —
// taaki update/reinstall par bhi files apni jagah rahein.
// Windows par user Downloads ko kahin aur move kar sakta hai, isliye pehle
// registry se asli path poochho; na mile to ~/Downloads.
function userDownloadsDir() {
  if (process.platform === 'win32') {
    for (const key of ['User Shell Folders', 'Shell Folders']) {
      try {
        const out = execFileSync('reg', [
          'query', `HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\${key}`,
          '/v', '{374DE290-123F-4565-9164-39C4925E467B}',
        ], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
        const m = out.match(/REG_(?:EXPAND_)?SZ\s+(.+)/);
        if (m) {
          const p = m[1].trim().replace(/%([^%]+)%/g, (_, v) => process.env[v] || '');
          if (p && fs.existsSync(p)) return p;
        }
      } catch {}
    }
  }
  return path.join(os.homedir(), 'Downloads');
}

const DOWNLOADS = path.join(userDownloadsDir(), 'YT Clip Downloader');
const PUBLIC = path.join(ROOT, 'public');
const PORT = 3777;
const MAX_CONCURRENCY = 10;
const MAX_ATTEMPTS = 3; // auto-retry on transient YouTube 403/ffmpeg failures

let concurrency = 5;
let paused = false;
let cookiesBrowser = 'none'; // bot-check aane par auto Chrome try hota hai

// deno (n-challenge solver) bin/ mein hai — PATH mein daalo
const SPAWN_ENV = { ...process.env, PATH: BIN + path.delimiter + (process.env.PATH || '') };

function openInFileManager(dir) {
  if (process.platform === 'win32') spawn('explorer', [dir]);
  else if (process.platform === 'darwin') spawn('open', [dir]);
  else spawn('xdg-open', [dir]);
}

function cookieArgs(job) {
  const b = (job && job.cookiesOverride) || cookiesBrowser;
  return b && b !== 'none' ? ['--cookies-from-browser', b] : [];
}

// DOWNLOADS user ke apne Downloads folder mein hai — wahan folder kabhi bhi
// user, OneDrive ya Storage Sense hata sakta hai. Isliye har baar use karne se
// pehle bana lo, aur read fail ho to crash mat karo.
function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); return true; } catch { return false; }
}

function listDir(dir) {
  ensureDir(dir);
  try { return fs.readdirSync(dir); } catch { return []; }
}

ensureDir(DOWNLOADS);

// ---- batch folders: "Folder 1", "Folder 2", ... ----
function scanFolders() {
  return listDir(DOWNLOADS)
    .map(n => n.match(/^Folder (\d+)$/))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10));
}

let batchNum = Math.max(0, ...scanFolders()) || 1;
ensureDir(path.join(DOWNLOADS, `Folder ${batchNum}`));

function batchDir() { return path.join(DOWNLOADS, `Folder ${batchNum}`); }

// next file number = continue after highest existing "N.mp4" in current folder
function nextSeq() {
  const nums = listDir(batchDir())
    .map(n => n.match(/^(\d+)\.[a-z0-9]+$/i))
    .filter(Boolean)
    .map(m => parseInt(m[1], 10));
  const jobNums = [...jobs.values()].filter(j => j.batch === batchNum).map(j => j.num);
  return Math.max(0, ...nums, ...jobNums) + 1;
}

const jobs = new Map();
let nextId = 1;
let running = 0;

function toSeconds(ts) {
  ts = String(ts).trim();
  if (!ts) return null;
  const parts = ts.split(':').map(Number);
  if (parts.some(isNaN)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

function fmt(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
  return [h, m, sec].map(n => String(n).padStart(2, '0')).join(':');
}

// Accepts "1:20-2:45", "1:20 – 2:45", "80-165", "1:20" (till end), "" (full video)
function parseRange(raw) {
  raw = String(raw || '').trim();
  if (!raw) return { start: null, end: null };
  const m = raw.split(/\s*(?:-|–|—|to)\s*/i);
  const start = toSeconds(m[0]);
  const end = m.length > 1 && m[1] ? toSeconds(m[1]) : null;
  if (start === null) return null;
  if (end !== null && end <= start) return null;
  return { start, end };
}

function rangeLabel(r) {
  return r.start === null ? 'full video'
    : `${fmt(r.start)} → ${r.end !== null ? fmt(r.end) : 'end'}`;
}

function pump() {
  if (paused) return;
  while (running < concurrency) {
    const job = [...jobs.values()].find(j => j.status === 'queued');
    if (!job) return;
    running++;
    runJob(job).finally(() => { running--; pump(); });
  }
}

function cleanPartials(job) {
  // remove old/partial/temp files for this number before (re)downloading
  for (const f of listDir(job.dir)) {
    if (f.split('.')[0] === String(job.num)) {
      try { fs.rmSync(path.join(job.dir, f)); } catch {}
    }
  }
}

const FORMAT = 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/bv*[height<=1080]+ba/b[height<=1080]/b';
// Cache app folder ke andar hi rehta hai — user ke Downloads folder mein
// sirf uski clips dikhein, ye internal scratch space nahi.
const CACHE = path.join(ROOT, 'cache');
ensureDir(CACHE);

function videoKey(url) {
  const m = url.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
}

function spawnTracked(job, cmd, args, onStdout) {
  return new Promise(resolve => {
    const p = spawn(cmd, args, { env: SPAWN_ENV });
    job.proc = p;
    let errBuf = '';
    p.stdout.on('data', d => onStdout && onStdout(d.toString()));
    p.stderr.on('data', d => { errBuf += d.toString(); if (onStdout) onStdout(d.toString()); });
    p.on('close', code => { job.proc = null; resolve({ code, errBuf }); });
    p.on('error', e => { job.proc = null; resolve({ code: -1, errBuf: e.message }); });
  });
}

function ytdlpProgress(job) {
  return text => {
    const m = [...text.matchAll(/\[download\]\s+([\d.]+)%/g)].pop();
    if (m) job.progress = parseFloat(m[1]);
    if (/\[Merger\]|\[ffmpeg\]/.test(text)) job.phase = 'processing';
  };
}

function extractError(errBuf, fallback) {
  const lines = errBuf.trim().split('\n').filter(l => l.includes('ERROR'));
  return (lines.pop() || errBuf.trim().split('\n').pop() || fallback).slice(0, 400);
}

function probeDuration(file) {
  return new Promise(resolve => {
    const p = spawn(FFPROBE, ['-v', 'error', '-select_streams', 'v:0',
      '-show_entries', 'stream=duration', '-of', 'csv=p=0', file]);
    let out = '';
    p.stdout.on('data', d => out += d);
    p.on('close', () => resolve(parseFloat(out) || 0));
    p.on('error', () => resolve(0));
  });
}

// FAST PATH: section stream-copy (no re-encode during network read = fast),
// phir offset-formula se frame-accurate local cut
async function attemptSection(job) {
  const len = job.end - job.start;
  const secTemplate = path.join(job.dir, `${job.num}.sec.%(ext)s`);
  const secFile = path.join(job.dir, `${job.num}.sec.mp4`);

  const dl = await spawnTracked(job, YTDLP, [
    '--ffmpeg-location', FFMPEG,
    '--newline', '--no-playlist',
    '--retries', '10', '--fragment-retries', '10',
    '--downloader-args', 'ffmpeg_i:-reconnect 1 -reconnect_streamed 1 -reconnect_delay_max 5',
    ...cookieArgs(job),
    '-f', FORMAT,
    '--merge-output-format', 'mp4',
    '-o', secTemplate,
    '--download-sections', `*${job.start}-${job.end}`,
    job.url,
  ], ytdlpProgress(job));
  if (dl.code !== 0 || job.killRequested) return dl;
  if (!fs.existsSync(secFile)) return { code: -1, errBuf: 'section file missing' };

  // stream copy keyframe se shuru hota hai (thoda pehle) — extra head = actual duration - requested
  const dv = await probeDuration(secFile);
  const offset = Math.max(0, dv - len);
  job.phase = 'cutting';
  const cut = await spawnTracked(job, FFMPEG, [
    '-y', '-ss', String(offset), '-t', String(len), '-i', secFile,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
    path.join(job.dir, `${job.num}.mp4`),
  ]);
  try { fs.rmSync(secFile); } catch {}
  return cut;
}

// full video download (jobs without timestamp) — straight to destination
function attemptFull(job) {
  const args = [
    '--ffmpeg-location', FFMPEG,
    '--newline', '--no-playlist',
    '--retries', '10', '--fragment-retries', '10',
    '--concurrent-fragments', '8',
    ...cookieArgs(job),
    '-f', FORMAT,
    '--merge-output-format', 'mp4',
    '-o', path.join(job.dir, `${job.num}.%(ext)s`),
    job.url,
  ];
  return spawnTracked(job, YTDLP, args, ytdlpProgress(job));
}

// FALLBACK: poora video ek baar cache mein (same link ke saare clips share karte hain), phir local cut
const inflightCache = new Map(); // key -> { promise, jobs:Set, proc }

function ensureCachedVideo(job) {
  const key = videoKey(job.url);
  const cacheFile = path.join(CACHE, `${key}.mp4`);
  if (fs.existsSync(cacheFile)) return Promise.resolve(cacheFile);

  let entry = inflightCache.get(key);
  if (entry) {
    entry.jobs.add(job);
    return entry.promise;
  }

  entry = { jobs: new Set([job]), proc: null };
  entry.promise = new Promise(resolve => {
    const args = [
      '--ffmpeg-location', FFMPEG,
      '--newline', '--no-playlist',
      '--retries', '10', '--fragment-retries', '10',
      '--concurrent-fragments', '8',
      ...cookieArgs(job),
      '-f', FORMAT,
      '--merge-output-format', 'mp4',
      '-o', path.join(CACHE, `${key}.%(ext)s`),
      job.url,
    ];
    const p = spawn(YTDLP, args, { env: SPAWN_ENV });
    entry.proc = p;
    let errBuf = '';
    p.stdout.on('data', d => {
      const text = d.toString();
      const m = [...text.matchAll(/\[download\]\s+([\d.]+)%/g)].pop();
      for (const j of entry.jobs) {
        if (m) j.progress = parseFloat(m[1]);
        j.phase = 'full-download';
      }
    });
    p.stderr.on('data', d => { errBuf += d.toString(); });
    p.on('close', code => {
      inflightCache.delete(key);
      if (code === 0 && fs.existsSync(cacheFile)) resolve(cacheFile);
      else {
        try { for (const f of fs.readdirSync(CACHE)) if (f.startsWith(key)) fs.rmSync(path.join(CACHE, f)); } catch {}
        resolve({ error: extractError(errBuf, 'full video download failed') });
      }
    });
    p.on('error', e => { inflightCache.delete(key); resolve({ error: e.message }); });
  });
  inflightCache.set(key, entry);
  return entry.promise;
}

// local accurate cut from cached full video (re-encode = frame-perfect timestamps)
function cutClip(job, src) {
  const out = path.join(job.dir, `${job.num}.mp4`);
  const args = ['-y', '-ss', String(job.start)];
  if (job.end !== null) args.push('-to', String(job.end));
  args.push('-i', src, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18',
    '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out);
  job.phase = 'cutting';
  return spawnTracked(job, FFMPEG, args);
}

function finishIfDone(job) {
  const fileName = `${job.num}.mp4`;
  const full = path.join(job.dir, fileName);
  if (fs.existsSync(full) && fs.statSync(full).size > 0) {
    job.status = 'done';
    job.progress = 100;
    job.phase = null;
    job.error = null;
    job.file = fileName;
    job.folder = path.basename(job.dir);
    job.size = fs.statSync(full).size;
    return true;
  }
  return false;
}

function wasKilled(job) {
  if (job.killRequested) {
    job.killRequested = false;
    job.status = 'stopped';
    job.error = null;
    job.phase = null;
    return true;
  }
  return false;
}

async function runJob(job) {
  job.status = 'running';
  job.error = null;
  job.phase = null;

  // folder beech mein delete/move ho gaya ho to dobara bana do
  if (!ensureDir(job.dir)) {
    job.status = 'error';
    job.error = `Download folder nahi ban paya: ${job.dir}`;
    return;
  }
  ensureDir(CACHE);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    job.attempt = attempt;
    job.progress = 0;
    cleanPartials(job);

    const key = videoKey(job.url);
    const cacheExists = fs.existsSync(path.join(CACHE, `${key}.mp4`));
    // same video ke kitne clips queue/running mein hain? >=2 to full download share karna faster hai
    const siblings = [...jobs.values()].filter(j =>
      (j.status === 'queued' || j.status === 'running') && j.start !== null && videoKey(j.url) === key).length;

    const useSectionPath = job.start !== null && job.end !== null &&
      !cacheExists && siblings < 2 && attempt === 1;

    let result;
    if (job.start === null) {
      // full video job — no cutting needed
      result = await attemptFull(job);
    } else if (useSectionPath) {
      // fast path: sirf section stream-copy + local precise cut
      result = await attemptSection(job);
    } else {
      // shared path: poora video ek baar cache mein, saare clips local cut (guaranteed)
      const cached = await ensureCachedVideo(job);
      if (wasKilled(job)) return;
      if (typeof cached === 'string') {
        result = await cutClip(job, cached);
        if (result.code !== 0) result.errBuf = result.errBuf || 'ffmpeg cut failed';
      } else {
        result = { code: -1, errBuf: cached.error };
      }
    }

    if (wasKilled(job)) return;

    if (result.code === 0 && finishIfDone(job)) return;

    job.error = extractError(result.errBuf, 'download failed');

    // YouTube bot-check → Chrome cookies ke saath auto-retry
    if (/sign in to confirm|not a bot|cookies/i.test(job.error) && !job.cookiesOverride && cookiesBrowser === 'none') {
      job.cookiesOverride = 'chrome';
      job.phase = 'retrying with Chrome cookies';
    } else if (attempt < MAX_ATTEMPTS) {
      job.phase = `retrying (${attempt + 1}/${MAX_ATTEMPTS})`;
    }
  }
  job.status = 'error';
  job.phase = null;
}

function stopAll() {
  paused = true;
  for (const j of jobs.values()) {
    if (j.status === 'running') {
      j.killRequested = true;
      if (j.proc) { try { j.proc.kill('SIGTERM'); } catch {} }
    }
    if (j.status === 'queued') j.status = 'stopped';
  }
  for (const entry of inflightCache.values()) {
    if (entry.proc) { try { entry.proc.kill('SIGTERM'); } catch {} }
  }
}

function startAll() {
  paused = false;
  for (const j of jobs.values()) if (j.status === 'stopped') { j.status = 'queued'; }
  pump();
}

function publicJob(j) {
  return {
    id: j.id, num: j.num, url: j.url, range: j.rangeLabel, rawRange: j.rawRange,
    status: j.status, progress: j.progress, phase: j.phase, attempt: j.attempt,
    file: j.file, folder: j.folder || path.basename(j.dir), size: j.size, error: j.error,
  };
}

function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readBody(req) {
  return new Promise(resolve => {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/api/state') {
    return json(res, 200, {
      jobs: [...jobs.values()].map(publicJob).sort((a, b) => a.id - b.id),
      folder: `Folder ${batchNum}`,
      downloadsRoot: DOWNLOADS,
      paused,
      concurrency,
      maxConcurrency: MAX_CONCURRENCY,
      cookiesBrowser,
    });
  }

  if (req.method === 'POST' && url.pathname === '/api/jobs') {
    const body = await readBody(req);
    const items = body && body.items;
    if (!Array.isArray(items)) return json(res, 400, { error: 'items required' });
    const created = [], rejected = [];
    let seq = nextSeq();
    for (const it of items) {
      const u = String(it.url || '').trim();
      if (!/^https?:\/\//.test(u)) { rejected.push({ url: u, reason: 'invalid URL' }); continue; }
      const range = parseRange(it.range);
      if (range === null) { rejected.push({ url: u, reason: 'invalid timestamp' }); continue; }
      const job = {
        id: nextId++, num: seq++, batch: batchNum, dir: batchDir(),
        url: u, start: range.start, end: range.end,
        rawRange: String(it.range || '').trim(),
        rangeLabel: rangeLabel(range),
        status: 'queued', progress: 0,
      };
      jobs.set(job.id, job);
      created.push(job.id);
    }
    if (created.length && paused) paused = false; // naya batch aaya to queue chalu karo
    pump();
    return json(res, 200, { created, rejected });
  }

  // retry single job, optionally with edited url/range
  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'jobs' && parts[3] === 'retry') {
    const job = jobs.get(parseInt(parts[2], 10));
    if (!job) return json(res, 404, { error: 'job not found' });
    if (job.status === 'running' || job.status === 'queued') return json(res, 400, { error: 'already in progress' });
    const body = await readBody(req) || {};
    if (body.url !== undefined) {
      const u = String(body.url).trim();
      if (!/^https?:\/\//.test(u)) return json(res, 400, { error: 'invalid URL' });
      job.url = u;
    }
    if (body.range !== undefined) {
      const r = parseRange(body.range);
      if (r === null) return json(res, 400, { error: 'invalid timestamp' });
      job.start = r.start; job.end = r.end;
      job.rawRange = String(body.range).trim();
      job.rangeLabel = rangeLabel(r);
    }
    job.status = 'queued'; job.error = null; job.progress = 0; job.file = null; job.size = null;
    paused = false;
    pump();
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/retry-failed') {
    let n = 0;
    for (const j of jobs.values()) {
      if (j.status === 'error' || j.status === 'stopped') {
        j.status = 'queued'; j.error = null; j.progress = 0; n++;
      }
    }
    if (n) { paused = false; pump(); }
    return json(res, 200, { retried: n });
  }

  if (req.method === 'POST' && url.pathname === '/api/stop') {
    stopAll();
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/start') {
    startAll();
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/clear-all') {
    stopAll();
    jobs.clear();
    paused = false;
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/clear') {
    for (const [id, j] of jobs) if (j.status === 'done' || j.status === 'error' || j.status === 'stopped') jobs.delete(id);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && url.pathname === '/api/folder/new') {
    batchNum = Math.max(batchNum, ...scanFolders()) + 1;
    ensureDir(batchDir());
    return json(res, 200, { folder: `Folder ${batchNum}` });
  }

  if (req.method === 'POST' && url.pathname === '/api/folder/open') {
    ensureDir(batchDir());
    openInFileManager(batchDir());
    return json(res, 200, { ok: true });
  }

  if (req.method === 'GET' && url.pathname === '/api/settings') {
    return json(res, 200, { concurrency, max: MAX_CONCURRENCY, cookiesBrowser });
  }

  if (req.method === 'POST' && url.pathname === '/api/settings') {
    const body = await readBody(req);
    const n = body && parseInt(body.concurrency, 10);
    if (n >= 1 && n <= MAX_CONCURRENCY) { concurrency = n; pump(); }
    if (body && ['none', 'chrome', 'safari', 'brave', 'edge', 'firefox'].includes(body.cookiesBrowser)) {
      cookiesBrowser = body.cookiesBrowser;
    }
    return json(res, 200, { concurrency, cookiesBrowser });
  }

  // /files/<folder>/<name>
  if (req.method === 'GET' && parts[0] === 'files' && parts.length === 3) {
    const file = path.join(DOWNLOADS, path.basename(decodeURIComponent(parts[1])), path.basename(decodeURIComponent(parts[2])));
    if (!fs.existsSync(file)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, {
      'Content-Type': 'video/mp4',
      'Content-Length': fs.statSync(file).size,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(file))}`,
    });
    return fs.createReadStream(file).pipe(res);
  }

  const file = url.pathname === '/' ? 'index.html' : path.basename(url.pathname);
  const fp = path.join(PUBLIC, file);
  if (fs.existsSync(fp)) {
    const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': types[path.extname(fp)] || 'application/octet-stream' });
    return fs.createReadStream(fp).pipe(res);
  }
  res.writeHead(404);
  res.end('not found');
});

// Local app hai — koi unexpected fs/spawn error poori queue na le doobe.
// (Downloads folder user ke control mein hai, kabhi bhi gayab ho sakta hai.)
process.on('uncaughtException', e => console.error('[warn] uncaught:', (e && e.message) || e));
process.on('unhandledRejection', e => console.error('[warn] unhandled:', (e && e.message) || e));

server.listen(PORT, () => {
  console.log(`Clip downloader running at http://localhost:${PORT}`);
  console.log(`Clips save location: ${DOWNLOADS}`);
});
