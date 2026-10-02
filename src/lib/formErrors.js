/** Scroll to and focus the first field that has an inline error. */
export function focusFirstInvalid(errors = {}) {
  const names = Object.keys(errors).filter((name) => errors[name]);
  if (!names.length || typeof document === "undefined") return;
  window.requestAnimationFrame(() => {
    for (const name of names) {
      const node = document.querySelector(`[data-field="${name}"]`);
      if (!node) continue;
      node.scrollIntoView({ behavior: "smooth", block: "center" });
      const focusable = node.matches("input, textarea, select, button")
        ? node
        : node.querySelector("input, textarea, select, button");
      if (focusable && typeof focusable.focus === "function") focusable.focus();
      return;
    }
  });
}

export function invalidInputClass(hasError, base = "") {
  return hasError
    ? `${base} border-red-500 focus:border-red-500 ring-1 ring-red-200`.trim()
    : base;
}

export function hasFieldErrors(errors = {}) {
  return Object.values(errors).some(Boolean);
}
