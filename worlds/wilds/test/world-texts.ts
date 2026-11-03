import type { Dialog, Interaction, WorldDefinition, WorldSource } from '@game/engine';

/** A rectangle of tiles, its corners included. */
interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

/**
 * Every text of a world's content that a player can read, as the content has it (in English):
 * the name of the world, the lines of `examine` and `items`, the signs and the lines of the
 * buildings (on every storey), the pages, lore, links and dialogs of the fixtures and the NPCs, the lines and
 * greetings of the NPCs, the names of the landmarks, the titles of the places and the lands, the places and the lines of the journal's regions, the lines of the scenes, the cards of the prologue, and the titles and journal lines of the quests. It reads the content through the source,
 * in a square of `radius` tiles round (0, 0), with many houses of the Wilds, round every place of the
 * journal's regions (`margin` tiles round it: its houses too), and in `extra` (more rectangles of tiles).
 */
export function worldTexts(
  definition: WorldDefinition,
  source: WorldSource,
  radius = 260,
  extra: readonly Rect[] = [],
  margin = 40,
): Set<string> {
  const areas: Rect[] = [
    { x0: -radius, y0: -radius, x1: radius, y1: radius },
    ...(source.places?.() ?? []).map((p) => ({ x0: p.x0 - margin, y0: p.y0 - margin, x1: p.x1 + margin, y1: p.y1 + margin })),
    ...extra,
  ];
  const texts = new Set<string>();
  const add = (text: string | undefined) => {
    if (text) texts.add(text);
  };
  const dialog = (d: Dialog) => {
    add(d.name);
    for (const node of Object.values(d.nodes)) {
      add(node.say);
      for (const answer of node.answers) {
        add(answer.text);
        // What a trader says after a trade in its shop.
        add(answer.shop?.bought);
        add(answer.shop?.sold);
        for (const ware of [...(answer.shop?.buy ?? []), ...(answer.shop?.sell ?? [])]) add(ware.says);
      }
    }
  };
  const content = (c: Interaction | undefined) => {
    if (!c) return;
    c.pages?.forEach(add);
    for (const lore of c.lore ?? []) lore.pages.forEach(add);
    if (c.link) {
      add(c.link.label);
      add(c.link.title);
    }
    if (c.dialog) dialog(c.dialog);
  };
  add(definition.name);
  Object.values(definition.examine).forEach(add);
  Object.values(definition.examineByDay ?? {}).forEach(add);
  Object.values(definition.items ?? {}).forEach(add);
  if (definition.intro) {
    add(definition.intro.title);
    definition.intro.welcome?.forEach(add);
  }
  for (const npc of source.npcs?.() ?? []) {
    content(npc.content);
    npc.barks?.forEach(add);
    add(npc.greeting);
  }
  const buildings = new Set(areas.flatMap((a) => source.buildingsIn(a.x0, a.y0, a.x1, a.y1)));
  for (const building of buildings) {
    add(building.sign);
    add(building.locked);
    for (const fixture of building.fixtures) content(fixture.content);
    // The things of the storeys above the ground (Building.storeys).
    for (const storey of building.storeys ?? []) for (const fixture of storey.fixtures) content(fixture.content);
  }
  const fixtures = new Set(areas.flatMap((a) => source.fixturesIn(a.x0, a.y0, a.x1, a.y1)));
  for (const fixture of fixtures) {
    content(fixture.content);
    content(fixture.variant?.content);
  }
  for (const mark of source.landmarks?.() ?? []) add(mark.name);
  // The titles over the screen: the places and the lands.
  for (const place of source.placeTitles?.() ?? []) add(place.title);
  for (const land of source.lands?.() ?? []) {
    add(land.title);
    add(land.line);
  }
  // The places of the journal's regions.
  for (const place of source.places?.() ?? []) {
    add(place.name);
    add(place.line);
  }
  // The guards of the convoys: their names over their heads, and what they say.
  for (const convoy of source.convoys?.() ?? []) {
    for (const member of convoy.members) {
      add(member.name);
      content(member.content);
    }
  }
  for (const scene of source.scenes?.() ?? []) for (const line of scene.lines) add(line.text);
  for (const card of definition.prologue ?? []) {
    add(card.title);
    add(card.subtitle);
    add(card.banner);
    card.lines.forEach(add);
  }
  for (const quest of definition.quests ?? []) {
    add(quest.title);
    for (const step of quest.steps) add(step.journal);
  }
  return texts;
}
