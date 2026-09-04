/**
 * `PhotoPort` — the browser half. ARCHITECTURE §10.2 and §10.4.
 *
 * **Two of the six methods are here** (`pickImages`, `derive`, which are DOM work) and four are in
 * `ports/storage.ts` (`read`/`write`/`remove`/`present`, which are storage and must share the
 * trip database so a delete can cascade in one transaction — §10.3). `browserPhotos()` at the
 * bottom is the one object that satisfies the interface.
 *
 * **No dependency, and the reason is A-58 Part 5.** `browser-image-compression`, `pica` and
 * friends were considered as a class and refused: the mechanism is `createImageBitmap` →
 * `<canvas>` `drawImage` → `toBlob`, about sixty lines including the halving loop and the
 * orientation transform, using only APIs `apps/web` already depends on the existence of. A library
 * would buy Worker offloading and better resampling filters; neither is worth a dependency for two
 * fixed output sizes on images the user is watching import. **Trigger to reopen:** a measured
 * main-thread stall on a real device during a real multi-file import — at which point the answer
 * is likely a Worker, which is also not a dependency.
 *
 * **There is no EXIF library here either, and there is not one anywhere in this repo** (A-58).
 * Metadata is read by `core.readExif` — pure, in `packages/core`, because that is where a
 * derivation belongs and where `apps/mobile`, `services/api` and the CLI can reach the same
 * answer. And the *stripping* is not a step at all: **a canvas re-encode carries no metadata**, so
 * the derivative this file produces has no EXIF block, no GPS, no maker note and no thumbnail of
 * its own. §10.5: *"it cannot leak what it does not contain."*
 */
import type { DerivedImage, PhotoPort, PickedImage } from '@cairn/client';
import { readExif } from '@cairn/core';
import { indexedDbPhotoBytes } from './storage.ts';

/** §10.4's table, and neither number is a preference. */
const THUMB_LONG_EDGE = 320;
const DISPLAY_LONG_EDGE = 1600;
const THUMB_QUALITY = 0.72;
const DISPLAY_QUALITY = 0.82;

/**
 * The multi-file picker. `<input type=file multiple accept="image/*">`, for exactly the reason
 * `ports/file.ts`'s own header gives — the File System Access API is Chromium-only and Safari
 * supports only the Origin Private File System (§1.1).
 *
 * Deliberately built the same way `FilePort.importDoc` is, down to the `cancel`-plus-`settled`
 * guard: `cancel` is not universally fired, and a picker that never resolves is a spinner that
 * never resolves, which is the dishonest state §10.6 exists to stop.
 *
 * Impure: touches the DOM.
 */
export function pickImages(): Promise<PickedImage[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    // iOS Safari converts HEIC to JPEG at this boundary whatever `accept` says, and the EXIF
    // block does not survive that conversion — A-58 Part 2. `image/*` is honest about what we
    // want; it is not a guarantee about what arrives, which is why `derive` may still say `null`.
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    let settled = false;
    const done = (v: PickedImage[] | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(v);
    };
    input.onchange = async () => {
      const files = Array.from(input.files ?? []);
      if (files.length === 0) return done(null);
      const out: PickedImage[] = [];
      for (const f of files) {
        out.push({ name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) });
      }
      done(out);
    };
    input.oncancel = () => done(null);
    input.click();
  });
}

type Decoded = { source: CanvasImageSource; w: number; h: number; release: () => void };

/**
 * Decodes to something `drawImage` accepts, or `null`.
 *
 * `createImageBitmap` when present; otherwise an `HTMLImageElement` over an object URL with
 * `await img.decode()`. **Both are here, behind the port, so the fallback costs nothing above
 * it** (§10.4 step 1). The object URL, if one was made, is revoked by `release()`.
 */
