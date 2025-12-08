import rangy from "rangy";
import "rangy/lib/rangy-selectionsaverestore";

let rangyInitialized = false;

const initRangy = () => {
  if (typeof window === "undefined") return false;
  if (rangyInitialized) return true;
  if (!rangy.initialized) {
    rangy.init();
  }
  rangyInitialized = true;
  return true;
};

export const saveSelection = (root) => {
  if (!root) return null;
  if (!initRangy()) return null;
  const selection = rangy.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) {
    return null;
  }

  return rangy.saveSelection(root);
};

export const restoreSelection = (root, saved) => {
  if (!root || !saved) return null;
  if (!initRangy()) return null;

  rangy.restoreSelection(saved);
  const selection = rangy.getSelection();
  const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
  rangy.removeMarkers(saved);
  return range;
};

export const placeCaretAtEnd = (root) => {
  if (!root) return null;
  if (!initRangy()) return null;

  const range = rangy.createRange();
  range.selectNodeContents(root);
  range.collapse(false);

  const selection = rangy.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);

  return range;
};
