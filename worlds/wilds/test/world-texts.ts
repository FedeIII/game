import type { Dialog, Interaction, WorldDefinition, WorldSource } from '@game/engine';

/**
 * Every text of a world's content that a player can read, as the content has it (in English):
 * the name of the world, the lines of `examine` and `items`, the signs and the lines of the
 * buildings, the pages, lore, links and dialogs of the fixtures and the NPCs, the lines and
 * greetings of the NPCs, the names of the landmarks, the lines of the scenes, the cards of the prologue, and the titles and journal lines of the quests. It reads the content through the source,
 * in a square of `radius` tiles round the home: the two towns, the camps and many houses of the Wilds.
 */
export function worldTexts(definition: WorldDefinition, source: WorldSource, radius = 260): Set<string> {
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
  for (const building of source.buildingsIn(-radius, -radius, radius, radius)) {
    add(building.sign);
    add(building.locked);
    for (const fixture of building.fixtures) content(fixture.content);
  }
  for (const fixture of source.fixturesIn(-radius, -radius, radius, radius)) {
    content(fixture.content);
    content(fixture.variant?.content);
  }
  for (const mark of source.landmarks?.() ?? []) add(mark.name);
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