async function decode(bytes: Uint8Array, type: string): Promise<Decoded | null> {
  const blob = new Blob([bytes as BlobPart], { type: type || 'image/jpeg' });
  if (typeof createImageBitmap === 'function') {
    try {
      // NOTE: no `resizeWidth`/`resizeHeight`/`resizeQuality`. Those options are **not supported
      // in Safari** (§10.4, verified 2026-09-03), which is the platform fact that decides the
      // whole downscale strategy: the resize is `drawImage` onto a canvas, which is universal.
      const bitmap = await createImageBitmap(blob);
      return { source: bitmap, w: bitmap.width, h: bitmap.height, release: () => bitmap.close() };
    } catch {
      /* fall through to the <img> path — a codec one API refuses, the other may accept */
    }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) {
    URL.revokeObjectURL(url);
    return null;
  }
  return { source: img, w, h, release: () => URL.revokeObjectURL(url) };
}

/** Whether an EXIF orientation swaps the axes. 5–8 are the transposed quarter-turns. */
const swapsAxes = (o: number) => o >= 5 && o <= 8;

/**
 * §10.4 step 4 — **the EXIF orientation is baked into the canvas transform**, so the stored
 * derivative is upright and no consumer ever needs to know the tag exists. `null` (and anything
 * outside 1–8) means 1.
 *
 * The eight cases are the standard TIFF ones. The canvas is already sized to the FINAL,
 * post-rotation dimensions, so the transform is expressed in those.
 */
function applyOrientation(ctx: CanvasRenderingContext2D, o: number, w: number, h: number): void {
  switch (o) {
    case 2: ctx.transform(-1, 0, 0, 1, w, 0); break;            // mirror horizontal
    case 3: ctx.transform(-1, 0, 0, -1, w, h); break;           // 180°
    case 4: ctx.transform(1, 0, 0, -1, 0, h); break;            // mirror vertical
    case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;             // transpose
    case 6: ctx.transform(0, 1, -1, 0, w, 0); break;            // 90° clockwise
    case 7: ctx.transform(0, -1, -1, 0, w, h); break;           // transverse
    case 8: ctx.transform(0, -1, 1, 0, 0, h); break;            // 90° counter-clockwise
    default: break;                                             // 1 — nothing to do
  }
}

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(w));
  canvas.height = Math.max(1, Math.round(h));
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', quality));
}

/**
 * §10.4 step 2 — **halve repeatedly until within 2× of the target, then one final `drawImage`.**
 *
 * A single large-ratio `drawImage` aliases badly: browsers use a cheap filter for big
 * downscales, so a 4032 px source drawn straight into a 320 px box loses fine detail to
 * point-sampling artefacts. Halving is the standard mitigation, it is about fifteen lines, and it
 * needs no dependency. Each halving step is itself a ≤2× reduction, which the browser's own
 * filter handles well.
 *
 * The **orientation transform is applied once, on the final canvas** — never on the intermediates,
 * where it would rotate the working image repeatedly and change what "long edge" means mid-loop.
 */
function downscale(
  decoded: Decoded,
  longEdge: number,
  orientation: number,
): { canvas: HTMLCanvasElement; w: number; h: number } | null {
  // Dimensions AFTER orientation, because that is what the user will see and what the long-edge
  // cap is about.
  const srcW = swapsAxes(orientation) ? decoded.h : decoded.w;
  const srcH = swapsAxes(orientation) ? decoded.w : decoded.h;
  const scale = Math.min(1, longEdge / Math.max(srcW, srcH));
  const outW = Math.max(1, Math.round(srcW * scale));
  const outH = Math.max(1, Math.round(srcH * scale));

  // The halving loop runs in the SOURCE's own axes; only the last draw rotates.
  let current: CanvasImageSource = decoded.source;
  let curW = decoded.w;
  let curH = decoded.h;
  // The target in source axes — the loop must not halve past it.
  const targetW = swapsAxes(orientation) ? outH : outW;
  const targetH = swapsAxes(orientation) ? outW : outH;
  // A hard bound as well as a convergence condition: a pathological w/h can only halve so many
  // times before it reaches 1, and an unbounded loop over user-supplied dimensions is a defect
  // class rather than a bug.
  for (let step = 0; step < 16; step++) {
    if (curW <= targetW * 2 && curH <= targetH * 2) break;
    const nextW = Math.max(targetW, Math.round(curW / 2));
    const nextH = Math.max(targetH, Math.round(curH / 2));
    const half = makeCanvas(nextW, nextH);
    if (!half) return null;
    half.ctx.drawImage(current, 0, 0, nextW, nextH);
    current = half.canvas;
    curW = nextW;
    curH = nextH;
  }

  const final = makeCanvas(outW, outH);
  if (!final) return null;
  applyOrientation(final.ctx, orientation, outW, outH);
  // After the transform the drawing space is in pre-rotation axes, so the destination box is
  // (targetW, targetH) — which equals (outW, outH) when the orientation does not swap.
  final.ctx.drawImage(current, 0, 0, targetW, targetH);
  return { canvas: final.canvas, w: outW, h: outH };
}

