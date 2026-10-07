import { crc32, deflateSync } from 'node:zlib';

/** An RGBA image in memory. The art scripts draw into it and then save it as a PNG. */
export class Image {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  /** Writes one pixel. The colour is 0xRRGGBBAA. Pixels outside the image are ignored. */
  set(x: number, y: number, rgba: number): void {
    if (!this.inside(x, y)) return;
    const i = (y * this.width + x) * 4;
    this.data[i] = (rgba >>> 24) & 0xff;
    this.data[i + 1] = (rgba >>> 16) & 0xff;
    this.data[i + 2] = (rgba >>> 8) & 0xff;
    this.data[i + 3] = rgba & 0xff;
  }

  /** Reads one pixel as 0xRRGGBBAA. Pixels outside the image are transparent. */
  get(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    const i = (y * this.width + x) * 4;
    return ((this.data[i]! << 24) | (this.data[i + 1]! << 16) | (this.data[i + 2]! << 8) | this.data[i + 3]!) >>> 0;
  }

  /** Copies another image into this one. Transparent source pixels are skipped. */
  draw(source: Image, dx: number, dy: number): void {
    for (let y = 0; y < source.height; y++) {
      for (let x = 0; x < source.width; x++) {
        const rgba = source.get(x, y);
        if ((rgba & 0xff) !== 0) this.set(dx + x, dy + y, rgba);
      }
    }
  }
}

function pngChunk(type: string, body: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + body.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, body.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(body, 8);
  view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
  return out;
}

/** Encodes an image as a PNG file (8-bit RGBA, no filter). */
export function encodePng(image: Image): Uint8Array {
  const header = new Uint8Array(13);
  const view = new DataView(header.buffer);
  view.setUint32(0, image.width);
  view.setUint32(4, image.height);
  header.set([8, 6, 0, 0, 0], 8); // bit depth 8, colour type RGBA

  const stride = image.width * 4;
  const raw = new Uint8Array((stride + 1) * image.height);
  for (let y = 0; y < image.height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    raw.set(image.data.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', new Uint8Array(0)),
  ];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) {
    png.set(part, offset);
    offset += part.length;
  }
  return png;
}

/** Makes a copy that is `factor` times larger, with hard pixel edges. For previews only. */
export function upscale(image: Image, factor: number): Image {
  const out = new Image(image.width * factor, image.height * factor);
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      out.set(x, y, image.get(Math.floor(x / factor), Math.floor(y / factor)));
    }
  }
  return out;
}
