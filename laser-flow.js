(() => {
    const region = document.querySelector(".contact-laser-region");
    if (!region) return;

    const surface = region.querySelector(".contact-footer-surface");
    const canvas = region.querySelector(".laser-flow-canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 768px)");
    const descentDelay = 0.10;
    const descentDuration = 0.95;
    const contactTime = descentDelay + descentDuration;
    const bloomDuration = 0.35;
    const spillDuration = 0.42;
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const ease = value => {
        const progress = clamp(value, 0, 1);
        return progress * progress * (3 - 2 * progress);
    };
    const rgba = (color, alpha) => `rgba(${color}, ${alpha})`;
    const css = getComputedStyle(region);
    const blue = "59, 130, 246";
    const ice = "203, 213, 225";
    const colors = Object.fromEntries([
        ["deep", "--color-primary-dark", "30, 58, 138"],
        ["electric", "--color-primary", blue],
        ["highlight", "--color-text-secondary", ice],
        ["aura", "--laser-light", "96, 165, 250"],
        ["white", "--laser-core", "234, 244, 255"]
    ].map(([key, property, fallback]) => {
        const hex = css.getPropertyValue(property).trim().match(/^#([\da-f]{6})$/i)?.[1];
        return [key, hex ? hex.match(/../g).map(value => parseInt(value, 16)).join(", ") : fallback];
    }));

    // A fixed seed keeps the texture stable when changing viewport or motion preference.
    let seed = 3;
    function random() {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
    }
    const makeDust = () => [random(), random(), random(), random()];
    const dust = Array.from({ length: 31 }, makeDust);
    const streaks = Array.from({ length: 17 }, () => [random(), random(), random()]);
    dust.push(...Array.from({ length: 65 }, makeDust));
    const clouds = Array.from({ length: 7 }, (_, index) => ({
        start: 0.14 + index * 0.62,
        life: 4.9 + random() * 4.5,
        drift: (index % 2 === 0 ? -1 : 1) * (0.16 + random() * 0.66),
        depth: random(),
        origin: (random() - 0.5) * 68
    }));
    const smokeTile = 72;
    let smokeAtlas;

    let visible = !("IntersectionObserver" in window);
    let introArmed = !visible;
    let contactVisibility = 0;
    let available = true;
    let needsMeasure = true;
    let frame = 0;
    let previous = 0;
    let elapsed = 0;
    let energy = 0;
    let targetEnergy = 0;
    let reveal = 0;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0, visible: 0 };
    let geometry;

    function gradient(height, color, strength) {
        const beam = ctx.createLinearGradient(0, 0, 0, height);
        beam.addColorStop(0, rgba(color, 0));
        beam.addColorStop(0.24, rgba(color, strength * 0.48));
        beam.addColorStop(0.85, rgba(color, strength * 0.8));
        beam.addColorStop(1, rgba(color, strength));
        return beam;
    }

    function technicalPattern(x, y, width, compact) {
        const frames = new Path2D();
        const data = new Path2D();
        const marks = new Path2D();
        const line = (path, x1, y1, x2, y2) => {
            path.moveTo(x1, y1);
            path.lineTo(x2, y2);
        };
        const circle = (path, cx, cy, radius) => {
            path.moveTo(cx + radius, cy);
            path.arc(cx, cy, radius, 0, Math.PI * 2);
        };
        const panelWidth = clamp(width * 0.14, compact ? 58 : 92, 176);

        function panel(left, top, size, rows, partial = false) {
            const inset = compact ? 7 : 11;
            const h = inset * 3 + rows * 10;
            if (partial) {
                line(frames, left, top + h, left, top);
                line(frames, left, top, left + size * 0.76, top);
                line(frames, left, top + h, left + size * 0.42, top + h);
            } else {
                frames.rect(left, top, size, h);
            }
            line(data, left + inset, top + inset * 2, left + size - inset, top + inset * 2);
            for (let index = 0; index < 3; index++) {
                circle(marks, left + inset + index * 7, top + inset, index === 0 ? 1.8 : 1.15);
            }
            for (let row = 0; row < rows; row++) {
                const baseline = top + inset * 2 + 7 + row * 10;
                const length = [0.66, 0.38, 0.51, 0.24][row];
                line(data, left + inset, baseline, left + size * length, baseline);
                if (!compact && row % 2 === 1) data.rect(left + size * 0.69, baseline - 3, 9, 5);
            }
        }

        panel(x - width * 0.32, y * 0.23, panelWidth, compact ? 2 : 4);
        panel(x + width * 0.16, y * 0.6, panelWidth * 0.78, compact ? 1 : 3, true);
        if (!compact) panel(x - width * 0.21, y * 0.63, panelWidth * 0.76, 3, true);
        if (width > 1024) panel(x + width * 0.24, y * 0.31, panelWidth * 0.57, 2, true);

        const gridX = x - width * 0.39;
        for (let column = 0; column < (compact ? 4 : 7); column++) {
            for (let row = 0; row < (compact ? 2 : 4); row++) {
                const dotX = gridX + column * 7;
                const dotY = y * 0.56 + row * 7;
                line(marks, dotX, dotY, dotX + 1, dotY);
            }
        }
        const scaleX = x + width * 0.073;
        for (let index = 0; index < (compact ? 5 : 10); index++) {
            const tickY = y * 0.21 + index * 9;
            line(marks, scaleX, tickY, scaleX + (index % 3 === 0 ? 8 : 3), tickY);
        }
        if (!compact) {
            const cx = x - width * 0.09;
            const cy = y * 0.46;
            circle(frames, cx, cy, 11);
            line(marks, cx - 16, cy, cx - 6, cy);
            line(marks, cx + 6, cy, cx + 16, cy);
            line(marks, cx, cy - 16, cx, cy - 6);
            line(marks, cx, cy + 6, cx, cy + 16);
        }
        return [
            { path: frames, base: 0.034, boost: 0.16 },
            { path: data, base: 0.05, boost: 0.19 },
            { path: marks, base: 0.067, boost: 0.22 }
        ];
    }

    function measure() {
        const footer = surface.getBoundingClientRect();
        const bounds = canvas.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return false;

        const compact = mobile.matches;
        const tablet = bounds.width <= 1024;
        const ratio = Math.min(window.devicePixelRatio || 1, compact ? 1.05 : tablet ? 1.3 : 1.65, 2000 / bounds.width);
        canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
        canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
        ctx.setTransform(canvas.width / bounds.width, 0, 0, canvas.height / bounds.height, 0, 0);

        const value = Number.parseFloat(getComputedStyle(region).getPropertyValue("--laser-impact"));
        const position = Number.isFinite(value) ? clamp(value / 100, 0.1, 0.9) : 0.58;
        const x = footer.left - bounds.left + footer.width * position;
        const y = footer.top - bounds.top;
        geometry = {
            x, y, width: bounds.width, height: bounds.height, compact, tablet,
            right: footer.right - bounds.left,
            fall: Math.min(bounds.height - y - 8, compact ? 150 : 242),
            spread: clamp(footer.width * 0.28, 90, 405),
            impact: clamp(footer.width * 0.085, 60, 110),
            pattern: technicalPattern(x, y, bounds.width, compact),
            layers: [
                [compact ? 20 : 27, 40, gradient(y, colors.deep, 0.31)],
                [compact ? 13 : 18, 24, gradient(y, colors.electric, 0.4)],
                [6, 11, gradient(y, colors.aura, 0.84)],
                [2.65, 5.1, gradient(y, colors.highlight, 0.96)],
                [1.05, 2, gradient(y, colors.white, 1)]
            ]
        };
        needsMeasure = false;
        return true;
    }

    function drawGlow(x, y, radiusX, radiusY, color, opacity) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(radiusX, radiusY);
        const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        glow.addColorStop(0, rgba(color, opacity));
        glow.addColorStop(0.38, rgba(color, opacity * 0.38));
        glow.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = glow;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();
    }

    function noise(x, y, seed) {
        const lattice = (column, row) => {
            const key = Math.imul(column, 374761393) ^ Math.imul(row, 668265263) ^ Math.imul(seed, 1442695041);
            return ((Math.imul(key ^ (key >>> 13), 1274126177) >>> 0) / 4294967295);
        };
        const left = Math.floor(x);
        const top = Math.floor(y);
        const blendX = ease(x - left);
        const blendY = ease(y - top);
        const near = lattice(left, top) * (1 - blendX) + lattice(left + 1, top) * blendX;
        const far = lattice(left, top + 1) * (1 - blendX) + lattice(left + 1, top + 1) * blendX;
        return near * (1 - blendY) + far * blendY;
    }

    function makeSmokeAtlas() {
        // One shared texture atlas, generated once and reused on every re-entry.
        const atlas = document.createElement("canvas");
        atlas.width = smokeTile * 3;
        atlas.height = smokeTile;
        const texture = atlas.getContext("2d");
        if (!texture) return null;

        const pixels = texture.createImageData(atlas.width, atlas.height);
        const [red, green, blue] = colors.electric.split(",").map(Number);
        for (let row = 0; row < smokeTile; row++) {
            for (let column = 0; column < atlas.width; column++) {
                const seed = Math.floor(column / smokeTile) + 4;
                const x = (column % smokeTile) / (smokeTile - 1) * 2 - 1;
                const y = row / (smokeTile - 1) * 2 - 1;
                const warp = noise(x * 2.4 + 7, y * 2.4 + 3, seed) - 0.5;
                const folds = noise(x * 3.4 + warp + 5, y * 3.1 + warp, seed) * 0.67
                    + noise(x * 7.6 - warp, y * 6.8 + 9, seed) * 0.33;
                const mask = ease(1 - Math.hypot(x, y));
                const density = mask * ease((folds - 0.18) / 0.57);
                const index = (row * atlas.width + column) * 4;
                pixels.data[index] = red;
                pixels.data[index + 1] = green;
                pixels.data[index + 2] = blue;
                pixels.data[index + 3] = Math.round(density * 255);
            }
        }
        texture.putImageData(pixels, 0, 0);
        return atlas;
    }

    function cursorLight(x, y, compact) {
        if (reveal < 0.01) return 0;
        const radius = compact ? 185 : 240;
        return reveal * ease(1 - Math.hypot(x - pointer.x, y - pointer.y) / radius);
    }

    function drawSmoke(time, impact, still) {
        const { x, y, width, compact, tablet } = geometry;
        if (impact < 0.01) return;
        if (smokeAtlas === undefined) smokeAtlas = makeSmokeAtlas();
        if (!smokeAtlas) return;

        const count = still ? 2 : compact ? 3 : tablet ? 5 : clouds.length;
        for (let index = 0; index < count; index++) {
            const { start, life, drift, depth, origin } = clouds[index];
            const age = still ? life * (0.29 + index * 0.18) : time - contactTime - start;
            if (age < 0) continue;
            const progress = (age % (life + 0.8)) / life;
            if (progress >= 1) continue;

            const growth = ease(progress);
            const cx = x + origin + drift * growth * Math.min(width * 0.39, 520) + Math.sin(progress * 5 + index) * 12 * progress;
            const cy = y - 9 - progress * y * (0.45 + depth * 0.27);
            const cloudWidth = (compact ? 44 : 72) + growth * (compact ? 100 : 200) * (0.65 + depth * 0.5);
            const cloudHeight = cloudWidth * (0.52 + depth * 0.21);
            const envelope = ease(progress / 0.18) * (1 - ease((progress - 0.38) / 0.62));
            const nearBeam = ease(1 - Math.abs(cx - x) / 155);
            ctx.globalAlpha = impact * envelope * clamp(0.045 + nearBeam * 0.105 + cursorLight(cx, cy, compact) * 0.04, 0, 0.18);
            ctx.drawImage(smokeAtlas, index % 3 * smokeTile, 0, smokeTile, smokeTile,
                cx - cloudWidth / 2, cy - cloudHeight / 2, cloudWidth, cloudHeight);
        }
    }

    function drawDust(time, beamEnd, impact) {
        const { x, y, width, compact, tablet } = geometry;
        const count = compact ? 32 : tablet ? 64 : dust.length;
        ctx.globalAlpha = 1;
        for (let index = 0; index < count; index++) {
            const [offset, phase, speed, size] = dust[index];
            const nearColumn = index % 4 === 0;
            const nearImpact = index % 7 === 0;
            const dustX = (nearColumn ? x + (offset - 0.5) * (compact ? 100 : 166) : width * (0.04 + offset * 0.92))
                + Math.sin(time * (0.18 + speed * 0.22) + phase * 14) * 5;
            const band = nearImpact ? 0.76 + phase * 0.21 : 0.045 + phase * 0.91;
            const dustY = band * y + Math.cos(time * 0.3 + offset * 17) * 4;
            const beamLight = ease(1 - Math.abs(dustX - x) / (compact ? 60 : 92)) * ease((beamEnd - dustY) / 36);
            const impactLight = impact * ease(1 - Math.hypot((dustX - x) * 0.63, dustY - y) / 110);
            const pointerLight = cursorLight(dustX, dustY, compact);
            const base = 0.015 + size * 0.045;
            const alpha = clamp(base + beamLight * 0.21 + impactLight * 0.16 + pointerLight * 0.29, 0, 0.39);
            ctx.fillStyle = rgba(colors.highlight, alpha);
            ctx.beginPath();
            ctx.arc(dustX, dustY, 0.35 + size * 0.63, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawPattern(pattern, compact) {
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1;
        ctx.lineCap = "round";
        const radius = compact ? 200 : 245;
        for (const { path, base, boost } of pattern) {
            ctx.strokeStyle = rgba(colors.aura, base);
            ctx.stroke(path);
            if (reveal < 0.01) continue;

            const opacity = boost * reveal * (compact ? 0.75 : 1);
            const light = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
            light.addColorStop(0, rgba(colors.highlight, opacity));
            light.addColorStop(0.42, rgba(colors.aura, opacity * 0.57));
            light.addColorStop(0.78, rgba(colors.aura, opacity * 0.12));
            light.addColorStop(1, rgba(colors.aura, 0));
            ctx.strokeStyle = light;
            ctx.stroke(path);
        }
    }

    function drawSpill(time, strength, spreadProgress) {
        const { x, y, width, right, compact, spread, impact, fall } = geometry;
        if (!strength) return;
        ctx.globalAlpha = strength;
        drawGlow(x, y, spread * (0.55 + spreadProgress * 0.45), compact ? 38 : 63, colors.electric, 0.72);
        drawGlow(x, y - 1, impact, compact ? 13 : 23, colors.aura, 0.96);
        drawGlow(x, y - 1, impact * 0.67, compact ? 7 : 12, colors.white, 0.98);
        const cornerStrength = ease((spreadProgress - 0.18) / 0.82);
        ctx.globalAlpha = strength * cornerStrength;
        drawGlow(right, y + 48, compact ? 34 : 64, fall * 0.72, colors.electric, 0.34);

        const lines = compact ? 3 : 5;
        for (let index = 0; index < lines; index++) {
            const lead = x + index * 9;
            const curveY = y - 2 - index * 2.3 + Math.sin(time * (0.75 + index * 0.13) + index) * 2.4;
            const edge = Math.min(width - 1, right + 2 + index * 2.4);
            const length = fall * (0.95 - index * 0.12);
            const light = ctx.createLinearGradient(lead, curveY, edge, y + length);
            light.addColorStop(0, rgba(index === 0 ? colors.white : colors.aura, 0.86 - index * 0.09));
            light.addColorStop(0.62, rgba(colors.aura, 0.55 - index * 0.055));
            light.addColorStop(1, rgba(colors.electric, 0));
            ctx.strokeStyle = light;
            ctx.lineWidth = index === 0 ? 1.4 : 0.8;
            ctx.beginPath();
            ctx.moveTo(lead, curveY);
            ctx.bezierCurveTo(lead + (right - lead) * 0.43, curveY - 10 - index, right - 33, curveY - 1, right - 16, y + 2);
            ctx.bezierCurveTo(edge + 6, y + 6, edge - 2, y + length * 0.57, edge, y + length);
            ctx.stroke();
        }
    }

    function paint(time, fog, beamProgress, impact, spreadProgress, response, still) {
        const { x, y, width, height, compact, tablet, layers, pattern } = geometry;
        const beamEnd = y * beamProgress;
        ctx.clearRect(0, 0, width, height);
        drawSmoke(time, impact, still);
        drawPattern(pattern, compact);
        ctx.globalAlpha = fog;
        drawGlow(x - 13 + Math.sin(time * 0.45) * 18, y * 0.43, compact ? 66 : 115, y * 0.62, colors.electric, 0.26);
        drawGlow(x + 14 + Math.sin(time * 0.71) * 24 + response * 8, y * 0.71,
            compact ? 58 : 100, y * 0.37, colors.aura, 0.24);
        if (!compact) {
            drawGlow(x - 44 + Math.cos(time * 0.51) * 30, y * 0.87, 132, y * 0.31, colors.electric, 0.33);
        }
        drawDust(time, beamEnd, impact);

        ctx.save();
        ctx.globalAlpha = 1;
        if (beamProgress < 1) {
            ctx.beginPath();
            ctx.rect(0, 0, width, beamEnd);
            ctx.clip();
        }
        for (const [topWidth, bottomWidth, fill] of layers) {
            ctx.fillStyle = fill;
            ctx.beginPath();
            ctx.moveTo(x - topWidth, 0);
            ctx.lineTo(x + topWidth, 0);
            ctx.lineTo(x + bottomWidth, y);
            ctx.lineTo(x - bottomWidth, y);
            ctx.closePath();
            ctx.fill();
        }

        ctx.lineCap = "round";
        ctx.lineWidth = 1;
        const streakCount = compact ? 8 : tablet ? 12 : streaks.length;
        for (let index = 0; index < streakCount; index++) {
            const [offset, phase, speed] = streaks[index];
            const progress = (phase + time * (0.14 + speed * 0.19)) % 1;
            const top = progress * y;
            const lineX = x + (offset - 0.5) * (compact ? 87 : 154);
            const fade = Math.sin(progress * Math.PI);
            ctx.strokeStyle = rgba(index % 3 === 0 ? colors.aura : colors.highlight, fade * (0.26 + response * 0.06));
            ctx.beginPath();
            ctx.moveTo(lineX, top);
            ctx.lineTo(lineX + (offset - 0.5) * 7, Math.min(y, top + 9 + speed * (index % 3 === 0 ? 83 : 38)));
            ctx.stroke();
        }

        ctx.restore();
        if (beamProgress < 1) {
            const tipStrength = 0.37 + 0.63 * ease(time / 0.16);
            ctx.globalAlpha = tipStrength;
            drawGlow(x, beamEnd, compact ? 15 : 24, 18, colors.aura, 0.82);
            drawGlow(x, beamEnd, 5, 9, colors.white, 0.95);
        }

        drawSpill(time, impact, spreadProgress);
        ctx.globalAlpha = 1;
        surface.style.setProperty("--laser-spill", (impact * (0.87 + response * 0.08)).toFixed(3));
        surface.style.setProperty("--laser-reach", `${(22 + spreadProgress * 34).toFixed(1)}%`);
    }

    function stop() {
        cancelAnimationFrame(frame);
        frame = previous = 0;
    }

    function fallback() {
        stop();
        region.classList.remove("is-laser-ready");
        surface.style.removeProperty("--laser-spill");
        surface.style.removeProperty("--laser-reach");
    }

    function schedule() {
        if (!available || !visible || document.hidden || frame) return;
        if (introArmed && !motion.matches) {
            if (contactVisibility < 0.35) return;
            introArmed = false;
            elapsed = previous = 0;
            reveal = pointer.visible = energy = targetEnergy = 0;
        }
        frame = requestAnimationFrame(render);
    }

    function render(now) {
        frame = 0;
        if (!available || !visible || document.hidden) return;
        const still = motion.matches;
        const interval = 1000 / (mobile.matches ? 24 : 30);
        if (!still && !needsMeasure && previous && now - previous < interval - 0.25) {
            schedule();
            return;
        }

        try {
            if (needsMeasure && !measure()) return;
            const delta = previous ? Math.min((now - previous) / 1000, 0.07) : 0;
            previous = now;
            if (!still) elapsed += delta;
            const smoothing = 1 - Math.exp(-6 * delta);
            pointer.x += (pointer.targetX - pointer.x) * smoothing;
            pointer.y += (pointer.targetY - pointer.y) * smoothing;
            reveal += (pointer.visible - reveal) * smoothing;
            energy += (targetEnergy - energy) * (1 - Math.exp(-3 * delta));
            const travel = clamp((elapsed - descentDelay) / descentDuration, 0, 1);
            const beamProgress = still ? 1 : 1 - (1 - travel) ** 1.65;
            const sinceImpact = elapsed - contactTime;
            const fog = still ? 1 : 0.13 + 0.28 * beamProgress + 0.59 * ease(sinceImpact / 0.55);
            const spreadProgress = still ? 1 : ease(sinceImpact / spillDuration);
            const pulse = clamp(0.97 + 0.045 * Math.sin(elapsed * 0.92) + energy * 0.035, 0, 1);
            const impact = still ? 0.94 : ease(sinceImpact / bloomDuration) * pulse;
            paint(still ? 0.8 : elapsed, fog, beamProgress, impact, spreadProgress, still ? 0 : energy, still);
            region.classList.add("is-laser-ready");
            if (!still) schedule();
        } catch (error) {
            available = false;
            fallback();
            console.warn("LaserFlow: se mantiene el fondo estático.", error);
        }
    }

    function resize() {
        needsMeasure = true;
        schedule();
    }

    region.addEventListener("pointermove", event => {
        if (motion.matches || !visible || event.pointerType === "touch" || !geometry) return;
        const bounds = canvas.getBoundingClientRect();
        const x = event.clientX - bounds.left;
        const y = event.clientY - bounds.top;
        pointer.targetX = x;
        pointer.targetY = y;
        if (reveal < 0.02) {
            pointer.x = x;
            pointer.y = y;
        }
        pointer.visible = y <= geometry.y && y >= 0 ? 1 : 0;
        targetEnergy = pointer.visible * clamp(1 - Math.abs(x - geometry.x) / 175, 0, 1);
    }, { ...options, passive: true });
    region.addEventListener("pointerleave", () => { pointer.visible = targetEnergy = 0; }, options);

    motion.addEventListener("change", () => {
        stop();
        reveal = pointer.visible = energy = targetEnergy = 0;
        schedule();
    }, options);
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else schedule();
    }, options);
    canvas.addEventListener("contextlost", () => {
        available = false;
        fallback();
    }, options);
    canvas.addEventListener("contextrestored", () => {
        available = true;
        resize();
    }, options);
    window.addEventListener("resize", resize, options);
    mobile.addEventListener("change", resize, options);

    const sizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    sizeObserver?.observe(surface);
    sizeObserver?.observe(canvas);
    const viewObserver = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
        const entry = entries.at(-1);
        visible = entry.isIntersecting;
        if (visible) schedule();
        else {
            reveal = pointer.visible = energy = targetEnergy = 0;
            stop();
        }
    }) : null;
    viewObserver?.observe(canvas);

    // Normalize against the visible height possible even when Contacto is taller than the viewport.
    const contactObserver = viewObserver ? new IntersectionObserver(entries => {
        const entry = entries.at(-1);
        const reachable = Math.min(entry.boundingClientRect.height, entry.rootBounds?.height ?? window.innerHeight);
        contactVisibility = entry.isIntersecting && reachable ? entry.intersectionRect.height / reachable : 0;
        if (contactVisibility <= 0.1 && !introArmed) {
            introArmed = true;
            if (!motion.matches) fallback();
        }
        if (!motion.matches) schedule();
    }, { threshold: Array.from({ length: 19 }, (_, index) => index * 0.02) }) : null;
    contactObserver?.observe(region);

    window.addEventListener("pagehide", event => {
        stop();
        if (event.persisted) return;
        listeners.abort();
        sizeObserver?.disconnect();
        viewObserver?.disconnect();
        contactObserver?.disconnect();
    }, options);
    window.addEventListener("pageshow", schedule, options);
    schedule();
})();
