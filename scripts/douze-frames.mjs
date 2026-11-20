#!/usr/bin/env node
/**
 * Frame tools for recreating a broadcast douze points animation as a spec
 * (the add-douze-animation skill; docs/theme-animations-and-specifics.md §10).
 * Needs ffmpeg and ffprobe on PATH. Frame numbers are 0-based (ffmpeg's `n`),
 * crops are W:H:X:Y in the video's own pixels.
 *
 *   node scripts/douze-frames.mjs frame <video> <n> <out.png>
 *       One whole frame, to find the row's crop.
 *
 *   node scripts/douze-frames.mjs sheet <video> --crop W:H:X:Y
 *       [--from 0] [--count 45] [--rows 15] <out-prefix>
 *       Contact sheets of consecutive cropped frames, each labelled with its
 *       n and ms from the clip's start: <out-prefix>_1.png, _2.png, ... For
 *       finding t0 (the first frame that changes) and reading the motion.
 *
 *   node scripts/douze-frames.mjs ref <video> --crop W:H:X:Y --t0 <n>
 *       [--step 100] [--from 0] [--to 1500] <out-prefix>
 *       The frame on screen at each lab strip time t (frame t0 + t·fps),
 *       labelled with t: <out-prefix>_0000.png, _0100.png, ...
 *
 *   node scripts/douze-frames.mjs compare <screenshot.png> <rects.json>
 *       <ref-prefix> <out.png> [--height 120] [--dpr 2]
 *       Every lab strip row cut from a full-page screenshot of
 *       /dev/douze-lab, to the right of the reference frame at the same t,
 *       one pair per line. rects.json holds what the lab's rect snippet
 *       returns ({ dpr, rows: [{ t, x, y, w, h }] }); any text containing
 *       that JSON works, so a pasted tool result is fine.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Room around each lab row, in CSS px: glows and rays spill past the row. */
const ROW_PAD = 10;

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const run = (bin, args) =>
  execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString();

const ffmpeg = (args) => run('ffmpeg', ['-v', 'error', '-y', ...args]);

const probe = (file, entries) =>
  run('ffprobe', [
    '-v',
    'error',
    '-select_streams',
    'v:0',
    '-show_entries',
    `stream=${entries}`,
    '-of',
    'csv=p=0',
    file,
  ])
    .trim()
    .split(',');

const parseArgs = (argv) => {
  const positional = [];
  const flags = {};

  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      flags[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }

  return { positional, flags };
};

const number = (value, fallback) => {
  if (value === undefined) return fallback;

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) fail(`Not a number: ${value}`);

  return parsed;
};

const cropOf = (flags) => {
  if (!/^\d+:\d+:\d+:\d+$/.test(flags.crop ?? '')) {
    fail('--crop W:H:X:Y (in the video’s pixels) is required');
  }

  return flags.crop;
};

const frameRate = (video) => {
  const [num, den] = probe(video, 'r_frame_rate')[0].split('/').map(Number);

  return num / (den || 1);
};

const ensureDir = (file) =>
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });

const label = (text) =>
  `drawtext=text='${text}':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.8`;

const pad4 = (value) => String(Math.round(value)).padStart(4, '0');

