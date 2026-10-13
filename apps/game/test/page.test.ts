import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const page = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

describe('the page', () => {
  it('starts with the control hint hidden: an empty hint is an empty box at the top of the screen', () => {
    // Only Hud.showHint() shows it (the new-build line).
    expect(page).toMatch(/<div id="hint" class="gone"><\/div>/);
  });
});
