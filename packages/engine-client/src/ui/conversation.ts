import type { Texture } from 'pixi.js';
import type { Dialog, DialogAnswer, DialogNode } from '@game/engine';
import { STRINGS } from './strings.ts';

/**
 * A conversation with an NPC that has a dialog (Interaction.dialog, the engine's dialog.ts): the
 * node that it is at, the answer that is selected, and the answer that the player gave last.
 * Pure state, without the page, so a test can run it.
 */
export class Conversation {
  readonly dialog: Dialog;
  private nodeId: string;
  /** The index of the selected answer. */
  selected = 0;
  /** What the player answered last (it shows over the NPC's reply), or null at the start. */
  answered: string | null = null;

  constructor(dialog: Dialog) {
    this.dialog = dialog;
    this.nodeId = dialog.start;
  }

  get id(): string {
    return this.nodeId;
  }

  get node(): DialogNode {
    return this.dialog.nodes[this.nodeId]!;
  }

  get answers(): readonly DialogAnswer[] {
    return this.node.answers;
  }

  /** Moves the selection up (-1) or down (+1), round the list. */
  move(step: number): void {
    const n = this.answers.length;
    this.selected = (((this.selected + step) % n) + n) % n;
  }

  /**
   * Gives the answer `index`. Returns the next node (the NPC says its line), or null if the
   * answer ends the conversation (or there is no such answer: then nothing changes).
   */
  choose(index: number): DialogNode | null {
    const answer = this.answers[index];
    if (!answer) return null;
    if (answer.next === undefined) {
      this.answered = answer.text;
      return null;
    }
    this.nodeId = answer.next;
    this.answered = answer.text;
    this.selected = 0;
    return this.node;
  }

  /** Whether the answer `index` ends the conversation. */
  ends(index: number): boolean {
    return this.answers[index]?.next === undefined;
  }
}

/** The close-up of an NPC: this many pixels of its frame, a square from the top of its head (CSS scales it up). */
const CLOSEUP = 14;

/**
 * Draws the head and shoulders of a figure from its frame in the atlas: a square of CLOSEUP
 * pixels from one pixel above the top of its head, centred on the figure. The canvas keeps the
 * pixels of the art; CSS scales it up, sharp (image-rendering: pixelated).
 */
export function drawCloseup(canvas: HTMLCanvasElement, texture: Texture): void {
  const { x, y, width, height } = texture.frame;
  const source = texture.source.resource as CanvasImageSource;
  // The frame on a padded canvas, so a square that reaches past its edges stays inside.
  const pad = CLOSEUP;
  const work = document.createElement('canvas');
  work.width = width + 2 * pad;
  work.height = height + 2 * pad;
  const context = work.getContext('2d', { willReadFrequently: true });
  const out = canvas.getContext('2d');
  if (!context || !out) return;
  context.drawImage(source, x, y, width, height, pad, pad, width, height);
  const pixels = context.getImageData(pad, pad, width, height).data;
  const opaque = (px: number, py: number) => pixels[(py * width + px) * 4 + 3]! > 0;
  let top = 0;
  while (top < height - 1 && ![...Array(width).keys()].some((px) => opaque(px, top))) top++;
  // The middle of the figure in the rows of the close-up (a staff beside it does not count much).
  let sum = 0;
  let count = 0;
  for (let py = top; py < Math.min(height, top + CLOSEUP); py++) {
    for (let px = 0; px < width; px++) {
      if (opaque(px, py)) {
        sum += px;
        count++;
      }
    }
  }
  const middle = count > 0 ? sum / count : width / 2;
  canvas.width = CLOSEUP;
  canvas.height = CLOSEUP;
  out.imageSmoothingEnabled = false;
  out.clearRect(0, 0, CLOSEUP, CLOSEUP);
  out.drawImage(work, Math.round(pad + middle - CLOSEUP / 2), pad + top - 1, CLOSEUP, CLOSEUP, 0, 0, CLOSEUP, CLOSEUP);
}

/** What the panel tells the game. */
export interface ConversationEvents {
  /** The NPC says the line of a new node (the game shows it over the NPC's head). */
  readonly line: (say: string) => void;
  /** The conversation is over (an answer that ends it, Esc, or the close button). */
  readonly end: () => void;
}

/**
 * The conversation panel, at the bottom of the screen in the GUI style: a close-up of the NPC,
 * its name, what the player said last, what the NPC says, and the player's answers. While it is
 * open, it takes the keys that the game uses (it listens first, in the capture phase): W S or the
 * arrows choose an answer, E, Enter or Space gives it, 1 to 9 give one at once, Esc ends the
 * conversation. A tap or a click on an answer gives it.
 */
export class ConversationPanel {
  private readonly panel: HTMLElement;
  private readonly portrait: HTMLCanvasElement;
  private readonly name: HTMLElement;
  private readonly said: HTMLElement;
  private readonly text: HTMLElement;
  private readonly list: HTMLOListElement;
  private readonly events: ConversationEvents;
  private talk: Conversation | null = null;

