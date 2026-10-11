import { characterSkin, kitOf, shownGear, type Character } from '@game/engine';
import type { SkinLook } from '../../art/skins.ts';

/** The look of a stored character: its skin seed, and what shows of its gear (the kit of its class, if the page has no gear for it). */
export function characterLook(character: Pick<Character, 'race' | 'class' | 'gender' | 'variant'> & { readonly gear?: Character['gear'] }): SkinLook {
  return { seed: characterSkin(character), shown: shownGear(character.gear ?? kitOf(character.class)) };
}
