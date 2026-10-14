import { el } from '../menu/dom.ts';
import { STRINGS } from './strings.ts';

/** A key or a button of the controls, as a small plate. */
function key(name: string): HTMLElement {
  return el('kbd', { class: 'menu-key' }, name);
}

/**
 * The controls of the game, to read: what each one does, its keys, and what a touch screen has
 * instead. The settings of the menu and of the game menu show them.
 */
export function controlList(): HTMLElement {
  const T = STRINGS.menu;
  const list = el('dl', { class: 'control-list' });
  for (const control of T.controlList) {
    const keys = el('dd', { class: 'control-keys' });
    control.keys.forEach((choice, i) => {
      if (i > 0) keys.append(` ${T.or} `);
      const group = el('span', { class: 'control-choice' });
      choice.forEach((name, k) => {
        if (k > 0) group.append(' ');
        group.append(key(name));
      });
      keys.append(group);
    });
    const row = el('div', { class: 'control' }, el('dt', {}, control.action), keys);
    if (control.note) row.append(el('dd', { class: 'control-note' }, control.note));
    row.append(el('dd', { class: 'control-touch' }, `${T.touch}: ${control.touch}`));
    list.append(row);
  }
  return list;
}
