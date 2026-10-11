import { TILE_SIZE } from './constants.ts';
import type { CompanionDef, CompanionEvent, Companions } from './companions.ts';
import type { Pack } from './items.ts';
import type { PlayerState } from './player.ts';
import { canApply, holds, type Conditions, type QuestBook, type QuestEffect } from './quests.ts';

/**
 * Escorts (story phase 4b): a companion that a step of a quest gives a character (the scout Himo,
 * whom the character takes home to Ironhold). While the book of a character holds `when`, the
 * companion follows it (companions.ts): it comes in next to the character when the character
 * reaches the step, and again when it joins the world after a leave. When the companion comes into
 * `home`, `arrive` applies to its leader and the companion goes (home); when its defeat takes it
 * out of the world ('gone'), `fall` applies. The Room runs them in a shared world; the page in a
 * world that it runs.
 */
export interface EscortDef {
  readonly companion: CompanionDef;
  readonly when: Conditions;
  /** Where the companion is safe at last (tiles): the town of its family. */
  readonly home: (tx: number, ty: number) => boolean;
  readonly arrive: QuestEffect;
  readonly fall: QuestEffect;
}

/** A character as the escorts see it. */
export interface EscortPlayer {
  readonly id: number;
  readonly state: PlayerState;
  readonly quests: QuestBook;
  readonly pack: Pack;
}

/** The escorts of a world, and the companions that they put in. */
export class Escorts {
  readonly defs: readonly EscortDef[];
  /** For each companion of an escort (its id): its def and its leader. */
  private readonly walking = new Map<number, { readonly def: EscortDef; readonly leader: number }>();

  constructor(defs: readonly EscortDef[]) {
    this.defs = defs;
  }

  /**
   * One step, after the companions moved (`events`: what happened to them in that step): a
   * companion that fell for good, or that came home, ends its escort (the effects to apply, for the
   * characters); a character at the step without its companion gets it; a companion whose leader
   * is not at the step any more goes.
   */
  step(companions: Companions, players: readonly EscortPlayer[], events: readonly CompanionEvent[]): { readonly player: number; readonly effect: QuestEffect }[] {
    const out: { player: number; effect: QuestEffect }[] = [];
    const byId = new Map(players.map((p) => [p.id, p] as const));
    const ended = new Set<string>();
    for (const event of events) {
      const walk = this.walking.get(event.id);
      if (!walk || event.kind !== 'gone') continue;
      this.walking.delete(event.id);
      const leader = byId.get(walk.leader);
      if (leader && canApply(walk.def.fall, leader.quests, leader.pack)) out.push({ player: leader.id, effect: walk.def.fall });
      ended.add(`${walk.leader} ${walk.def.companion.id}`);
    }
    for (const [id, walk] of [...this.walking]) {
      const companion = companions.list.find((c) => c.id === id);
      const leader = byId.get(walk.leader);
      if (!companion || !leader) {
        // Its leader left the world (the Room takes the companion out), or it is gone.
        if (companion) companions.remove(id);
        this.walking.delete(id);
        continue;
      }
      if (!holds(walk.def.when, leader.quests, leader.pack)) {
        companions.remove(id);
        this.walking.delete(id);
        continue;
      }
      // Home: the companion is in, and its leader with it (not on the ground).
      const tx = Math.floor(companion.state.x / TILE_SIZE);
      const ty = Math.floor(companion.state.y / TILE_SIZE);
      if (companion.state.down === 0 && walk.def.home(tx, ty) && canApply(walk.def.arrive, leader.quests, leader.pack)) {
        out.push({ player: leader.id, effect: walk.def.arrive });
        companions.remove(id);
        this.walking.delete(id);
        ended.add(`${walk.leader} ${walk.def.companion.id}`);
      }
    }
    for (const def of this.defs) {
      for (const p of players) {
        if (ended.has(`${p.id} ${def.companion.id}`) || p.state.down > 0 || !holds(def.when, p.quests, p.pack)) continue;
        if ([...this.walking.values()].some((w) => w.leader === p.id && w.def === def)) continue;
        const companion = companions.add(def.companion, p.id, p.state.x, p.state.y);
        this.walking.set(companion.id, { def, leader: p.id });
      }
    }
    return out;
  }
}
