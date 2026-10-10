import type { Texture } from 'pixi.js';

/** Draws an atlas frame (an item icon, 16 x 16) into a canvas at `scale`, sharp (no smoothing). */
export function drawIcon(canvas: HTMLCanvasElement, texture: Texture, scale = 2): void {
  const { x, y, width, height } = texture.frame;
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.drawImage(texture.source.resource as CanvasImageSource, x, y, width, height, 0, 0, canvas.width, canvas.height);
}
