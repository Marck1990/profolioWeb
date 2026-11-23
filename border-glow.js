(() => {
    const card = document.querySelector("#proyectos .project-detail-glow");
    if (!card) return;

    const edgeSensitivity = 30;
    const style = card.style;
    const dim = () => style.setProperty("--edge-proximity", "0");

    card.addEventListener("pointermove", event => {
        if (event.pointerType === "touch" || !card.closest(".is-ready")) return;

        const bounds = card.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        const distance = Math.min(x, y, bounds.width - x, bounds.height - y);
        const proximity = Math.max(0, Math.min(1, 1 - distance / edgeSensitivity));
        if (!proximity) {
            dim();
            return;
        }

        const halfWidth = bounds.width / 2;
        const halfHeight = bounds.height / 2;
        const dx = x - halfWidth;
        const dy = y - halfHeight;
        const scale = Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight);
        if (!scale) return;

        style.setProperty("--cursor-angle", `${Math.atan2(dx, -dy) * 180 / Math.PI}deg`);
        style.setProperty("--edge-x", `${halfWidth + dx / scale}px`);
        style.setProperty("--edge-y", `${halfHeight + dy / scale}px`);
        style.setProperty("--edge-proximity", proximity * proximity * (3 - 2 * proximity));
    }, { passive: true });

    card.addEventListener("pointerleave", dim);
    card.addEventListener("pointercancel", dim);
})();
