export type Snapshot = {
  source: HTMLElement;
  rect: DOMRect;
  style: CSSStyleDeclaration;
};

export function cloneLayer({ source, rect }: Snapshot): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  [clone, ...clone.querySelectorAll<HTMLElement>("*")].forEach((node) => {
    ["id", "autofocus", "href", "name"].forEach((attribute) => node.removeAttribute(attribute));
    if (node.matches("a,button,input,select,textarea,[tabindex]")) node.tabIndex = -1;
  });
  Object.assign(clone.style, {
    position: "absolute",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    minHeight: "0",
    maxWidth: "none",
    margin: "0",
    pointerEvents: "none",
  });
  return clone;
}

export function advances(source: HTMLElement): number[] {
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT),
    range = document.createRange();
  const left = source.getBoundingClientRect().left,
    result = [0];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.parentElement?.closest('[aria-hidden="true"]')) continue;
    let offset = 0;
    for (const letter of node.textContent ?? "") {
      offset += letter.length;
      range.setStart(node, 0);
      range.setEnd(node, offset);
      const rect = range.getBoundingClientRect();
      if (letter.trim()) result.push(Math.max(0, rect.right - left));
    }
  }
  return result;
}
