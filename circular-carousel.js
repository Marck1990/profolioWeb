(() => {
    const carousel = document.querySelector("#proyectos .circular-carousel");
    if (!carousel) return;

    const stage = carousel.querySelector(".circular-carousel-stage");
    const ring = carousel.querySelector(".circular-carousel-ring");
    const status = carousel.querySelector(".circular-carousel-status");
    const panels = Array.from(carousel.querySelectorAll(".project-carousel-details"));
    if (panels.length < 3) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const count = panels.length;
    const step = 360 / count;
    const driftSpeed = -12;
    const momentum = 0.6;
    const captionFadeStart = Math.cos(20 * Math.PI / 180);
    const captionFadeEnd = Math.cos(55 * Math.PI / 180);
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const wrap = index => (index % count + count) % count;
    const titles = panels.map(panel => panel.querySelector("h3").textContent.trim());
    const images = panels.map(panel => panel.querySelector("img"));
    if (images.some(image => !image)) return;

    let turn = 0;
    let drift = 0;
    let inertia = 0;
    let target = null;
    let tilt = 0;
    let tiltTarget = 0;
    let active = -1;
    let frame = 0;
    let previous = 0;
    let visible = !("IntersectionObserver" in window);
    let introduced = false;
    let hovering = false;
    let resumeTimer = 0;
    let gesture;
    let suppressClick = false;
    let bounds;
    let panelEntrance;
    let panelExit;

    const slides = images.map((image, index) => {
        const slide = document.createElement("div");
        slide.className = "circular-carousel-slide";
        slide.setAttribute("role", "group");
        slide.setAttribute("aria-roledescription", "slide");
        slide.setAttribute("aria-label", `${titles[index]}, ${index + 1} de ${count}`);
        slide.style.setProperty("--slide-angle", `${-index * step}deg`);
        slide.style.setProperty("--slide-delay", `${index * 30}ms`);

        const card = document.createElement("button");
        card.type = "button";
        card.tabIndex = -1;
        card.className = "circular-carousel-card";
        card.setAttribute("aria-label", `Mostrar ${titles[index]}`);
        card.addEventListener("click", event => {
            if (!suppressClick || !event.detail) select(index);
            suppressClick = false;
        });
        const caption = document.createElement("span");
        caption.className = "circular-carousel-caption";
        caption.textContent = titles[index];
        caption.setAttribute("aria-hidden", "true");

        const picture = document.createElement("span");
        picture.className = "circular-carousel-image";
        image.draggable = false;
        picture.append(image);
        card.append(caption, picture);
        slide.append(card);
        ring.append(slide);
        return slide;
    });
    const captions = ring.querySelectorAll(".circular-carousel-caption");

    function finishPanelExit() {
        if (!panelExit) return;
        const { panel, animation } = panelExit;
        panelExit = null;
        animation.cancel();
        panel.hidden = true;
        panel.inert = false;
        panel.classList.remove("is-outgoing");
    }

    function showPanel(next, previous) {
        finishPanelExit();
        panelEntrance?.cancel();
        const incoming = panels[next];
        const outgoing = panels[previous];
        incoming.hidden = false;
        if (!outgoing) return;
        if (outgoing.contains(document.activeElement)) carousel.focus({ preventScroll: true });
        if (motion.matches || !incoming.animate) {
            outgoing.hidden = true;
            return;
        }

        outgoing.inert = true;
        outgoing.classList.add("is-outgoing");
        const exit = outgoing.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 85, easing: "ease-out", fill: "forwards"
        });
        panelExit = { panel: outgoing, animation: exit };
        exit.addEventListener("finish", () => {
            if (panelExit?.animation === exit) finishPanelExit();
        }, { once: true });
        panelEntrance = incoming.animate([
            { opacity: 0, transform: "translateY(4px)" },
            { opacity: 1, transform: "translateY(0)" }
        ], { delay: 65, duration: 175, easing: "ease-out", fill: "backwards" });
    }

    function paint() {
        ring.style.setProperty("--carousel-turn", `${-turn}deg`);
        ring.style.setProperty("--carousel-tilt", `${-7 + tilt}deg`);
        slides.forEach((slide, index) => {
            const facing = Math.cos((turn + index * step) * Math.PI / 180);
            const depth = (1 - facing) / 2;
            const caption = clamp((facing - captionFadeEnd) / (captionFadeStart - captionFadeEnd), 0, 1);
            slide.style.setProperty("--slide-depth", depth);
            slide.style.setProperty("--caption-opacity", caption * caption * (3 - 2 * caption));
        });

        const next = wrap(Math.round(-turn / step));
        if (next === active) return;
        if (active >= 0) {
            slides[active].classList.remove("is-active");
            slides[active].removeAttribute("aria-current");
        }
        showPanel(next, active);
        active = next;
        slides[active].classList.add("is-active");
        slides[active].setAttribute("aria-current", "true");
        status.textContent = `${titles[active]}, ${active + 1} de ${count}`;
        carousel.dispatchEvent(new CustomEvent("project-panel-change", { detail: panels[active] }));
    }

    function measure() {
        const size = slides[0].offsetHeight;
        const stageHeight = stage.clientHeight;
        const baseGap = clamp(stageHeight * 0.12 - 45, 20, 45);
        // El título está por encima del origen de la tarjeta, con su margen incluido.
        const captionSpace = Math.max(...Array.from(captions, caption => -caption.offsetTop));
        const gap = baseGap + Math.max(captionSpace, clamp(stageHeight * 0.075, 35, 50));
        // El radio es la apotema del polígono de tarjetas, con la separación incluida.
        const radius = (size + gap) / (2 * Math.tan(Math.PI / count));
        ring.style.setProperty("--carousel-radius", `${radius}px`);
        stage.style.setProperty("--carousel-perspective", `${clamp(stageHeight * 2.8, 1400, 2100)}px`);
        bounds = null;
    }

    function canDrift() {
        const focused = document.activeElement;
        const reading = carousel.contains(focused) && focused.matches(":focus-visible, .project-carousel-details *");
        return !motion.matches && !hovering && !reading
            && !resumeTimer && !gesture && target === null && !inertia;
    }

    function stopFrame() {
        cancelAnimationFrame(frame);
        frame = previous = 0;
    }

    function schedule() {
        if (!frame && visible && !document.hidden) frame = requestAnimationFrame(animate);
    }

    function animate(now) {
        frame = 0;
        if (!visible || document.hidden) return;

        const dt = previous ? Math.min((now - previous) / 1000, 0.04) : 1 / 60;
        previous = now;
        const driftTarget = canDrift() ? driftSpeed : 0;
        drift += (driftTarget - drift) * (1 - Math.exp(-7 * dt));
        if (Math.abs(driftTarget - drift) < 0.1) drift = driftTarget;

        if (target !== null) {
            turn += (target - turn) * (1 - Math.exp(-9 * dt));
            if (Math.abs(target - turn) < 0.18) {
                turn = target;
                target = null;
            }
        } else if (inertia) {
            turn += inertia * dt;
            inertia *= Math.exp(-dt * (12 - momentum * 7));
            if (Math.abs(inertia) < 15) {
                inertia = 0;
                target = Math.round(turn / step) * step;
            }
        } else if (!gesture) {
            turn += drift * dt;
        }

        tilt += (tiltTarget - tilt) * (1 - Math.exp(-8 * dt));
        if (Math.abs(tiltTarget - tilt) < 0.06) tilt = tiltTarget;
        if (target === null && !gesture && Math.abs(turn) > 720) turn %= 360;
        paint();

        if (drift || driftTarget || inertia || target !== null || tilt !== tiltTarget) schedule();
        else previous = 0;
    }

    function delayDrift() {
        clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => {
            resumeTimer = 0;
            schedule();
        }, 450);
    }

    function select(index) {
        const destination = -wrap(index) * step;
        const nearest = destination + Math.round((turn - destination) / 360) * 360;
        inertia = drift = 0;
        delayDrift();
        if (motion.matches) {
            target = null;
            turn = nearest;
            paint();
        } else {
            target = nearest;
            schedule();
        }
    }

    function nextProject(direction) {
        select((target === null ? active : Math.round(-target / step)) + direction);
    }

    carousel.addEventListener("keydown", event => {
        if (gesture || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
        if (event.key === "ArrowUp") nextProject(-1);
        else if (event.key === "ArrowDown") nextProject(1);
        else if (event.key === "Home") select(0);
        else if (event.key === "End") select(count - 1);
        else if (event.target !== carousel || !["Enter", " "].includes(event.key)) return;
        event.preventDefault();
    });

    carousel.addEventListener("focusin", () => {
        drift = 0;
        schedule();
    });
    carousel.addEventListener("focusout", schedule);
    carousel.addEventListener("pointerenter", event => {
        if (event.pointerType === "touch") return;
        hovering = true;
        clearTimeout(resumeTimer);
        resumeTimer = 0;
        drift = 0;
        schedule();
    });
    carousel.addEventListener("pointerleave", event => {
        if (event.pointerType === "touch" || !hovering) return;
        hovering = false;
        delayDrift();
    });
    stage.addEventListener("pointerleave", () => {
        tiltTarget = 0;
        bounds = null;
        schedule();
    });

    stage.addEventListener("pointerdown", event => {
        if (!event.isPrimary || event.button !== 0 || gesture) return;
        suppressClick = false;
        drift = inertia = 0;
        target = null;
        bounds = stage.getBoundingClientRect();
        // En touch el gesto vertical sigue reservado al scroll de la página.
        const axis = event.pointerType === "touch" ? "clientX" : "clientY";
        const crossAxis = axis === "clientX" ? "clientY" : "clientX";
        gesture = {
            id: event.pointerId, axis, crossAxis, start: event[axis], crossStart: event[crossAxis],
            position: event[axis], time: event.timeStamp, velocity: 0, dragging: false,
            sensitivity: step / Math.max(1, slides[0].offsetHeight)
        };
    });

    stage.addEventListener("pointermove", event => {
        if (!gesture) {
            if (motion.matches || event.pointerType === "touch") return;
            bounds ??= stage.getBoundingClientRect();
            tiltTarget = clamp((event.clientX - bounds.left) / bounds.width - 0.5, -0.5, 0.5) * 3;
            schedule();
            return;
        }
        if (event.pointerId !== gesture.id) return;
        if (!gesture.dragging) {
            const travel = Math.abs(event[gesture.axis] - gesture.start);
            const sideways = Math.abs(event[gesture.crossAxis] - gesture.crossStart);
            if (sideways > 8 && sideways > travel) {
                gesture = undefined;
                delayDrift();
                return;
            }
            if (travel < 7 || travel <= sideways) return;
            gesture.dragging = true;
            stage.classList.add("is-dragging");
            stage.setPointerCapture(event.pointerId);
        }

        const position = event[gesture.axis];
        const delta = (position - gesture.position) * gesture.sensitivity;
        const seconds = Math.max(0.008, (event.timeStamp - gesture.time) / 1000);
        gesture.velocity = clamp(gesture.velocity * 0.3 + delta / seconds * 0.7, -320, 320);
        gesture.position = position;
        gesture.time = event.timeStamp;
        turn += delta;
        schedule();
    });

    function release(event) {
        if (event.pointerId !== gesture?.id) return;
        const { dragging, velocity, time } = gesture;
        gesture = undefined;
        stage.classList.remove("is-dragging");
        delayDrift();
        if (!dragging) return;
        suppressClick = true;
        if (motion.matches) {
            turn = Math.round(turn / step) * step;
            paint();
            return;
        }
        inertia = event.type === "pointerup" && event.timeStamp - time < 100 ? velocity * momentum : 0;
        if (!inertia) target = Math.round(turn / step) * step;
        schedule();
    }

    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    stage.addEventListener("lostpointercapture", release);
    motion.addEventListener("change", () => {
        if (motion.matches) {
            finishPanelExit();
            panelEntrance?.cancel();
            tilt = tiltTarget = drift = inertia = 0;
            if (!gesture) turn = target ?? Math.round(turn / step) * step;
            target = null;
            paint();
        }
        schedule();
    });
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stopFrame();
        else schedule();
    });

    function enterView() {
        if (!introduced) {
            introduced = true;
            if (!motion.matches) stage.classList.add("is-rising");
        }
        schedule();
    }

    panels.forEach(panel => { panel.hidden = true; });
    carousel.setAttribute("role", "region");
    carousel.setAttribute("aria-roledescription", "carousel");
    carousel.setAttribute("aria-label", "Proyectos finalizados");
    carousel.tabIndex = 0;
    carousel.classList.add("is-ready");
    stage.hidden = false;
    measure();
    paint();

    if ("ResizeObserver" in window) {
        const resize = new ResizeObserver(measure);
        resize.observe(stage);
        resize.observe(slides[0]);
        captions.forEach(caption => resize.observe(caption));
    } else {
        window.addEventListener("resize", measure);
    }
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) enterView();
            else stopFrame();
        }).observe(stage);
    } else {
        enterView();
    }
})();
