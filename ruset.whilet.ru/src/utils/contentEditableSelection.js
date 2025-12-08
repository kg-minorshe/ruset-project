const isText = (node) => node && node.nodeType === Node.TEXT_NODE;

const getPath = (root, node) => {
  const path = [];
  let current = node;
  while (current && current !== root) {
    const parent = current.parentNode;
    if (!parent) return null;
    path.unshift(Array.prototype.indexOf.call(parent.childNodes, current));
    current = parent;
  }
  return current === root ? path : null;
};

const resolvePath = (root, path = []) => {
  let current = root;
  for (const index of path) {
    if (!current || !current.childNodes || index >= current.childNodes.length) {
      return null;
    }
    current = current.childNodes[index];
  }
  return current;
};

const clampOffset = (node, offset) => {
  if (isText(node)) {
    return Math.min(offset, node.textContent?.length ?? 0);
  }
  return Math.min(offset, node?.childNodes?.length ?? 0);
};

export const saveSelection = (root) => {
  if (!root) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  const startPath = getPath(root, range.startContainer);
  const endPath = getPath(root, range.endContainer);
  if (!startPath || !endPath) return null;

  return {
    startPath,
    startOffset: range.startOffset,
    endPath,
    endOffset: range.endOffset,
    isCollapsed: range.collapsed,
  };
};

export const restoreSelection = (root, saved) => {
  if (!root || !saved) return null;

  const startNode = resolvePath(root, saved.startPath);
  const endNode = resolvePath(root, saved.endPath);
  if (!startNode || !endNode) return null;

  const range = document.createRange();
  range.setStart(startNode, clampOffset(startNode, saved.startOffset));
  range.setEnd(endNode, clampOffset(endNode, saved.endOffset));
  if (saved.isCollapsed) {
    range.collapse(true);
  }

  const selection = window.getSelection();
  if (!selection) return null;
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
};

export const placeCaretAtEnd = (root) => {
  if (!root) return null;
  const range = document.createRange();
  range.selectNodeContents(root);
  range.collapse(false);

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }

  return range;
};
