import { date, DAY, rescheduleInterval } from "./model.js";

export function installMilestoneDragging(root, { find, propose, firstDay }) {
  let drag = null;
  let suppressClick = false;
  let frame = 0;
  const tip = document.createElement("output");
  tip.className = "drag-date-preview";
  tip.hidden = true;
  tip.setAttribute("aria-live", "polite");
  document.body.append(tip);
  const paint = () => {
    if (!drag?.active) return;
    const { bar, track, row, edge, scroll, originScroll, x, originX } = drag;
    const days = Math.round((x - originX + scroll.scrollLeft - originScroll) / (track.clientWidth / 84));
    drag.dates = rescheduleInterval(row.fields["start-date"], row.fields["end-date"], days, edge);
    const offset = (date(drag.dates.start) - date(firstDay())) / DAY;
    const end = (date(drag.dates.end) - date(firstDay())) / DAY + 1;
    const left = Math.max(0, offset), right = Math.min(84, end);
    bar.style.left = `${left / 84 * 100}%`;
    bar.style.width = `${Math.max(0, right - left) / 84 * 100}%`;
    tip.textContent = `${drag.dates.start} → ${drag.dates.end} · Release to review`;
    tip.hidden = false;
    tip.style.left = `${Math.max(8, Math.min(innerWidth - tip.offsetWidth - 8, x - tip.offsetWidth / 2))}px`;
    tip.style.top = `${Math.max(8, track.getBoundingClientRect().top - tip.offsetHeight - 10)}px`;
  };
  const scrollFrame = () => {
    if (!drag?.active) return;
    const bounds = drag.scroll.getBoundingClientRect();
    const left = Math.max(0, bounds.left), right = Math.min(innerWidth, bounds.right);
    const amount = drag.x < left + 32 ? -8 : drag.x > right - 32 ? 8 : 0;
    if (amount) { drag.scroll.scrollLeft += amount; paint(); }
    frame = requestAnimationFrame(scrollFrame);
  };
  const finish = (cancel = false) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    cancelAnimationFrame(frame);
    current.bar.style.left = current.left;
    current.bar.style.width = current.width;
    current.bar.classList.remove("is-dragging");
    document.body.classList.remove("dragging-milestone");
    tip.hidden = true;
    if (current.control.hasPointerCapture(current.pointerId))
      current.control.releasePointerCapture(current.pointerId);
    if (current.active) {
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      if (!cancel && current.dates &&
        (current.dates.start !== current.row.fields["start-date"] || current.dates.end !== current.row.fields["end-date"]))
        propose(current.row.id, current.dates);
    }
  };
  root.addEventListener("pointerdown", (event) => {
    const control = event.target.closest("[data-drag-milestone]");
    if (!control || event.button !== 0 || drag) return;
    const row = find(control.dataset.dragMilestone);
    if (!row || !date(row.fields["start-date"]) || !date(row.fields["end-date"])) return;
    const bar = control.closest(".milestone-bar"), track = bar.parentElement;
    drag = { control, bar, track, row, edge: control.dataset.edge || "move",
      pointerId: event.pointerId, originX: event.clientX, originY: event.clientY, x: event.clientX,
      scroll: bar.closest(".timeline"), left: bar.style.left, width: bar.style.width, active: false };
    drag.originScroll = drag.scroll.scrollLeft;
    control.setPointerCapture(event.pointerId);
  });
  root.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX;
    if (!drag.active) {
      const dx = Math.abs(event.clientX - drag.originX), dy = Math.abs(event.clientY - drag.originY);
      if (dy > dx && dy > 6) { finish(true); return; }
      if (dx < 6) return;
      drag.active = true;
      drag.bar.classList.add("is-dragging");
      document.body.classList.add("dragging-milestone");
      frame = requestAnimationFrame(scrollFrame);
    }
    event.preventDefault();
    paint();
  });
  root.addEventListener("pointerup", (event) => { if (event.pointerId === drag?.pointerId) finish(); });
  root.addEventListener("pointercancel", (event) => { if (event.pointerId === drag?.pointerId) finish(true); });
  root.addEventListener("lostpointercapture", (event) => { if (event.pointerId === drag?.pointerId) finish(true); });
  root.addEventListener("click", (event) => {
    if (suppressClick && event.target.closest("[data-drag-milestone]")) {
      event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && drag) { event.preventDefault(); finish(true); return; }
    const control = event.target.closest("[data-drag-milestone]");
    if (!control || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    const row = find(control.dataset.dragMilestone);
    if (!row) return;
    propose(row.id, rescheduleInterval(row.fields["start-date"], row.fields["end-date"],
      (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 7 : 1), control.dataset.edge));
  });
  window.addEventListener("blur", () => finish(true));
}