  constructor(events: ConversationEvents) {
    this.events = events;
    this.panel = document.createElement('section');
    this.panel.id = 'conversation';
    this.panel.hidden = true;
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-labelledby', 'conversation-name');

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'conversation-close';
    close.setAttribute('aria-label', STRINGS.conversation.end);
    close.textContent = '×';
    close.addEventListener('click', () => this.end());

    this.portrait = document.createElement('canvas');
    this.portrait.className = 'portrait conversation-portrait';
    this.portrait.setAttribute('aria-hidden', 'true');
    this.name = document.createElement('p');
    this.name.className = 'conversation-name';
    this.name.id = 'conversation-name';
    this.said = document.createElement('p');
    this.said.className = 'conversation-said';
    this.text = document.createElement('p');
    this.text.className = 'conversation-text';
    const words = document.createElement('div');
    words.className = 'conversation-words';
    words.append(this.name, this.said, this.text);
    const head = document.createElement('div');
    head.className = 'conversation-head';
    head.append(this.portrait, words);

    this.list = document.createElement('ol');
    this.list.className = 'conversation-answers';
    const keys = document.createElement('p');
    keys.className = 'conversation-keys';
    keys.textContent = STRINGS.conversation.keys;
    this.panel.append(close, head, this.list, keys);
    document.body.append(this.panel);

    window.addEventListener('keydown', (event) => this.key(event), { capture: true });
    // A key that gives an answer must not also click the focused button when it goes up.
    window.addEventListener(
      'keyup',
      (event) => {
        if (this.talk && (event.code === 'Space' || event.code === 'Enter')) event.preventDefault();
      },
      { capture: true },
    );
  }

  get open(): boolean {
    return this.talk !== null;
  }

  /** The conversation that is open, or null (for the debug panel). */
  get current(): Conversation | null {
    return this.talk;
  }

  /** Opens the panel at the start of `dialog`, with a close-up from `face` (the NPC's frame). */
  start(dialog: Dialog, face: Texture | null): void {
    this.talk = new Conversation(dialog);
    this.name.textContent = dialog.name;
    if (face) drawCloseup(this.portrait, face);
    this.portrait.hidden = face === null;
    this.panel.hidden = false;
    document.body.classList.add('conversing');
    this.render();
  }

  /** Closes the panel (it does not tell the game: the game closes it). */
  close(): void {
    if (!this.talk) return;
    this.talk = null;
    this.panel.hidden = true;
    document.body.classList.remove('conversing');
    // Give the focus back to the page, or the keys of the game stop working.
    if (document.activeElement instanceof HTMLElement && this.panel.contains(document.activeElement)) document.activeElement.blur();
  }

  /** Gives the answer `index`: the NPC answers, or the conversation ends. */
  choose(index: number): void {
    const talk = this.talk;
    if (!talk || index < 0 || index >= talk.answers.length) return;
    const next = talk.choose(index);
    if (!next) {
      this.end();
      return;
    }
    this.render();
    this.events.line(next.say);
  }

  private end(): void {
    this.close();
    this.events.end();
  }

  private render(): void {
    const talk = this.talk!;
    this.said.hidden = talk.answered === null;
    this.said.textContent = talk.answered === null ? '' : `${STRINGS.conversation.you}: ${talk.answered}`;
    this.text.textContent = talk.node.say;
    this.list.replaceChildren(
      ...talk.answers.map((answer, i) => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'conversation-answer';
        if (talk.ends(i)) button.classList.add('ends');
        const key = document.createElement('span');
        key.className = 'conversation-key';
        key.setAttribute('aria-hidden', 'true');
        key.textContent = String(i + 1);
        button.append(key, answer.text);
        // Only a pointer that moves selects: the panel can open under a mouse that stands still.
        button.addEventListener('pointermove', () => talk.selected !== i && this.select(i));
        button.addEventListener('click', () => this.choose(i));
        item.append(button);
        return item;
      }),
    );
    this.select(talk.selected);
  }

  private select(index: number): void {
    const talk = this.talk;
    if (!talk) return;
    talk.selected = index;
    const buttons = this.list.querySelectorAll<HTMLButtonElement>('.conversation-answer');
    buttons.forEach((button, i) => button.classList.toggle('selected', i === index));
    // The focus follows the selection, so a screen reader reads the answer.
    buttons[index]?.focus({ preventScroll: true });
  }

  private key(event: KeyboardEvent): void {
    const talk = this.talk;
    if (!talk || event.ctrlKey || event.metaKey || event.altKey) return;
    const digit = /^Digit([1-9])$/.exec(event.code) ?? /^Numpad([1-9])$/.exec(event.code);
    let handled = true;
    if (digit) this.choose(Number(digit[1]) - 1);
    else if (event.code === 'ArrowUp' || event.code === 'KeyW' || event.code === 'ArrowDown' || event.code === 'KeyS') {
      talk.move(event.code === 'ArrowUp' || event.code === 'KeyW' ? -1 : 1);
      this.select(talk.selected);
    }
    else if (event.code === 'KeyE' || event.code === 'Enter' || event.code === 'Space') {
      if (!event.repeat) this.choose(talk.selected);
    } else if (event.code === 'Escape') this.end();
    // The other keys of the game do nothing while the panel is open.
    else if (!['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'KeyJ', 'KeyI'].includes(event.code)) handled = false;
    if (!handled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }
}
