import { Assets, Spritesheet, type SpritesheetData, type Texture } from 'pixi.js';
import atlasData from './generated/atlas.json';
import atlasUrl from './generated/atlas.png';

/** The loaded sprite atlas. A wrong frame name is an error, not an empty sprite. */
export class Art {
  private readonly sheet: Spritesheet;

  constructor(sheet: Spritesheet) {
    this.sheet = sheet;
  }

  frame(name: string): Texture {
    const texture = this.sheet.textures[name];
    if (!texture) throw new Error(`atlas has no frame "${name}"`);
    return texture;
  }

  animation(name: string): Texture[] {
    const frames = this.sheet.animations[name];
    if (!frames) throw new Error(`atlas has no animation "${name}"`);
    return frames;
  }
}

export async function loadArt(): Promise<Art> {
  const texture = await Assets.load<Texture>(atlasUrl);
  texture.source.scaleMode = 'nearest';
  const sheet = new Spritesheet(texture, atlasData as unknown as SpritesheetData);
  await sheet.parse();
  return new Art(sheet);
}
