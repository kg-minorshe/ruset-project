const rangy = {
  initialized: false,
  init() {
    if (this.initialized) return;
    this.initialized = true;
  },
  getSelection() {
    if (typeof window === "undefined") return null;
    return window.getSelection();
  },
  createRange() {
    if (typeof document === "undefined") return null;
    return document.createRange();
  },
};

module.exports = rangy;
