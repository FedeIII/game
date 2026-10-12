import { Assets, Spritesheet, type SpritesheetData, type Texture } from 'pixi.js';
import atlasData from './generated/atlas.json';

/**
 * The pages of the atlas (art/build.ts): atlas.png, atlas-1.png, ..., each at most 2048 px on a side
 * (16-bit GPUs). The URL of each page file, by its name.
 */
const PAGE_URLS = Object.fromEntries(
  Object.entries(import.meta.glob('./generated/atlas*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>).map(([path, url]) => [path.split('/').pop()!, url]),
);

interface AtlasMeta {
  readonly pages?: readonly { readonly image: string; readonly size: { readonly w: number; readonly h: number } }[];
}

/** The loaded sprite atlas, all its pages together. A wrong frame name is an error, not an empty sprite. */
export class Art {
  private readonly textures: Readonly<Record<string, Texture>>;
  private readonly animations: Readonly<Record<string, readonly string[]>>;

  constructor(textures: Readonly<Record<string, Texture>>, animations: Readonly<Record<string, readonly string[]>>) {
    this.textures = textures;
    this.animations = animations;
  }

  frame(name: string): Texture {
    const texture = this.textures[name];
    if (!texture) throw new Error(`atlas has no frame "${name}"`);
    return texture;
  }

  /** The frame, or null if the atlas has no frame with that name (a glyph that the font lacks). */
  tryFrame(name: string): Texture | null {
    return this.textures[name] ?? null;
  }

  /**
   * All frames named `${prefix}/0`, `${prefix}/1`, ... in order. The atlas decides how many
   * variants there are, so the art can add one without a code change.
   */
  variants(prefix: string): Texture[] {
    const textures: Texture[] = [];
    for (let i = 0; this.textures[`${prefix}/${i}`]; i++) textures.push(this.textures[`${prefix}/${i}`]!);
    if (textures.length === 0) throw new Error(`atlas has no frames "${prefix}/0", "${prefix}/1", ...`);
    return textures;
  }

  animation(name: string): Texture[] {
    const frames = this.animations[name];
    if (!frames) throw new Error(`atlas has no animation "${name}"`);
    return frames.map((frame) => this.frame(frame));
  }
}

/** Loads every page of the atlas, and its frames: a spritesheet for each page. */
export async function loadArt(): Promise<Art> {
  const data = atlasData as unknown as SpritesheetData & { frames: Record<string, { page?: number }>; animations: Record<string, string[]> };
  const pages = (data.meta as AtlasMeta).pages ?? [{ image: 'atlas.png', size: data.meta.size! }];
  const textures: Record<string, Texture> = {};
  await Promise.all(
    pages.map(async (page, i) => {
      const url = PAGE_URLS[page.image];
      if (!url) throw new Error(`no file for the atlas page ${page.image}`);
      const texture = await Assets.load<Texture>(url);
      texture.source.scaleMode = 'nearest';
      const frames = Object.fromEntries(Object.entries(data.frames).filter(([, f]) => (f.page ?? 0) === i));
      const sheet = new Spritesheet(texture, { frames, meta: { ...data.meta, image: page.image, size: page.size } } as SpritesheetData);
      Object.assign(textures, await sheet.parse());
    }),
  );
  return new Art(textures, data.animations);
}
