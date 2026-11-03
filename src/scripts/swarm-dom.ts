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

export function textGeometry(source: HTMLElement) {
  const walker = document.createTreeWalker(source, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const lines: DOMRect[] = [];
  const steps: { x: number; y: number; line: number }[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const hidden = node.parentElement?.closest('[aria-hidden="true"]');
    if (hidden && hidden !== source && source.contains(hidden)) continue;
    let offset = 0;
    for (const letter of node.textContent ?? "") {
      range.setStart(node, offset);
      offset += letter.length;
      range.setEnd(node, offset);
      const rect = range.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      let line = lines.findIndex(item => Math.abs(item.top - rect.top) < 2);
      if (line < 0) {
        line = lines.length;
        lines.push(new DOMRect(rect.x, rect.y, rect.width, rect.height));
      } else {
        const previous = lines[line];
        lines[line] = new DOMRect(previous.left, previous.top, Math.max(previous.right, rect.right) - previous.left, Math.max(previous.height, rect.height));
      }
      if (!steps.length) steps.push({ x: rect.left, y: rect.top + rect.height * 0.5, line });
      steps.push({ x: rect.right, y: rect.top + rect.height * 0.5, line });
    }
  }
  return { lines, steps };
}
