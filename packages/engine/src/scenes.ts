import { checkConditions, checkEffect, QUEST_ID, type Conditions, type QuestDef, type QuestEffect } from './quests.ts';
import type { Gate } from './traits.ts';

/**
 * Scenes: talks that a character overhears (story phase 3). When a character for whom the
 * conditions of a scene hold comes into its area, the NPCs of the scene say its lines, one after
 * the other, over their heads. The scene is personal: only that character's page shows it, and
 * the other visitors see the NPCs as before. At its end, its effect moves the quest on (the server
 * checks it), so it plays once. A character who leaves the area before the end hears it again from
 * the start the next time. Pure data: a world gives its scenes in its source (WorldSource.scenes).
 */

export interface SceneLine {
  /** The NPC who says it (NpcDef.id). */
  readonly npc: string;
  readonly text: string;
  /**
   * A line said low: a character that passes the gate hears it; one 1 or 2 under it hears a murmur
   * with the gate; others a murmur only (gateView).
   */
  readonly gate?: Gate;
}

export interface SceneDef {
  readonly id: string;
  /** The tiles where the character must stand for the scene to play: a rectangle. */
  readonly area: { readonly x0: number; readonly y0: number; readonly x1: number; readonly y1: number };
  /** The storey of the area (Building.storeys): the character must be on it. Default: the ground (0). */
  readonly storey?: number;
  /** The conditions that start it: a quest at a step. */
  readonly when: Conditions;
  readonly lines: readonly SceneLine[];
  /** What its end does: it moves the quest on, so that the scene does not play again. */
  readonly effect: QuestEffect;
}

/** The longest line of a scene (characters): a bubble must hold it. */
export const SCENE_LINE_MAX = 160;
/** A character stays in a scene this many tiles round its area; the server accepts its end there too. */
export const SCENE_MARGIN = 2;

/** Whether the tile is in the area of the scene (with `margin` tiles round it). */
export function inScene(scene: SceneDef, tx: number, ty: number, margin = 0): boolean {
  const { x0, y0, x1, y1 } = scene.area;
  return tx >= x0 - margin && tx <= x1 + margin && ty >= y0 - margin && ty <= y1 + margin;
}

/**
 * The problems of a world's scenes, as sentences; none for good ones: good and unique ids, a good
 * area, lines by NPCs that the world has, not too long, and an effect and conditions on its quests.
 */
export function checkScenes(scenes: readonly SceneDef[], npcIds: readonly string[], quests: readonly QuestDef[]): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const scene of scenes) {
    if (!QUEST_ID.test(scene.id)) problems.push(`the scene id "${scene.id}" is not good`);
    if (ids.has(scene.id)) problems.push(`two scenes have the id "${scene.id}"`);
    ids.add(scene.id);
    if (scene.area.x1 < scene.area.x0 || scene.area.y1 < scene.area.y0) problems.push(`${scene.id}: the area is empty`);
    if (scene.lines.length === 0) problems.push(`${scene.id}: no lines`);
    for (const line of scene.lines) {
      if (!npcIds.includes(line.npc)) problems.push(`${scene.id}: no NPC "${line.npc}"`);
      if (!line.text || line.text.length > SCENE_LINE_MAX) problems.push(`${scene.id}: the line "${line.text}" is empty or too long`);
    }
    problems.push(...checkEffect(scene.effect, quests).map((p) => `${scene.id}: ${p}`));
    problems.push(...checkConditions(scene.when, quests).map((p) => `${scene.id}: ${p}`));
  }
  return problems;
}
