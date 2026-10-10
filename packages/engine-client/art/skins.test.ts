import { describe, expect, it } from 'vitest';
import { CLASSES, GENDERS, RACES, appearanceSeed, cleanName, type Appearance } from '@game/engine';
import { attackStyle } from './attacks.ts';
import { SMALL_GLYPHS } from './font.ts';
import { SKIN_ATTACK_FRAMES, SKIN_FRAME, SKIN_VIEWS, SKIN_WALK_FRAMES, renderSkinSheet, skinAttack, skinFromSeed, skinName, type Skin } from './skins.ts';

const skin = (look: Partial<Appearance> = {}): Skin => skinFromSeed(appearanceSeed({ race: 'human', class: 'fighter', gender: 'male', variant: 1, ...look }));
/** Many variants of one combination of race, class and gender. */
const variants = (look: Omit<Appearance, 'variant'>, n = 60): Skin[] => Array.from({ length: n }, (_, i) => skinFromSeed(appearanceSeed({ ...look, variant: (i * 104729 + 17) % 8_388_608 })));
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

describe('player skins', () => {
  it('makes the same skin from the same seed, and different skins from different seeds', () => {
    expect(skinFromSeed(12345)).toEqual(skinFromSeed(12345));
    const looks = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(skinFromSeed(i * 7919 + 1))));
    expect(looks.size).toBe(50);
  });

  it('keeps the race, the class and the gender of the seed', () => {
    for (const race of RACES) {
      for (const cls of CLASSES) {
        for (const gender of GENDERS) {
          const look = { race, class: cls, gender, variant: 4242 };
          expect(skinFromSeed(appearanceSeed(look)).appearance).toEqual(look);
        }
      }
    }
  });

  it('gives each race its silhouette', () => {
    const heights = Object.fromEntries(RACES.map((race) => [race, mean(variants({ race, class: 'fighter', gender: 'male' }).map((s) => s.spec.height))]));
    const builds = Object.fromEntries(RACES.map((race) => [race, mean(variants({ race, class: 'fighter', gender: 'male' }).map((s) => s.spec.build))]));
    for (const small of ['dwarf', 'gnome', 'halfling'] as const) expect(heights[small]).toBeLessThan(heights.human! - 0.15);
    expect(heights.gnome).toBeLessThan(heights.dwarf!);
    expect(heights.elf).toBeGreaterThan(heights.human!);
    expect(builds.elf).toBeLessThan(builds.human!);
    for (const broad of ['dwarf', 'half-orc'] as const) expect(builds[broad]).toBeGreaterThan(builds.human! + 0.2);
    expect(mean(variants({ race: 'gnome', class: 'monk', gender: 'male' }).map((s) => s.spec.head))).toBeGreaterThan(1.2);
  });

  it('gives pointed ears to elves and half-elves, tusks to half-orcs, beards to male dwarves and none to females', () => {
    for (const race of RACES) {
      const all = GENDERS.flatMap((gender) => variants({ race, class: 'sorcerer', gender }, 20));
      expect(all.every((s) => (s.spec.ears ?? null) === (race === 'elf' ? 'long' : race === 'half-elf' ? 'short' : null)), race).toBe(true);
      expect(all.every((s) => Boolean(s.spec.tusks) === (race === 'half-orc')), race).toBe(true);
      expect(variants({ race, class: 'fighter', gender: 'female' }).some((s) => s.spec.beard), race).toBe(false);
    }
    expect(variants({ race: 'dwarf', class: 'fighter', gender: 'male' }).every((s) => s.spec.beard && (s.spec.beardLength ?? 1) > 1.5)).toBe(true);
    // Elves show their ears: most of them wear no hood, cowl or helm.
    const elves = CLASSES.flatMap((cls) => variants({ race: 'elf', class: cls, gender: 'female' }, 20));
    expect(elves.filter((s) => ['bare', 'brim', 'witch'].includes(s.spec.headwear)).length / elves.length).toBeGreaterThan(0.6);
  });

  it('dresses and arms each class in its own way', () => {
    const items = (cls: (typeof CLASSES)[number]) => new Set(GENDERS.flatMap((gender) => variants({ race: 'human', class: cls, gender }, 30)).map((s) => s.spec.item ?? 'none'));
    expect([...items('barbarian')].sort()).toEqual(['axe', 'sword']);
    expect([...items('cleric')]).toEqual(['mace']);
    expect([...items('rogue')]).toEqual(['dagger']);
    expect([...items('ranger')]).toEqual(['bow']);
    expect([...items('monk')]).toEqual(['none']);
    expect([...items('bard')]).toEqual(['sword']);
    expect([...items('wizard')].sort()).toEqual(['orbstaff', 'staff']);
    const of = (cls: (typeof CLASSES)[number]) => variants({ race: 'human', class: cls, gender: 'male' });
    expect(of('fighter').every((s) => s.spec.body === 'armour')).toBe(true);
    expect(of('paladin').every((s) => s.spec.body === 'armour' && s.spec.pauldrons)).toBe(true);
    expect(of('fighter').some((s) => s.spec.shield) && of('paladin').some((s) => s.spec.shield) && of('cleric').some((s) => s.spec.shield)).toBe(true);
    expect(of('wizard').filter((s) => s.spec.headwear === 'witch').length).toBeGreaterThan(30);
    expect(of('druid').some((s) => s.spec.antlers)).toBe(true);
    expect(of('bard').some((s) => s.spec.feather)).toBe(true);
    expect(of('ranger').some((s) => s.spec.quiver)).toBe(true);
    expect(of('monk').filter((s) => s.spec.hair === 'none').length).toBeGreaterThan(15);
    // A male barbarian goes bare-chested now and then; a female or an undetermined one never.
    expect(of('barbarian').some((s) => s.palette.garment === s.palette.skin)).toBe(true);
    expect(variants({ race: 'human', class: 'barbarian', gender: 'female' }).some((s) => s.palette.garment === s.palette.skin)).toBe(false);
  });

  it('attacks in the style of the class, and casters tint their spells', () => {
    const styles = (cls: (typeof CLASSES)[number]) => new Set(variants({ race: 'elf', class: cls, gender: 'female' }, 30).map(skinAttack));
    expect([...styles('fighter')]).toEqual(['slash']);
    expect([...styles('barbarian')]).toEqual(['slash']);
    expect([...styles('cleric')]).toEqual(['slash']);
    expect([...styles('bard')]).toEqual(['thrust']);
    expect([...styles('rogue')]).toEqual(['thrust']);
    expect([...styles('ranger')]).toEqual(['shoot']);
    expect([...styles('monk')]).toEqual(['palm']);
    expect([...styles('sorcerer')]).toEqual(['spell']);
    expect([...styles('warlock')]).toEqual(['spell']);
    expect([...styles('wizard')].sort()).toEqual(['bash', 'spell']);
    expect([...styles('druid')].sort()).toEqual(['bash', 'spell']);
    for (const cls of ['sorcerer', 'warlock', 'wizard', 'druid'] as const) expect(variants({ race: 'gnome', class: cls, gender: 'male' }, 10).every((s) => s.palette.glass?.length === 3), cls).toBe(true);
    expect(attackStyle('fighter', { ...skin().spec, item: 'axe' })).toBe('slash');
  });

  it('varies the look inside one combination', () => {
    const many = variants({ race: 'human', class: 'warlock', gender: 'undetermined' }, 80);
    for (const key of ['headwear', 'hair', 'cloak'] as const) expect(new Set(many.map((s) => s.spec[key])).size, key).toBeGreaterThanOrEqual(3);
    expect(new Set(many.map((s) => s.spec.body)).size).toBe(2);
    expect(new Set(many.map((s) => s.palette.cloak.join())).size).toBeGreaterThan(60);
    expect(new Set(many.map((s) => s.palette.skin.join())).size).toBeGreaterThanOrEqual(5);
  });

  it('keeps every frame of a skin inside its frame, with an empty border', () => {
    const { width, height } = SKIN_FRAME;
    // The extremes first: tall and broad figures with long weapons, small ones with big heads and
    // hats, then random seeds.
    const extremes: Appearance[] = [
      { race: 'half-orc', class: 'barbarian', gender: 'male', variant: 3 },
      { race: 'half-orc', class: 'paladin', gender: 'male', variant: 8 },
      { race: 'elf', class: 'wizard', gender: 'male', variant: 5 },
      { race: 'elf', class: 'druid', gender: 'undetermined', variant: 21 },
      { race: 'gnome', class: 'wizard', gender: 'female', variant: 2 },
      { race: 'dwarf', class: 'cleric', gender: 'male', variant: 9 },
      { race: 'human', class: 'ranger', gender: 'female', variant: 6 },
      { race: 'halfling', class: 'bard', gender: 'male', variant: 4 },
    ];
    const tallest = (race: (typeof RACES)[number], cls: (typeof CLASSES)[number]) =>
      variants({ race, class: cls, gender: 'male' }, 200).reduce((a, b) => (b.spec.height * b.spec.build > a.spec.height * a.spec.build ? b : a)).seed;
    const seeds = [
      ...extremes.map(appearanceSeed),
      tallest('half-orc', 'barbarian'),
      tallest('elf', 'wizard'),
      tallest('half-orc', 'fighter'),
      ...Array.from({ length: 12 }, (_, i) => (i * 2654435761) >>> 0),
    ];
    for (const seed of seeds) {
      const sheet = renderSkinSheet(skinFromSeed(seed));
      for (let row = 0; row < SKIN_VIEWS.length; row++) {
        for (let column = 0; column <= SKIN_WALK_FRAMES + SKIN_ATTACK_FRAMES; column++) {
          const x0 = column * width;
          const y0 = row * height;
          for (let i = 0; i < width; i++) {
            expect(sheet.image.get(x0 + i, y0) & 0xff, `seed ${seed} top`).toBe(0);
            expect(sheet.image.get(x0 + i, y0 + height - 1) & 0xff, `seed ${seed} bottom`).toBe(0);
          }
          for (let j = 0; j < height; j++) {
            expect(sheet.image.get(x0, y0 + j) & 0xff, `seed ${seed} left`).toBe(0);
            expect(sheet.image.get(x0 + width - 1, y0 + j) & 0xff, `seed ${seed} right`).toBe(0);
          }
        }
      }
      expect(sheet.headHeight).toBeGreaterThan(14);
      expect(sheet.headHeight).toBeLessThan(height);
    }
  }, 180_000);

  it('gives every skin a name for its class: the same every time, short, and drawn by the small font', () => {
    expect(skinName(4242)).toBe(skinName(4242));
    const seeds = Array.from({ length: 300 }, (_, i) => (i * 2654435761 + 7) >>> 0);
    expect(new Set(seeds.map(skinName)).size).toBeGreaterThan(200);
    for (const seed of seeds) {
      const name = skinName(seed);
      expect(cleanName(name), name).toBe(name);
      expect(name.length).toBeLessThanOrEqual(16);
      for (const ch of name.toUpperCase()) expect(Object.keys(SMALL_GLYPHS), `${name}: ${ch}`).toContain(ch);
    }
    const names = (look: Omit<Appearance, 'variant'>) => Array.from({ length: 40 }, (_, i) => skinName(appearanceSeed({ ...look, variant: i * 977 })));
    expect(names({ race: 'human', class: 'cleric', gender: 'female' }).every((n) => /^(Sister|Mother) /.test(n))).toBe(true);
    expect(names({ race: 'dwarf', class: 'paladin', gender: 'male' }).every((n) => n.startsWith('Sir '))).toBe(true);
  });
});
