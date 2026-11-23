(() => {
    const title = document.querySelector(".hero-title");
    const wordmark = title?.querySelector(".tech-text");
    if (!wordmark) return;

    const canvas = wordmark.querySelector("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    const name = wordmark.querySelector(".tech-text-name");
    const baseline = wordmark.querySelector(".tech-text-baseline");
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const compact = matchMedia("(max-width: 560px)");
    const spring = 320;
    const damping = 2 * Math.sqrt(spring) * (1 - 0.4);
    const sweepDelay = 3200;
    const sweepLetterDuration = 700;
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

    let letters = [];
    let width = 0;
    let height = 0;
    let accent;
    let fontSize;
    let visible = !("IntersectionObserver" in window);
    let available = true;
    let frame = 0;
    let lastFrame = 0;
    let timer = 0;
    let sweepStart = 0;
    let specksUntil = 0;
    let hover = null;
    let press = null;
    let pointerOver = false;

    function enabled() {
        return available && visible && !document.hidden && !motion.matches && letters.length > 0;
    }

    function requestDraw() {
        if (!frame && enabled()) frame = requestAnimationFrame(draw);
    }

    function cancelSweep() {
        clearTimeout(timer);
        timer = 0;
        if (sweepStart) {
            for (const letter of letters) letter.reveal = 0;
        }
        sweepStart = 0;
    }

    function scheduleSweep() {
        if (timer || sweepStart || pointerOver || hover || press || !enabled()) return;

        timer = setTimeout(() => {
            timer = 0;
            sweepStart = performance.now();
            requestDraw();
        }, sweepDelay);
    }

    function reset() {
        cancelSweep();
        cancelAnimationFrame(frame);
        frame = lastFrame = 0;
        const pointerId = press?.id;
        hover = press = null;
        if (pointerId !== undefined && wordmark.hasPointerCapture(pointerId)) {
            wordmark.releasePointerCapture(pointerId);
        }
        wordmark.classList.remove("is-rendering", "can-grab", "is-dragging");
        for (const letter of letters) {
            letter.dx = letter.dy = letter.vx = letter.vy = letter.reveal = 0;
        }
    }

    function measure() {
        reset();
        if (!available || motion.matches) {
            canvas.hidden = true;
            wordmark.classList.remove("is-interactive");
            return;
        }

        canvas.hidden = false;
        const bounds = canvas.getBoundingClientRect();
        width = bounds.width;
        height = bounds.height;
        if (!width || !height) return;

        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
        context.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);

        const style = getComputedStyle(name);
        fontSize = parseFloat(style.fontSize);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        accent = style.getPropertyValue("--color-primary").trim() || style.color;
        const line = baseline.getBoundingClientRect().top - bounds.top;
        const range = document.createRange();
        letters = [];

        for (const word of name.querySelectorAll("span:not(.tech-text-baseline)")) {
            const text = word.firstChild;
            const color = getComputedStyle(word).color;
            for (let index = 0; index < text.length; index++) {
                range.setStart(text, index);
                range.setEnd(text, index + 1);
                const box = range.getBoundingClientRect();
                const char = text.data[index];
                const metrics = context.measureText(char);
                const x = box.left - bounds.left;
                letters.push({
                    char, color, x, line,
                    left: x - metrics.actualBoundingBoxLeft,
                    right: x + metrics.actualBoundingBoxRight,
                    top: line - metrics.actualBoundingBoxAscent,
                    bottom: line + metrics.actualBoundingBoxDescent,
                    center: x + box.width / 2,
                    dx: 0, dy: 0, vx: 0, vy: 0, reveal: 0
                });
            }
        }

        wordmark.classList.toggle("is-interactive", letters.length > 0);
        scheduleSweep();
    }

    function drawSelection(letter, now) {
        const left = letter.left + letter.dx - 3;
        const top = letter.top + letter.dy - 3;
        const w = letter.right - letter.left + 6;
        const h = letter.bottom - letter.top + 6;
        const strength = letter.reveal * 0.9;
        context.strokeStyle = context.fillStyle = accent;
        context.globalAlpha = strength;
        context.lineWidth = 1;
        context.setLineDash([4, 2]);
        context.strokeRect(left, top, w, h);
        context.setLineDash([]);

        for (const [x, y] of [[left, top], [left + w, top], [left, top + h], [left + w, top + h]]) {
            context.fillRect(x - 1, y - 1, 2, 2);
        }

        const count = compact.matches ? 8 : 15;
        for (let index = 0; index < count; index++) {
            const phase = index * 2.4 + letter.center;
            const fading = 0.5 + 0.5 * Math.sin(now / 155 + index * 1.9);
            const x = left + w / 2 + Math.cos(phase) * (w / 2 + 4 + index % 4);
            const y = top + h / 2 + Math.sin(phase) * (h / 2 + 3 + index % 3);
            context.globalAlpha = strength * fading * 0.62;
            const size = index % 7 === 0 ? 3 : 2;
            context.fillRect(x, y, size, size);
        }

        if (!compact.matches) {
            const offset = value => (value > 0 ? "+" : "") + Math.round(value);
            const label = press?.dragging
                ? `${offset(letter.dx)}, ${offset(letter.dy)}`
                : `${letter.char} ${Math.round(w - 6)} × ${Math.round(h - 6)}`;
            context.save();
            context.font = "9px monospace";
            const labelWidth = context.measureText(label).width;
            const labelX = clamp(left, 2, width - labelWidth - 2);
            const labelY = top > 12 ? top - 4 : Math.min(height - 2, top + h + 11);
            context.globalAlpha = strength;
            context.fillText(label, labelX, labelY);
            context.restore();
        }
    }

    function draw(now) {
        frame = 0;
        if (!enabled()) return;

        const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.025) : 1 / 60;
        lastFrame = now;
        const scanIndex = Math.floor((now - sweepStart) / sweepLetterDuration);
        const scan = sweepStart ? letters[scanIndex] : null;
        const selected = press?.letter || hover || scan;
        let moving = false;
        let painted = false;

        context.clearRect(0, 0, width, height);
        for (const letter of letters) {
            if (letter !== press?.letter) {
                letter.vx += (-spring * letter.dx - damping * letter.vx) * dt;
                letter.vy += (-spring * letter.dy - damping * letter.vy) * dt;
                letter.dx += letter.vx * dt;
                letter.dy += letter.vy * dt;
                if (Math.hypot(letter.dx, letter.dy, letter.vx, letter.vy) > 0.25) {
                    moving = true;
                } else {
                    letter.dx = letter.dy = letter.vx = letter.vy = 0;
                }
            }

            const target = letter === selected ? 1 : 0;
            const delta = target - letter.reveal;
            letter.reveal = Math.abs(delta) < 0.015
                ? target
                : letter.reveal + delta * (1 - Math.exp(-18 * dt));
            moving ||= letter.reveal !== target;
            painted ||= letter.reveal > 0 || letter.dx !== 0 || letter.dy !== 0;

            context.fillStyle = letter.color;
            if (Math.hypot(letter.dx, letter.dy) > 2) {
                context.strokeStyle = accent;
                context.globalAlpha = 0.28;
                context.lineWidth = 1;
                context.setLineDash([4, 2]);
                context.strokeText(letter.char, letter.x, letter.line);
            }

            context.globalAlpha = 1 - letter.reveal * 0.88;
            context.fillText(letter.char, letter.x + letter.dx, letter.line + letter.dy);
            if (letter.reveal > 0) {
                context.globalAlpha = letter.reveal;
                context.strokeStyle = accent;
                context.lineWidth = 1.5;
                context.setLineDash([4, 2]);
                context.strokeText(letter.char, letter.x + letter.dx, letter.line + letter.dy);
                drawSelection(letter, now);
            }
        }

        wordmark.classList.toggle("is-rendering", painted);
        if (moving || scan || (selected && now < specksUntil)) {
            requestDraw();
        } else {
            sweepStart = 0;
            lastFrame = 0;
            scheduleSweep();
        }
    }

    function point(event) {
        const bounds = canvas.getBoundingClientRect();
        return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
    }

    function hitTest(position, reach) {
        let closest = null;
        let distance = reach;
        for (const letter of letters) {
            const x = letter.center + letter.dx;
            const y = clamp(position.y, letter.top + letter.dy, letter.bottom + letter.dy);
            const gap = Math.hypot(position.x - x, position.y - y);
            if (gap <= distance) {
                closest = letter;
                distance = gap;
            }
        }
        return closest;
    }

    title.addEventListener("pointermove", event => {
        if (!enabled()) return;
        if (press && event.pointerId !== press.id) return;

        const position = point(event);
        specksUntil = performance.now() + 900;
        if (press) {
            const { letter } = press;
            press.dragging ||= Math.hypot(event.clientX - press.clientX, event.clientY - press.clientY) > 5;
            if (press.dragging) {
                wordmark.classList.add("is-dragging");
                letter.dx = clamp(position.x - press.x, 6 - letter.left, width - 6 - letter.right);
                letter.dy = clamp(position.y - press.y, 6 - letter.top, height - 6 - letter.bottom);
            }
        } else if (event.pointerType !== "touch") {
            cancelSweep();
            hover = hitTest(position, fontSize * (compact.matches ? 0.48 : 0.65));
            wordmark.classList.toggle("can-grab", Boolean(hover));
        }
        requestDraw();
    });

    title.addEventListener("pointerleave", () => {
        hover = null;
        wordmark.classList.remove("can-grab");
        requestDraw();
    });

    wordmark.addEventListener("pointerenter", event => {
        if (event.pointerType === "touch") return;
        pointerOver = true;
        cancelSweep();
        requestDraw();
    });

    wordmark.addEventListener("pointerleave", () => {
        pointerOver = false;
        scheduleSweep();
    });

    wordmark.addEventListener("pointerdown", event => {
        if (!enabled() || press || event.button !== 0 || !event.isPrimary) return;

        const position = point(event);
        const letter = hitTest(position, fontSize * 0.48);
        if (!letter) return;

        cancelSweep();
        specksUntil = performance.now() + 900;
        letter.vx = letter.vy = 0;
        press = {
            id: event.pointerId, letter, dragging: false, start: performance.now(),
            clientX: event.clientX, clientY: event.clientY,
            x: position.x - letter.dx, y: position.y - letter.dy
        };
        wordmark.setPointerCapture(event.pointerId);
        requestDraw();
    });

    function release(event) {
        if (press?.id !== event.pointerId) return;

        if (event.type === "pointerup" && !press.dragging && performance.now() - press.start < 330) {
            const index = letters.indexOf(press.letter);
            for (let neighbor = Math.max(index - 2, 0); neighbor <= Math.min(index + 2, letters.length - 1); neighbor++) {
                letters[neighbor].vy -= fontSize * 4 * 0.38 ** Math.abs(neighbor - index);
            }
        }
        press = null;
        hover = event.pointerType === "touch" || event.type !== "pointerup"
            ? null : hitTest(point(event), fontSize * 0.48);
        wordmark.classList.remove("is-dragging");
        wordmark.classList.toggle("can-grab", Boolean(hover));
        requestDraw();
    }

    wordmark.addEventListener("pointerup", release);
    wordmark.addEventListener("pointercancel", release);
    wordmark.addEventListener("lostpointercapture", release);
    motion.addEventListener("change", measure);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) reset();
        else scheduleSweep();
    });

    canvas.addEventListener("contextlost", () => {
        available = false;
        measure();
    });
    canvas.addEventListener("contextrestored", () => {
        available = true;
        measure();
    });

    window.addEventListener("resize", measure);
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(wordmark);
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) scheduleSweep();
            else reset();
        }).observe(wordmark);
    }
    measure();
})();
