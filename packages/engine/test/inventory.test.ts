import { describe, expect, it } from 'vitest';
import { EMPTY_GEAR, ownedPack, unwearFor } from '../src/index.ts';
describe('what a character owns, for the quests', () => {
  const gear = { ...EMPTY_GEAR, neck: 'tear-of-tigris' as const, main: 'greataxe' as const, off: 'greataxe' as const };
  const pack = { coins: 3, items: [{ kind: 'draught' as const, count: 2 }] };

  it('counts the worn items as stacks after the pack (a two-handed weapon once)', () => {
    expect(ownedPack({ pack, gear }).items).toEqual([{ kind: 'draught', count: 2 }, { kind: 'tear-of-tigris', count: 1 }, { kind: 'greataxe', count: 1 }]);
    expect(ownedPack({ pack, gear: EMPTY_GEAR })).toBe(pack);
  });

  it('takes off a worn item that a take needs and the pack lacks', () => {
    const off = unwearFor({ pack, gear }, [{ kind: 'tear-of-tigris', count: 1 }]);
    expect(off.gear.neck).toBeNull();
    expect(off.pack.items).toEqual([{ kind: 'draught', count: 2 }, { kind: 'tear-of-tigris', count: 1 }]);
    const same = { pack, gear };
    expect(unwearFor(same, [{ kind: 'draught', count: 1 }])).toBe(same);
  });
});
