// Only the presentation width is stored; workspace records are never changed.
export function createRoadmapResizer(root, storageKey) {
  let preferredWidth = null;
  let drag = null;
  try {
    const saved = Number(localStorage.getItem(storageKey));
    if (Number.isFinite(saved) && saved >= 180 && saved <= 640) preferredWidth = saved;
  } catch {}
  const maximum = () => Math.max(220, Math.min(640, window.innerWidth - 64));
  const defaultWidth = () => window.innerWidth <= 700 ? 220 : 270;
  const clamp = (width) => Math.round(Math.max(180, Math.min(maximum(), width)));
  const sync = () => {
    const width = clamp(preferredWidth ?? defaultWidth());
    root.style.setProperty("--roadmap-label-width", `${width}px`);
    const handle = root.querySelector(".roadmap-divider");
    if (handle) {
      handle.setAttribute("aria-valuenow", width);
      handle.setAttribute("aria-valuemax", maximum());
      handle.setAttribute("aria-valuetext", `${width} pixels`);
    }
    return width;
  };
  const remember = () => {
    try {
      if (preferredWidth === null) localStorage.removeItem(storageKey);
      else localStorage.setItem(storageKey, String(preferredWidth));
    } catch {}
  };
  const reset = () => { preferredWidth = null; sync(); remember(); };
  root.addEventListener("pointerdown", (event) => {
    const handle = event.target.closest(".roadmap-divider");
    if (!handle || event.button !== 0 || drag) return;
    event.preventDefault();
    handle.focus({ preventScroll: true });
    drag = { id: event.pointerId, x: event.clientX, width: sync(), previous: preferredWidth };
    handle.setPointerCapture(event.pointerId);
    document.body.classList.add("resizing-roadmap");
  });
  root.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    preferredWidth = clamp(drag.width + event.clientX - drag.x);
    sync();
  });
  const finish = (event) => {
    if (!drag || event.pointerId !== drag.id) return;
    if (event.type === "pointercancel") preferredWidth = drag.previous;
    drag = null;
    document.body.classList.remove("resizing-roadmap");
    sync();
    remember();
  };
  root.addEventListener("pointerup", finish);
  root.addEventListener("pointercancel", finish);
  root.addEventListener("lostpointercapture", finish);
  root.addEventListener("dblclick", (event) => {
    if (event.target.closest(".roadmap-divider")) reset();
  });
  root.addEventListener("keydown", (event) => {
    if (!event.target.matches(".roadmap-divider")) return;
    const step = event.shiftKey ? 50 : 20;
    if (event.key === "ArrowLeft") preferredWidth = clamp(sync() - step);
    else if (event.key === "ArrowRight") preferredWidth = clamp(sync() + step);
    else if (event.key === "Home") preferredWidth = 180;
    else if (event.key === "End") preferredWidth = maximum();
    else if (event.key === "Enter") { event.preventDefault(); reset(); return; }
    else return;
    event.preventDefault();
    sync();
    remember();
  });
  window.addEventListener("resize", sync);
  return sync;
}
