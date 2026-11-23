(() => {
    const folder = document.querySelector("#proyectos .folder-float");
    if (!folder) return;

    const carousel = folder.closest(".circular-carousel");
    const trigger = folder.querySelector(".folder-float-trigger");
    const links = folder.querySelector(".folder-float-links");
    let source;
    let closeTimer;
    let hovered = false;

    function setOpen(open, restoreFocus = false) {
        clearTimeout(closeTimer);
        if (open && !links.childElementCount) return;
        if (!open && restoreFocus && links.contains(document.activeElement)) {
            trigger.focus({ preventScroll: true });
        }
        trigger.setAttribute("aria-expanded", String(open));
        links.inert = !open;
        folder.classList.toggle("is-open", open);
    }

    carousel.addEventListener("project-panel-change", event => {
        const nextSource = event.detail.querySelector(".project-links");
        if (source === nextSource) return;

        setOpen(false, true);
        if (source) source.append(...links.children);
        source = nextSource;
        if (source) {
            source.hidden = true;
            links.append(...source.querySelectorAll("a"));
        }
        const total = links.childElementCount;
        folder.hidden = total === 0;
        folder.classList.toggle("has-pair", total > 1);
    });

    trigger.addEventListener("pointerenter", event => {
        if (event.pointerType === "mouse") setOpen(true);
    });

    folder.addEventListener("pointerenter", event => {
        if (event.pointerType !== "mouse") return;
        hovered = true;
        clearTimeout(closeTimer);
    });

    folder.addEventListener("pointerleave", event => {
        if (event.pointerType !== "mouse") return;
        hovered = false;
        closeTimer = setTimeout(() => {
            const focus = document.activeElement;
            if (!(folder.contains(focus) && focus.matches(":focus-visible"))) setOpen(false, true);
        }, 170);
    });

    trigger.addEventListener("click", () => {
        setOpen(trigger.getAttribute("aria-expanded") !== "true");
    });

    folder.addEventListener("keydown", event => {
        if (event.key !== "Escape" || trigger.getAttribute("aria-expanded") !== "true") return;
        event.preventDefault();
        setOpen(false, true);
    });

    folder.addEventListener("focusout", event => {
        if (!hovered && !folder.contains(event.relatedTarget)) setOpen(false);
    });

    document.addEventListener("pointerdown", event => {
        if (!folder.contains(event.target)) setOpen(false, true);
    }, { passive: true });

    function closeAfterSelection(event) {
        if (event.target.closest("a")) setOpen(false, true);
    }

    links.addEventListener("click", closeAfterSelection);
    links.addEventListener("auxclick", event => {
        if (event.button === 1) closeAfterSelection(event);
    });
})();
