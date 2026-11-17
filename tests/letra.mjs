// Simula la letra grande de Android (textZoom): agranda solo el texto, no los anchos ni los íconos
export const LETRA_GRANDE = z => {
  const px = e => parseFloat(getComputedStyle(e).fontSize);
  const escalar = () => {
    if (!document.body) return;
    if (!document.body.dataset.tz) { document.body.style.fontSize = (px(document.body) * z) + 'px'; document.body.dataset.tz = 1; }
    for (const e of document.body.querySelectorAll('*:not([data-tz])')) {
      const p = e.parentElement; e.dataset.tz = 1;
      if (!p || /^(svg|path|circle|rect|ellipse|line|g|text)$/i.test(e.tagName)) continue;
      const a = px(e), b = px(p);
      if (Math.abs(a - b) > 0.01) e.style.fontSize = (a * z) + 'px';
    }
  };
  new MutationObserver(escalar).observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', escalar);
};
