import { Structure } from './buildings.ts';
import { TILE_SIZE } from './constants.ts';
import { decodeFixture, type Fixture, type FixtureKind } from './fixtures.ts';
import { PLAYER_HALF_HEIGHT, PLAYER_HALF_WIDTH, type PlayerState } from './player.ts';
import { Decor, FULL_BOX, type Box, type TileMap } from './world.ts';

/** The things that a player can act on: decor, fixtures, and doors (which open and close). */
export type Interactable = 'tree' | 'rock' | FixtureKind | 'door';

export interface InteractionTarget {
  readonly kind: Interactable;
  /** The tile that was in range (for a fixture: one tile of its footprint). */
  readonly tx: number;
  readonly ty: number;
  /** Pixels between the player's feet hitbox and the box of the target. */
  readonly distance: number;
  /** The fixture, for a fixture target: its own content, if any. */
  readonly fixture?: Fixture;
}

/** Says whether a candidate counts: a world leaves out things that have nothing to show. */
export type AcceptTarget = (kind: Interactable, fixture: Fixture | null) => boolean;

/**
 * How close the player must be to act on a thing: the gap between the feet hitbox and the box
 * of the thing, in world pixels. "Very close": about a third of a tile.
 */
export const INTERACT_RANGE = 6;

const BY_DECOR: Partial<Record<Decor, Interactable>> = {
  [Decor.Tree]: 'tree',
  [Decor.Rock]: 'rock',
};

/** What a tile offers to act on, and the box (tile-local pixels) that the range is measured to. */
function interactableAt(world: TileMap, tx: number, ty: number): { kind: Interactable; box: Box; fixture: Fixture | null } | null {
  const structure = world.structure(tx, ty);
  // An open door has no solid box, but the player can still reach it to close it.
  if (structure === Structure.Door) return { kind: 'door', box: FULL_BOX, fixture: null };
  const decoded = decodeFixture(structure);
  // A fixture tile without a box (a rug) is not something to act on.
  if (decoded) return decoded.tile.box ? { kind: decoded.type.kind as FixtureKind, box: decoded.tile.box, fixture: world.fixtureAt(tx, ty) } : null;
  const byDecor = BY_DECOR[world.decor(tx, ty)];
  const box = byDecor ? world.solidBox(tx, ty) : null;
  return byDecor && box ? { kind: byDecor, box, fixture: null } : null;
}

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

/** Where someone's feet are: a player, or an NPC. Their feet box is the player's. */
export interface Feet {
  readonly x: number;
  readonly y: number;
}

/** The gap in pixels between the player's feet hitbox and a box on tile (tx, ty). */
function gapTo(player: Feet, tx: number, ty: number, box: Box): number {
  const dx = Math.max(tx * TILE_SIZE + box[0] - (player.x + PLAYER_HALF_WIDTH), 0, player.x - PLAYER_HALF_WIDTH - (tx * TILE_SIZE + box[2]));
  const dy = Math.max(ty * TILE_SIZE + box[1] - (player.y + PLAYER_HALF_HEIGHT), 0, player.y - PLAYER_HALF_HEIGHT - (ty * TILE_SIZE + box[3]));
  return Math.hypot(dx, dy);
}

/**
 * Something to act on that is not on the tile grid: a walking NPC. Its feet box is round (x, y),
 * `halfWidth` by `halfHeight`; `fixture` gives its kind and content, and stays the same object
 * while it moves.
 */
export interface Actor {
  readonly x: number;
  readonly y: number;
  readonly halfWidth: number;
  readonly halfHeight: number;
  readonly fixture: Fixture;
}

/**
 * Finds the thing that the player can act on now: the nearest interactable thing in range,
 * preferring one in front of the player. `accept` leaves out things that have nothing to show
 * (a door always counts). `actors` are things that move (walking NPCs). This is shared code: the
 * server can use the same rule to check an action that a client sends.
 */