/**
 * §10.4, end to end: decode → halving downscale ×2 → `toBlob('image/jpeg', q)` → `arrayBuffer()`.
 *
 * **`null` when the platform cannot decode the bytes at all — an answer, not a throw** (§10.2).
 * The import saga turns it into a named, reported `'decode_failed'` for that one file and carries
 * on to the next: *"one bad file does not fail an import."*
 *
 * **The orientation is read here, by calling core's `readExif`** — the same function the import
 * saga calls for the date and the coordinate, not a second implementation of the parse (A-58 Part
 * 3's line is about implementations, not invocations). §10.2 fixes `derive`'s signature at
 * `(bytes, type)` and it is not this file's to widen, so the tag is fetched rather than threaded;
 * the cost is one more pass of bounded byte arithmetic over a ≤64 KiB APP1 segment, which is
 * nothing beside a full image decode. The optional third parameter exists only so a test can pin
 * an orientation without constructing an EXIF block.
 *
 * **The property that falls out of `toBlob` for free is the whole of §10.5's mechanism: a canvas
 * re-encode carries no metadata.** There is no stripping step because there is nothing to strip.
 *
 * Impure: allocates canvases and object URLs, and releases both before it returns.
 */
export async function derive(bytes: Uint8Array, type: string, orientation?: number): Promise<DerivedImage | null> {
  // `readExif` is pure, total and bounded: it never throws, for any byte sequence, so this cannot
  // fail an import on its own. `null` orientation means 1 (§10.4 step 4).
  const tag = orientation ?? readExif(bytes).orientation ?? 1;
  const decoded = await decode(bytes, type);
  if (!decoded) return null;
  const o = Number.isInteger(tag) && tag >= 1 && tag <= 8 ? tag : 1;
  try {
    const thumb = downscale(decoded, THUMB_LONG_EDGE, o);
    const display = downscale(decoded, DISPLAY_LONG_EDGE, o);
    if (!thumb || !display) return null;
    const [thumbBlob, displayBlob] = await Promise.all([
      toBlob(thumb.canvas, THUMB_QUALITY),
      toBlob(display.canvas, DISPLAY_QUALITY),
    ]);
    if (!thumbBlob || !displayBlob) return null;
    return {
      source: swapsAxes(o) ? { w: decoded.h, h: decoded.w } : { w: decoded.w, h: decoded.h },
      thumb: { bytes: new Uint8Array(await thumbBlob.arrayBuffer()), w: thumb.w, h: thumb.h },
      display: { bytes: new Uint8Array(await displayBlob.arrayBuffer()), w: display.w, h: display.h },
    };
  } catch {
    // A canvas that will not draw, a `toBlob` that will not encode: both are "the platform said
    // no", which is `null`. §10.2 is explicit that this may not be a throw.
    return null;
  } finally {
    decoded.release();
  }
}

/**
 * The whole `PhotoPort`: the two DOM methods from this file and the four storage methods from
 * `ports/storage.ts`, which share the trip database so a delete cascades in one transaction.
 *
 * `derive` is exposed with exactly the two-argument signature §10.2 fixes; it reads the EXIF
 * orientation itself, so a rotated photograph is stored upright and no consumer needs to know the
 * tag exists.
 */
export function browserPhotos(): PhotoPort {
  return {
    pickImages,
    derive: (bytes, type) => derive(bytes, type),
    ...indexedDbPhotoBytes(),
  };
}
