/**
 * The top-right panels (display settings, worlds) share one place on the screen: when one opens,
 * the others close. Each panel announces itself and listens for the others.
 */
const EVENT = 'game:panel-open';

export function announceOpenPanel(id: string): void {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
}

export function onOtherPanelOpen(id: string, close: () => void): void {
  window.addEventListener(EVENT, (event) => {
    if ((event as CustomEvent<string>).detail !== id) close();
  });
}