export function findInteraction(
  world: TileMap,
  player: PlayerState,
  accept: AcceptTarget = () => true,
  actors: readonly Actor[] = [],
): InteractionTarget | null {
  const tx0 = Math.floor((player.x - PLAYER_HALF_WIDTH - INTERACT_RANGE) / TILE_SIZE);
  const tx1 = Math.floor((player.x + PLAYER_HALF_WIDTH + INTERACT_RANGE) / TILE_SIZE);
  const ty0 = Math.floor((player.y - PLAYER_HALF_HEIGHT - INTERACT_RANGE) / TILE_SIZE);
  const ty1 = Math.floor((player.y + PLAYER_HALF_HEIGHT + INTERACT_RANGE) / TILE_SIZE);

  let best: InteractionTarget | null = null;
  let bestScore = Infinity;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      const found = interactableAt(world, tx, ty);
      if (!found || (found.kind !== 'door' && !accept(found.kind, found.fixture))) continue;
      const distance = gapTo(player, tx, ty, found.box);
      if (distance > INTERACT_RANGE) continue;
      const box = found.box;
      const centreX = tx * TILE_SIZE + (box[0] + box[2]) / 2;
      const centreY = ty * TILE_SIZE + (box[1] + box[3]) / 2;
      // Any target in front of the player wins over any target behind it.
      const score = distance + (inFront(player, centreX, centreY) ? 0 : INTERACT_RANGE);
      if (score < bestScore) {
        bestScore = score;
        best = found.fixture ? { kind: found.kind, tx, ty, distance, fixture: found.fixture } : { kind: found.kind, tx, ty, distance };
      }
    }
  }
  for (const actor of actors) {
    if (!accept(actor.fixture.kind, actor.fixture)) continue;
    const dx = Math.max(actor.x - actor.halfWidth - (player.x + PLAYER_HALF_WIDTH), 0, player.x - PLAYER_HALF_WIDTH - (actor.x + actor.halfWidth));
    const dy = Math.max(actor.y - actor.halfHeight - (player.y + PLAYER_HALF_HEIGHT), 0, player.y - PLAYER_HALF_HEIGHT - (actor.y + actor.halfHeight));
    const distance = Math.hypot(dx, dy);
    if (distance > INTERACT_RANGE) continue;
    const score = distance + (inFront(player, actor.x, actor.y) ? 0 : INTERACT_RANGE);
    if (score < bestScore) {
      bestScore = score;
      best = { kind: actor.fixture.kind, tx: Math.floor(actor.x / TILE_SIZE), ty: Math.floor(actor.y / TILE_SIZE), distance, fixture: actor.fixture };
    }
  }
  return best;
}

/** A map whose doors can open and close. */
export interface DoorMap extends TileMap {
  setDoorOpen(tx: number, ty: number, open: boolean): void;
}

export type DoorResult = 'opened' | 'closed' | 'blocked';

/**
 * Whether the player is close enough to use the door on (tx, ty): the same range as every
 * action. A multiplayer server checks it before it applies a door action from a client.
 */
export function canReachDoor(world: TileMap, player: PlayerState, tx: number, ty: number): boolean {
  return world.structure(tx, ty) === Structure.Door && gapTo(player, tx, ty, FULL_BOX) <= INTERACT_RANGE;
}

/**
 * Opens or closes the door on (tx, ty). A door does not close on anyone: if the player or one
 * of `others` stands in the doorway, the result is 'blocked' and nothing changes. Shared: the
 * client and the multiplayer server apply the same rule.
 */
export function useDoor(world: DoorMap, player: PlayerState, tx: number, ty: number, others: readonly Feet[] = []): DoorResult {
  if (world.structure(tx, ty) !== Structure.Door) throw new Error(`no door at ${tx},${ty}`);
  if (!world.isDoorOpen(tx, ty)) {
    world.setDoorOpen(tx, ty, true);
    return 'opened';
  }
  if (gapTo(player, tx, ty, FULL_BOX) === 0 || others.some((other) => gapTo(other, tx, ty, FULL_BOX) === 0)) return 'blocked';
  world.setDoorOpen(tx, ty, false);
  return 'closed';
}