const commands = {
  frame([video, n, out]) {
    if (!video || n === undefined || !out) fail('frame <video> <n> <out.png>');
    ensureDir(out);
    ffmpeg([
      '-i',
      video,
      '-vf',
      `select=eq(n\\,${number(n)})`,
      '-frames:v',
      '1',
      '-fps_mode',
      'passthrough',
      out,
    ]);
    console.log(out);
  },

  sheet([video, prefix], flags) {
    if (!video || !prefix) fail('sheet <video> --crop W:H:X:Y <out-prefix>');

    const from = number(flags.from, 0);
    const count = number(flags.count, 45);
    const rows = number(flags.rows, 15);

    ensureDir(prefix);
    ffmpeg([
      '-i',
      video,
      '-vf',
      [
        `crop=${cropOf(flags)}`,
        label('n=%{frame_num}  %{eif\\:t*1000\\:d} ms'),
        `select=between(n\\,${from}\\,${from + count - 1})`,
        `tile=1x${rows}`,
      ].join(','),
      '-fps_mode',
      'passthrough',
      `${prefix}_%d.png`,
    ]);
    console.log(`${prefix}_1.png … (${Math.ceil(count / rows)} sheets)`);
  },

  ref([video, prefix], flags) {
    if (!video || !prefix || flags.t0 === undefined) {
      fail('ref <video> --crop W:H:X:Y --t0 <n> <out-prefix>');
    }

    const crop = cropOf(flags);
    const fps = frameRate(video);
    const t0 = number(flags.t0);
    const step = number(flags.step, 100);
    const from = number(flags.from, 0);
    const to = number(flags.to, 1500);

    ensureDir(prefix);
    for (let t = from; t <= to; t += step) {
      const n = t0 + Math.round((t / 1000) * fps);

      ffmpeg([
        '-i',
        video,
        '-vf',
        `select=eq(n\\,${n}),crop=${crop},${label(`${Math.round(t)}`)}`,
        '-frames:v',
        '1',
        '-fps_mode',
        'passthrough',
        `${prefix}_${pad4(t)}.png`,
      ]);
    }
    console.log(`${prefix}_${pad4(from)}.png … ${prefix}_${pad4(to)}.png`);
  },

  compare([shot, rectsFile, refPrefix, out], flags) {
    if (!shot || !rectsFile || !refPrefix || !out) {
      fail('compare <screenshot.png> <rects.json> <ref-prefix> <out.png>');
    }

    const rects = readRects(rectsFile);
    const dpr = number(flags.dpr, rects.dpr ?? 2);
    const height = number(flags.height, 120);
    const [shotW, shotH] = probe(shot, 'width,height').map(Number);
    const rows = rects.rows.filter((row) => {
      const exists = fs.existsSync(`${refPrefix}_${pad4(row.t)}.png`);

      if (!exists) console.warn(`No reference frame for ${row.t} ms, skipped`);

      return exists;
    });

    if (rows.length === 0) fail('No lab row has a reference frame');

    const crops = rows.map((row) => {
      const x = Math.max(0, Math.round((row.x - ROW_PAD) * dpr));
      const y = Math.max(0, Math.round((row.y - ROW_PAD) * dpr));
      const w = Math.min(shotW - x, Math.round((row.w + 2 * ROW_PAD) * dpr));
      const h = Math.min(shotH - y, Math.round((row.h + 2 * ROW_PAD) * dpr));

      if (w <= 0 || h <= 0) {
        fail(`Row ${row.t} ms is outside the screenshot: use a full-page one`);
      }

      return { x, y, w, h };
    });
    // One size for every pair, so they stack.
    const labW = Math.round(((crops[0].w / crops[0].h) * height) / 2) * 2;
    const n = rows.length;
    const graph = [
      `[0]split=${n}${rows.map((_, i) => `[s${i}]`).join('')}`,
      ...rows.flatMap((_, i) => {
        const { x, y, w, h } = crops[i];

        return [
          `[s${i}]crop=${w}:${h}:${x}:${y},scale=${labW}:${height}[l${i}]`,
          `[${i + 1}]scale=-2:${height},pad=iw+12:ih:0:0:black[r${i}]`,
          `[r${i}][l${i}]hstack[p${i}]`,
        ];
      }),
      n > 1
        ? `${rows.map((_, i) => `[p${i}]`).join('')}vstack=inputs=${n}[out]`
        : '[p0]null[out]',
    ].join(';');

    ensureDir(out);
    ffmpeg([
      '-i',
      shot,
      ...rows.flatMap((row) => ['-i', `${refPrefix}_${pad4(row.t)}.png`]),
      '-filter_complex',
      graph,
      '-map',
      '[out]',
      '-frames:v',
      '1',
      out,
    ]);
    console.log(`${out} (${n} rows: reference left, lab right)`);
  },
};

/**
 * The rects JSON, from a file that may also hold other text (a pasted tool
 * result) or the JSON encoded as a string. A bare array of rows is accepted.
 */
function readRects(file) {
  const text = fs.readFileSync(file, 'utf8');
  const attempts = [text];
  const start = text.search(/[[{]/);
  const end = Math.max(text.lastIndexOf('}'), text.lastIndexOf(']'));

  if (start >= 0 && end > start) attempts.push(text.slice(start, end + 1));

  for (const attempt of attempts) {
    try {
      let value = JSON.parse(attempt);

      if (typeof value === 'string') value = JSON.parse(value);
      if (Array.isArray(value)) return { rows: value };
      if (value && Array.isArray(value.rows)) return value;
    } catch {
      // try the next reading
    }
  }

  return fail(`No rects JSON in ${file}`);
}

const [command, ...rest] = process.argv.slice(2);
const { positional, flags } = parseArgs(rest);

if (!commands[command]) {
  fail(
    'Usage: node scripts/douze-frames.mjs frame|sheet|ref|compare … (see the header)',
  );
}

commands[command](positional, flags);
