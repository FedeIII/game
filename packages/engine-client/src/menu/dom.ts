/**
 * Makes an element: its attributes (a value of null is left out) and its children (text or
 * elements). For the menu, which builds its screens again on each change.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Readonly<Record<string, string | null>> = {},
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) if (value !== null && value !== '') element.setAttribute(name, value);
  element.append(...children);
  return element;
}
