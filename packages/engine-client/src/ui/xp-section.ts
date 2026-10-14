import { KILL_XP_DIVISOR, MAX_XP_DIVISOR, MIN_XP_DIVISOR, checkXpDivisor } from '@game/engine';
import { STRINGS } from './strings.ts';

/**
 * The "Experience" section of the settings of the game menu, for an admin only (Fede's decision, 2026-10-14): the
 * divisor of the XP of the kills of the admin's own characters (experience.ts: a kill gives the 5e XP of
 * the mob divided by it). The server keeps it with the account and applies it at once; the other
 * players always have KILL_XP_DIVISOR. `save` sends a new divisor and gives the one that the server
 * kept; `applied` hears it (the page uses it in a world that it runs). The game menu gives the section
 * its heading (STRINGS.experience.heading).
 */
export function xpSection(divisor: number, save: (divisor: number) => Promise<number>, applied: (divisor: number) => void): HTMLElement {
  const T = STRINGS.experience;
  const section = document.createElement('div');
  section.className = 'settings-xp';
  const row = document.createElement('label');
  row.className = 'settings-row settings-xp-row';
  const name = document.createElement('span');
  name.textContent = T.divisor;
  const input = document.createElement('input');
  input.type = 'number';
  input.id = 'xp-divisor';
  input.min = String(MIN_XP_DIVISOR);
  input.max = String(MAX_XP_DIVISOR);
  input.step = '1';
  input.value = String(divisor);
  const status = document.createElement('output');
  row.append(name, input, status);
  const note = document.createElement('p');
  note.className = 'settings-note';
  note.textContent = T.note(KILL_XP_DIVISOR);
  section.append(row, note);
  let kept = divisor;
  input.addEventListener('change', () => {
    const wanted = checkXpDivisor(Number(input.value));
    // The focus goes back to the game: WASD walks again.
    input.blur();
    if (wanted === null || wanted === kept) {
      input.value = String(kept);
      return;
    }
    status.value = '…';
    save(wanted).then(
      (saved) => {
        kept = saved;
        input.value = String(saved);
        status.value = T.saved;
        applied(saved);
      },
      () => {
        input.value = String(kept);
        status.value = T.failed;
      },
    );
  });
  return section;
}
