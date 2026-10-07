import { TILE_SIZE } from './constants.ts';
import { PLAYER_HALF_HEIGHT, PLAYER_HALF_WIDTH, type PlayerState } from './player.ts';
import { Decor, type TileMap } from './world.ts';

/** The things that a player can examine. */
export type Examinable = 'tree' | 'rock';

export interface InteractionTarget {
  readonly kind: Examinable;
  readonly tx: number;
  readonly ty: number;
  /** Pixels between the player's feet hitbox and the solid box of the target. */
  readonly distance: number;
}

/**
 * How close the player must be to act on a thing: the gap between the feet hitbox and the solid
 * box of the thing, in world pixels. "Very close": about a third of a tile.
 */
export const INTERACT_RANGE = 6;

const EXAMINABLE: Partial<Record<Decor, Examinable>> = {
  [Decor.Tree]: 'tree',
  [Decor.Rock]: 'rock',
};

/** Whether the target is on the side that the player faces. Breaks ties between targets. */
function inFront(player: PlayerState, cx: number, cy: number): boolean {
  switch (player.facing) {
    case 'up':
      return cy < player.y;
    case 'down':
      return cy > player.y;
    case 'left':
      return cx < player.x;
    case 'right':
      return cx > player.x;
  }
}

/**
 * Finds the thing that the player can act on now: the nearest examinable thing in range,
 * preferring one in front of the player. This is shared code: the server will use the same rule
 * to check an action that a client sends.
 */
export function findInteraction(world: TileMap, player: PlayerState): InteractionTarget | null {
  const left = player.x - PLAYER_HALF_WIDTH;
  const right = player.x + PLAYER_HALF_WIDTH;
  const top = player.y - PLAYER_HALF_HEIGHT;
  const bottom = player.y + PLAYER_HALF_HEIGHT;
  const tx0 = Math.floor((left - INTERACT_RANGE) / TILE_SIZE);
  const tx1 = Math.floor((right + INTERACT_RANGE) / TILE_SIZE);
  const ty0 = Math.floor((top - INTERACT_RANGE) / TILE_SIZE);
  const ty1 = Math.floor((bottom + INTERACT_RANGE) / TILE_SIZE);

  let best: InteractionTarget | null = null;
  let bestScore = Infinity;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const kind = EXAMINABLE[world.decor(tx, ty)];
      const box = kind ? world.solidBox(tx, ty) : null;
      if (!kind || !box) continue;
      const bx0 = tx * TILE_SIZE + box[0];
      const by0 = ty * TILE_SIZE + box[1];
      const bx1 = tx * TILE_SIZE + box[2];
      const by1 = ty * TILE_SIZE + box[3];
      const dx = Math.max(bx0 - right, 0, left - bx1);
      const dy = Math.max(by0 - bottom, 0, top - by1);
      const distance = Math.hypot(dx, dy);
      if (distance > INTERACT_RANGE) continue;
      // Any target in front of the player wins over any target behind it.
      const score = distance + (inFront(player, (bx0 + bx1) / 2, (by0 + by1) / 2) ? 0 : INTERACT_RANGE);
      if (score < bestScore) {
        bestScore = score;
        best = { kind, tx, ty, distance };
      }
    }
  }
  return best;
}
