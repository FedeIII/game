import { describe, expect, it } from 'vitest';
import { PLAIN_SCORES, Room, TILE_SIZE, World, checkDialog, refugeAt, traitsOf, type Dialog, type Scores } from '@game/engine';
import { APOTHECARY, DEFAULT_SEED, INNKEEPER, PEDDLER, PERSUASION_GATE, REEVE, TOWN_BUILDINGS, TOWN_NPCS, WATCHMAN, WildsSource } from '../src/index.ts';

const withCha = (cha: number) => traitsOf({ ...PLAIN_SCORES, cha } as Scores, 'fighter');
const answers = (dialog: Dialog) => Object.values(dialog.nodes).flatMap((n) => n.answers);
const npcIndex = (id: string) => TOWN_NPCS.findIndex((n) => n.id === id);
/** The middle of the home tile of an NPC, in world pixels (a player who joins there stands next to it). */
const besideNpc = (id: string) => {
  const [tx, ty] = TOWN_NPCS[npcIndex(id)]!.home;
  return { x: tx * TILE_SIZE + TILE_SIZE / 2, y: ty * TILE_SIZE + 12 };
};

describe('persuasion in the conversations of Thornwick', () => {
  it('gives each of the four people a way behind CHA 13, and the dialogs stay good', () => {
    expect(PERSUASION_GATE).toEqual({ ability: 'cha', min: 13 });
    for (const dialog of [WATCHMAN, INNKEEPER, APOTHECARY, REEVE, PEDDLER]) expect(checkDialog(dialog), dialog.name).toEqual([]);
    for (const dialog of [WATCHMAN, INNKEEPER, APOTHECARY, REEVE]) {
      const doors = answers(dialog).filter((a) => a.gate === PERSUASION_GATE && !a.deal?.id.startsWith('friend'));
      expect(doors, dialog.name).toHaveLength(1);
    }
    // Isolde's friend's price is behind the gate too: the server checks the gate of the answer with the deal.
    const friend = answers(APOTHECARY).filter((a) => a.deal?.id.startsWith('friend'));
    expect(friend).toHaveLength(3);
    for (const a of friend) expect(a.gate).toBe(PERSUASION_GATE);
  });

  it('shows no price in the text of an answer: the panel adds the price for the player', () => {
    for (const dialog of [INNKEEPER, APOTHECARY, PEDDLER]) for (const a of answers(dialog)) expect(a.text, dialog.name).not.toMatch(/coin/);
  });
});

describe('Charisma in Thornwick, through the server', () => {
  const join = (room: Room, id: string, cha: number, pack = { coins: 20, items: [] as { kind: 'ring'; count: number }[] }) =>
    room.join(0, 1, undefined, '', besideNpc(id), { traits: withCha(cha), pack, hp: 1 })!;

  it('gives a room at the inn to a character who wins Marta over: a refuge and a bed', () => {
    const room = new Room(new World(new WildsSource(DEFAULT_SEED)));
    const dull = join(room, 'innkeeper', 12);
    const bold = join(room, 'innkeeper', 13);
    for (const p of [dull, bold]) room.deal(p.id, { npc: npcIndex('innkeeper') }, 'room');
    expect(dull.refuges).not.toContain('inn');
    expect(bold.refuges).toContain('inn');
    // Coming into the inn gives no room: Marta must give it.
    const inn = TOWN_BUILDINGS.find((b) => b.id === 'inn')!;
    expect(refugeAt(room.world, (inn.x0 + 3) * TILE_SIZE + 8, (inn.y0 + 4) * TILE_SIZE + 8)).toBeNull();
    // The bed by the east wall rests only the character with the room.
    const bed = inn.fixtures.find((f) => f.kind === 'bed')!;
    expect(bed.content?.restFor).toBe('inn');
    const refuge = room.world.source.refuges!().find((r) => r.id === 'inn')!;
    for (const p of [dull, bold]) {
      p.state.x = refuge.x;
      p.state.y = refuge.y;
      p.state.hp = 1;
      room.input(p.id, { t: 'in', s: 1, i: [[0, 0]], u: [[1, bed.tx, bed.ty]] }, 0);
    }
    expect(dull.state.hp).toBe(1);
    expect(bold.state.hp).toBe(bold.traits.maxHp);
  });

  it('sells Isolde\'s draughts at the price of the player, and her friend\'s price only with CHA 13', () => {
    const room = new Room(new World(new WildsSource(DEFAULT_SEED)));
    const plain = join(room, 'apothecary', 10);
    const charming = join(room, 'apothecary', 16);
    const isolde = { npc: npcIndex('apothecary') };
    for (const p of [plain, charming]) room.deal(p.id, isolde, 'buy-draught');
    expect(plain.pack).toEqual({ coins: 14, items: [{ kind: 'draught', count: 1 }] });
    expect(charming.pack).toEqual({ coins: 16, items: [{ kind: 'draught', count: 1 }] });
    for (const p of [plain, charming]) room.deal(p.id, isolde, 'friend-draught');
    expect(plain.pack.coins).toBe(14);
    expect(charming.pack.coins).toBe(13);
  });

  it('lets the peddler buy trinkets and trophies, for more with Charisma', () => {
    const room = new Room(new World(new WildsSource(DEFAULT_SEED)));
    const rings = { coins: 0, items: [{ kind: 'ring' as const, count: 1 }] };
    const plain = join(room, 'peddler', 10, rings);
    const charming = join(room, 'peddler', 16, rings);
    for (const p of [plain, charming]) room.deal(p.id, { npc: npcIndex('peddler') }, 'sell-ring');
    expect(plain.pack).toEqual({ coins: 5, items: [] });
    expect(charming.pack).toEqual({ coins: 7, items: [] });
    // Nothing to sell: nothing changes.
    room.deal(plain.id, { npc: npcIndex('peddler') }, 'sell-ring');
    expect(plain.pack).toEqual({ coins: 5, items: [] });
  });
});

describe('reputation', () => {
  it('gives every person of Thornwick a greeting by name', () => {
    for (const npc of TOWN_NPCS) expect(npc.greeting, npc.id).toContain('{name}');
  });
});
