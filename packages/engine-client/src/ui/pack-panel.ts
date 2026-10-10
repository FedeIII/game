import type { Texture } from 'pixi.js';
import type { Pack } from '@game/engine';
import type { Art } from '../assets.ts';
import { isFormField } from '../input/keyboard.ts';
import { announceOpenPanel, onOtherPanelOpen } from './panels.ts';
import { STRINGS } from './strings.ts';

const ICON = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
<path d="M8 8V6.5a4 4 0 0 1 8 0V8"/><path d="M5 9.5h14l-1.2 10.5H6.2z"/><path d="M9.5 13.5h5"/></svg>`;

/** An item icon (16 x 16 in the atlas) at 2x, sharp. */
const ICON_SCALE = 2;

/** Draws an atlas frame into a canvas at ICON_SCALE, without smoothing. */
function drawIcon(canvas: HTMLCanvasElement, texture: Texture): void {
  const { x, y, width, height } = texture.frame;
  canvas.width = width * ICON_SCALE;
  canvas.height = height * ICON_SCALE;
  const context = canvas.getContext('2d');
  if (!context) return;
  context.imageSmoothingEnabled = false;
  context.drawImage(texture.source.resource as CanvasImageSource, x, y, width, height, 0, 0, canvas.width, canvas.height);
}

/**
 * The pack: a button in the top-right corner (left of the settings), or I on a keyboard, opens a
 * panel with the coins and the slots of the pack, each with the icon of its item and the count. The
 * slots come from Strength (PlayerTraits.slots). It shows what the game gives it; it changes nothing.
 */
export class PackPanel {
  private readonly art: Art;
  private readonly button: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly slotsLabel: HTMLElement;
  private readonly coins: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly empty: HTMLElement;
  private shown = '';

  /** `note`: a line under the slots (a guest's pack, or one that is not saved), or null. */
  constructor(art: Art, note: string | null) {
    const text = STRINGS.pack;
    this.art = art;
    this.button = document.createElement('button');
    this.button.id = 'pack-button';
    this.button.type = 'button';
    this.button.setAttribute('aria-label', text.button);
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', 'pack');
    this.button.setAttribute('aria-keyshortcuts', 'I');
    this.button.title = text.buttonKey;
    this.button.innerHTML = ICON;

    this.panel = document.createElement('section');
    this.panel.id = 'pack';
    this.panel.hidden = true;
    this.panel.setAttribute('aria-label', text.heading);
    const head = document.createElement('div');
    head.className = 'pack-head';
    const title = document.createElement('p');
    title.className = 'menu-title';
    title.textContent = text.heading;
    this.slotsLabel = document.createElement('span');
    this.slotsLabel.className = 'pack-count';
    head.append(title, this.slotsLabel);

    const purse = document.createElement('div');
    purse.className = 'pack-coins';
    const coinIcon = document.createElement('canvas');
    coinIcon.setAttribute('aria-hidden', 'true');
    drawIcon(coinIcon, art.frame('item/coin'));
    const coinName = document.createElement('span');
    coinName.textContent = text.coins;
    this.coins = document.createElement('span');
    this.coins.className = 'pack-coin-count';
    purse.append(coinIcon, coinName, this.coins);

    this.grid = document.createElement('ul');
    this.grid.className = 'pack-slots';
    this.empty = document.createElement('p');
    this.empty.className = 'menu-hint';
    this.empty.textContent = text.empty;
    this.panel.append(head, purse, this.grid, this.empty);
    if (note) {
      const line = document.createElement('p');
      line.className = 'menu-hint';
      line.textContent = note;
      this.panel.append(line);
    }

    this.button.addEventListener('click', () => this.open(this.panel.hidden !== false));
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') this.open(false);
      // I opens and closes it. KeyboardEvent.code, as the other keys: the same key on any layout.
      if (event.code !== 'KeyI' || event.repeat || event.ctrlKey || event.metaKey || event.altKey || isFormField(event.target)) return;
      event.preventDefault();
      this.open(this.panel.hidden !== false);
    });
    onOtherPanelOpen('pack', () => this.open(false));
    // Give the focus back after a click, so WASD moves the player again at once.
    this.panel.addEventListener('click', () => setTimeout(() => (document.activeElement as HTMLElement | null)?.blur(), 0));
    document.body.append(this.button, this.panel);
  }

  /** Shows a pack with `slots` slots. */
  show(pack: Pack, slots: number): void {
    const key = JSON.stringify([pack, slots]);
    if (key === this.shown) return;
    this.shown = key;
    this.slotsLabel.textContent = STRINGS.pack.slots(pack.items.length, slots);
    this.coins.textContent = String(pack.coins);
    this.grid.replaceChildren();
    for (let i = 0; i < slots; i++) {
      const stack = pack.items[i];
      const slot = document.createElement('li');
      slot.className = stack ? 'pack-slot' : 'pack-slot pack-slot-free';
      if (stack) {
        const names = STRINGS.items[stack.kind];
        const icon = document.createElement('canvas');
        icon.setAttribute('aria-hidden', 'true');
        drawIcon(icon, this.art.frame(`item/${stack.kind}`));
        const count = document.createElement('span');
        count.className = 'pack-stack';
        count.textContent = stack.count > 1 ? String(stack.count) : '';
        slot.title = stack.count > 1 ? `${stack.count} ${names.many}` : names.a;
        slot.setAttribute('aria-label', slot.title);
        slot.append(icon, count);
      }
      this.grid.append(slot);
    }
    this.empty.hidden = pack.items.length > 0 || pack.coins > 0;
  }

  private open(open: boolean): void {
    this.panel.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) announceOpenPanel('pack');
  }
}
