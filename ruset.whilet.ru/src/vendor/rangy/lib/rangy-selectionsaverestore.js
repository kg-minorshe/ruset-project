const rangy = require("../index.js");

let markerCounter = 0;

const createMarker = (id) => {
  const span = document.createElement("span");
  span.id = id;
  span.setAttribute("data-rangy-marker", "");
  span.style.position = "absolute";
  span.style.width = "0px";
  span.style.height = "0px";
  span.style.overflow = "hidden";
  span.style.lineHeight = "0";
  span.appendChild(document.createTextNode("\u200b"));
  return span;
};

const insertMarker = (range, marker) => {
  const collapsed = range.collapsed;
  const clone = range.cloneRange();
  clone.collapse(collapsed);
  clone.insertNode(marker);
};

const findMarker = (id) => document.getElementById(id);

rangy.saveSelection = (root) => {
  const selection = rangy.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (root && (!root.contains(range.startContainer) || !root.contains(range.endContainer))) {
    return null;
  }

  const startId = `rangy-marker-${Date.now()}-${markerCounter++}`;
  const endId = `rangy-marker-${Date.now()}-${markerCounter++}`;
  const startMarker = createMarker(startId);
  const endMarker = createMarker(endId);

  insertMarker(range, endMarker);
  insertMarker(range, startMarker);

  return {
    startId,
    endId,
  };
};

rangy.restoreSelection = (saved) => {
  if (!saved) return null;
  const selection = rangy.getSelection();
  if (!selection) return null;

  const startMarker = findMarker(saved.startId);
  const endMarker = findMarker(saved.endId);
  if (!startMarker || !endMarker) return null;

  const range = rangy.createRange();
  range.setStartBefore(startMarker);
  range.setEndBefore(endMarker);
  selection.removeAllRanges();
  selection.addRange(range);
  return range;
};

rangy.removeMarkers = (saved) => {
  const startMarker = saved ? findMarker(saved.startId) : null;
  const endMarker = saved ? findMarker(saved.endId) : null;
  if (startMarker && startMarker.parentNode) startMarker.parentNode.removeChild(startMarker);
  if (endMarker && endMarker.parentNode) endMarker.parentNode.removeChild(endMarker);
};

module.exports = rangy;
