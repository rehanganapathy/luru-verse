#!/usr/bin/env node
/**
 * Image -> ASCII plate, for the landing hero.
 *
 * Written rather than pasted so the art is a build input you can re-tune, not
 * a blob nobody can regenerate. Run it twice — once wide, once narrow — and
 * the landing swaps between them at 40rem, because one render scaled down to
 * phone width stops resolving detail long before the layout stops shrinking.
 *
 *   node scripts/asciify.mjs photo.jpg --cols 150 --out lib/ascii.wide.txt
 *   node scripts/asciify.mjs photo.jpg --cols 64  --out lib/ascii.narrow.txt
 *
 * Flags
 *   --cols N      character columns (default 140)
 *   --out PATH    where to write; omit to print to stdout
 *   --invert      flip the ramp, for light subjects on dark ground
 *   --contrast N  1.0 = untouched, 1.4 is a good starting push (default 1.15)
 *   --ramp NAME   dense | soft | blocks   (default dense)
 *   --trim        drop uniform blank rows/columns at the edges
 *   --crop L,T,R,B  crop as fractions of width/height, e.g. 0,0.32,1,1 keeps
 *                   the bottom two-thirds. Most photographs are mostly sky,
 *                   and sky spends character cells saying nothing.
 *   --gamma N     <1 lifts the midtones, >1 crushes them (default 1)
 *   --channel C   luma | warmth  (default luma)
 *                 `warmth` maps R-B instead of brightness. For a sunlit
 *                 building against a blue sky this is the difference between
 *                 a picture and a smudge: warm stone is often BRIGHTER than
 *                 the sky, so a luminance ramp fills the sky with mid-density
 *                 noise and no amount of contrast separates them. Warmth puts
 *                 the two on opposite ends of the scale, where they belong.
 *
 * No dependencies: PNG and JPEG are decoded here. That keeps the repo at four
 * production packages, which is a claim the README makes.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const RAMPS = {
  // Ordered lightest -> darkest. The plate is dark ink on light paper, so the
  // ramp is applied inverted by default: bright pixels get the sparse glyphs.
  dense: " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  soft: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const has = (name) => process.argv.includes(`--${name}`)

const src = process.argv[2]
if (!src || src.startsWith('--')) {
  console.error('usage: node scripts/asciify.mjs <image> [--cols 140] [--out path]')
  process.exit(1)
}

const cols = Number(arg('cols', 140))
const contrast = Number(arg('contrast', 1.15))
const ramp = RAMPS[arg('ramp', 'dense')] ?? RAMPS.dense
const gamma = Number(arg('gamma', 1))
const out = arg('out', null)

/**
 * A monospace cell is roughly twice as tall as it is wide, so sampling on a
 * square grid stretches the picture vertically by 2x. Every ASCII converter
 * that forgets this produces something tall and wrong.
 */
const CELL_ASPECT = 2.05

// --- decode ----------------------------------------------------------------
// macOS ships sips, which reads everything a phone can produce (HEIC included)
// and can hand back raw RGB via a BMP. Falls back to a bundled PNG decoder.

function decode(path) {
  try {
    const tmp = join(tmpdir(), `asciify-${Date.now()}.png`)
    execFileSync('sips', ['-s', 'format', 'png', path, '--out', tmp], {
      stdio: 'ignore',
    })
    return decodePng(readFileSync(tmp))
  } catch {
    return decodePng(readFileSync(path))
  }
}

function decodePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) {
    throw new Error(
      'Could not decode this file. Convert it to PNG first, or run on macOS where sips handles it.',
    )
  }
  const zlib = require('node:zlib')
  let pos = 8
  let width = 0
  let height = 0
  let bitDepth = 8
  let colorType = 6
  const idat = []
  let palette = null
  let trns = null

  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos)
    const type = buf.toString('ascii', pos + 4, pos + 8)
    const data = buf.subarray(pos + 8, pos + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      bitDepth = data[8]
      colorType = data[9]
    } else if (type === 'PLTE') palette = data
    else if (type === 'tRNS') trns = data
    else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    pos += 12 + len
  }
  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth ${bitDepth}`)

  const raw = zlib.inflateSync(Buffer.concat(idat))
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType]
  if (!channels) throw new Error(`Unsupported PNG colour type ${colorType}`)

  const stride = width * channels
  const px = Buffer.alloc(height * stride)
  let rp = 0
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++]
    const line = raw.subarray(rp, rp + stride)
    rp += stride
    const cur = px.subarray(y * stride, (y + 1) * stride)
    const prev = y > 0 ? px.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? cur[x - channels] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= channels ? prev[x - channels] : 0
      let v = line[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += (a + b) >> 1
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      cur[x] = v & 0xff
    }
  }

  // -> straight RGB, composited onto white so transparent regions read as
  // paper rather than as the darkest thing in the picture.
  const rgb = new Float32Array(width * height * 3)
  for (let i = 0; i < width * height; i++) {
    let r, g, b, a = 255
    if (colorType === 3) {
      const idx = px[i] * 3
      r = palette[idx]; g = palette[idx + 1]; b = palette[idx + 2]
      if (trns && px[i] < trns.length) a = trns[px[i]]
    } else if (channels === 1) { r = g = b = px[i] }
    else if (channels === 2) { r = g = b = px[i * 2]; a = px[i * 2 + 1] }
    else {
      r = px[i * channels]; g = px[i * channels + 1]; b = px[i * channels + 2]
      if (channels === 4) a = px[i * channels + 3]
    }
    const k = a / 255
    rgb[i * 3] = (r / 255) * k + (1 - k)
    rgb[i * 3 + 1] = (g / 255) * k + (1 - k)
    rgb[i * 3 + 2] = (b / 255) * k + (1 - k)
  }
  return { width, height, rgb }
}

/** Collapse RGB to the single 0..1 field the ramp will be applied to. */
function toField({ width, height, rgb }, mode) {
  const f = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const r = rgb[i * 3], g = rgb[i * 3 + 1], b = rgb[i * 3 + 2]
    f[i] =
      mode === 'warmth'
        ? (r - b + 1) / 2 // -1..1 -> 0..1
        : 0.2126 * r + 0.7152 * g + 0.0722 * b
  }
  return { width, height, lum: f }
}

const { createRequire } = await import('node:module')
const require = createRequire(import.meta.url)

// --- sample ----------------------------------------------------------------

const full = toField(decode(src), arg('channel', 'luma'))

/** Crop first, so every later stage works on the picture you actually want. */
const img = (() => {
  const spec = arg('crop', null)
  if (!spec) return full
  const [l, t, r, b] = spec.split(',').map(Number)
  const x0 = Math.round(l * full.width)
  const y0 = Math.round(t * full.height)
  const w = Math.max(1, Math.round(r * full.width) - x0)
  const h = Math.max(1, Math.round(b * full.height) - y0)
  const lum = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      lum[y * w + x] = full.lum[(y + y0) * full.width + (x + x0)]
  return { width: w, height: h, lum }
})()

const rows = Math.max(1, Math.round((img.height / img.width) * cols / CELL_ASPECT))

// Box-average every source pixel that falls in a cell, rather than point
// sampling: at these reduction ratios point sampling turns fine detail into
// noise that reads as dirt on the plate.
const cells = new Float32Array(cols * rows)
for (let cy = 0; cy < rows; cy++) {
  const y0 = Math.floor((cy / rows) * img.height)
  const y1 = Math.max(y0 + 1, Math.floor(((cy + 1) / rows) * img.height))
  for (let cx = 0; cx < cols; cx++) {
    const x0 = Math.floor((cx / cols) * img.width)
    const x1 = Math.max(x0 + 1, Math.floor(((cx + 1) / cols) * img.width))
    let sum = 0
    let n = 0
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++) { sum += img.lum[y * img.width + x]; n++ }
    cells[cy * cols + cx] = sum / n
  }
}

// Normalise to the picture's own range, then push contrast around the midpoint.
let lo = Infinity, hi = -Infinity
for (const v of cells) { if (v < lo) lo = v; if (v > hi) hi = v }
const span = Math.max(1e-6, hi - lo)

let text = ''
for (let cy = 0; cy < rows; cy++) {
  let line = ''
  for (let cx = 0; cx < cols; cx++) {
    let v = (cells[cy * cols + cx] - lo) / span
    v = Math.min(1, Math.max(0, (v - 0.5) * contrast + 0.5))
    if (gamma !== 1) v = Math.pow(v, gamma)
    if (!has('invert')) v = 1 - v
    line += ramp[Math.min(ramp.length - 1, Math.round(v * (ramp.length - 1)))]
  }
  text += line.replace(/\s+$/, '') + '\n'
}

if (has('trim')) {
  const lines = text.split('\n')
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  const indent = Math.min(
    ...lines.filter((l) => l.trim()).map((l) => l.length - l.trimStart().length),
  )
  text = lines.map((l) => l.slice(indent)).join('\n')
}

if (out && out.endsWith('.ts')) {
  // Emit a module rather than a .txt, so the art is importable from a client
  // component without a loader and without a filesystem read at request time.
  // JSON.stringify does the escaping — the dense ramp contains backticks,
  // backslashes and dollar signs, so a template literal here would be a
  // quoting bug waiting to happen.
  const which = arg('name', 'ART')
  const prev = (() => {
    try { return readFileSync(out, 'utf8') } catch { return '' }
  })()
  const line = `export const ${which} = ${JSON.stringify(text)}\n`
  const re = new RegExp(`^export const ${which} = .*$`, 'm')
  const header = `// GENERATED by scripts/asciify.mjs — do not hand-edit.\n// Re-run the command in the landing hero's comment to replace the picture.\n`
  // NOTE the replacer FUNCTION. Passing the string directly corrupts the art:
  // `$` is special in a replacement pattern ($&, $1, $$ ...) and this picture
  // is mostly dollar signs. A function replacer is taken literally.
  const body = re.test(prev)
    ? prev.replace(re, () => line.trimEnd())
    : (prev || header) + line
  writeFileSync(out, body.startsWith('//') ? body : header + body)
  console.error(`${cols}×${rows} cells -> ${out} (${which})`)
} else if (out) {
  writeFileSync(out, text)
  console.error(`${cols}×${rows} cells -> ${out}`)
} else {
  process.stdout.write(text)
}
