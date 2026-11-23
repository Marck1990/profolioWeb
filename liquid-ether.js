(() => {
    const region = document.querySelector(".liquid-region");
    if (!region) return;

    const canvas = region.querySelector(".liquid-canvas");
    const gl = canvas.getContext("webgl2", {
        alpha: false, antialias: false, depth: false, stencil: false, powerPreference: "low-power"
    });
    if (!gl) return;

    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 768px)");
    const resumeDelay = 1500;
    const maxSplats = 5;
    const disposables = new AbortController();
    const eventOptions = { signal: disposables.signal };
    const controls = "a, button, input, textarea, select, label, summary, [contenteditable], [tabindex], [role], .circular-carousel, .skill-card, .current-card";

    const vertex = `#version 300 es
        out vec2 uv;
        void main() {
            uv = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
            gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
        }
    `;

    const fragment = body => `#version 300 es
        precision highp float;
        in vec2 uv;
        out vec4 color;
        uniform sampler2D field;
        uniform sampler2D auxiliary;
        uniform vec2 cell;
        ${body}
    `;

    const sources = {
        splat: fragment(`
            uniform vec4 impulse;
            uniform vec3 shape;
            uniform float aspect;
            void main() {
                vec2 delta = (uv - impulse.xy) * vec2(aspect, 1.0);
                float influence = exp(-dot(delta, delta) / (shape.x * shape.x));
                vec2 curl = vec2(-delta.y, delta.x) / shape.x;
                vec2 radial = shape.z * delta / shape.x;
                vec3 state = texture(field, uv).rgb;
                state.xy += (impulse.zw + curl * shape.y + radial) * influence;
                state.z = min(1.8, state.z + influence * (0.13 + length(impulse.zw) * 0.018 + shape.z * 0.04));
                color = vec4(state, 1.0);
            }
        `),
        advect: fragment(`
            void main() {
                vec2 velocity = texture(field, uv).xy;
                vec3 state = texture(field, uv - velocity * cell).rgb;
                color = vec4(state.xy * 0.973, state.z * 0.989, 1.0);
            }
        `),
        divergence: fragment(`
            void main() {
                vec2 center = texture(field, uv).xy;
                float l = uv.x <= cell.x ? -center.x : texture(field, uv - vec2(cell.x, 0.0)).x;
                float r = uv.x >= 1.0 - cell.x ? -center.x : texture(field, uv + vec2(cell.x, 0.0)).x;
                float b = uv.y <= cell.y ? -center.y : texture(field, uv - vec2(0.0, cell.y)).y;
                float t = uv.y >= 1.0 - cell.y ? -center.y : texture(field, uv + vec2(0.0, cell.y)).y;
                color = vec4(0.5 * (r - l + t - b), 0.0, 0.0, 1.0);
            }
        `),
        pressure: fragment(`
            void main() {
                float neighboring =
                    texture(field, uv - vec2(cell.x, 0.0)).x +
                    texture(field, uv + vec2(cell.x, 0.0)).x +
                    texture(field, uv - vec2(0.0, cell.y)).x +
                    texture(field, uv + vec2(0.0, cell.y)).x;
                float divergence = texture(auxiliary, uv).x;
                color = vec4((neighboring - divergence) * 0.25, 0.0, 0.0, 1.0);
            }
        `),
        project: fragment(`
            void main() {
                float l = texture(auxiliary, uv - vec2(cell.x, 0.0)).x;
                float r = texture(auxiliary, uv + vec2(cell.x, 0.0)).x;
                float b = texture(auxiliary, uv - vec2(0.0, cell.y)).x;
                float t = texture(auxiliary, uv + vec2(0.0, cell.y)).x;
                vec3 state = texture(field, uv).rgb;
                state.xy = clamp(state.xy - 0.5 * vec2(r - l, t - b), -9.0, 9.0);
                color = vec4(state, 1.0);
            }
        `),
        display: fragment(`
            uniform vec3 navy;
            uniform vec3 deepBlue;
            uniform vec3 electric;
            uniform vec3 highlight;
            uniform float fade;
            uniform float cells;
            void main() {
                vec3 state = texture(field, uv).rgb;
                float speed = length(state.xy) * 220.0 / cells;
                float glow = 1.0 - exp(-state.z * 0.9 - speed * 0.085);
                float vignette = 1.0 - smoothstep(0.18, 0.74, length(uv - 0.5)) * 0.6;
                vec3 tint = mix(deepBlue, electric, smoothstep(0.18, 0.9, glow));
                tint = mix(tint, highlight, smoothstep(0.68, 1.0, glow) * 0.22);
                color = vec4(mix(navy, tint, glow * vignette * fade * 0.47), 1.0);
            }
        `)
    };

    function rgb(value) {
        return value.trim().slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255);
    }

    function createSimulation() {
        if (!gl.getExtension("EXT_color_buffer_float")) return null;

        const programs = {};
        const handles = [];
        const targets = [];
        let flow;
        let pressure;
        let divergence;
        let width;
        let height;
        let viewportWidth;
        let viewportHeight;

        function build(source) {
            const handle = gl.createProgram();
            const shaders = [];
            handles.push(handle);
            try {
                for (const [type, code] of [[gl.VERTEX_SHADER, vertex], [gl.FRAGMENT_SHADER, source]]) {
                    const shader = gl.createShader(type);
                    shaders.push(shader);
                    gl.shaderSource(shader, code);
                    gl.compileShader(shader);
                    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
                    gl.attachShader(handle, shader);
                }
                gl.linkProgram(handle);
                if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(handle));
                const uniforms = {};
                for (let index = 0; index < gl.getProgramParameter(handle, gl.ACTIVE_UNIFORMS); index++) {
                    const { name } = gl.getActiveUniform(handle, index);
                    uniforms[name] = gl.getUniformLocation(handle, name);
                }
                return { handle, uniforms };
            } finally {
                shaders.forEach(shader => gl.deleteShader(shader));
            }
        }

        function freeTargets() {
            for (const { texture, framebuffer } of targets) {
                gl.deleteTexture(texture);
                gl.deleteFramebuffer(framebuffer);
            }
            targets.length = 0;
        }

        function dispose() {
            freeTargets();
            handles.forEach(handle => gl.deleteProgram(handle));
        }

        function target(filter) {
            const framebuffer = gl.createFramebuffer();
            const texture = gl.createTexture();
            const result = { texture, framebuffer };
            targets.push(result);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            const linear = filter === gl.LINEAR;
            gl.texImage2D(gl.TEXTURE_2D, 0, linear ? gl.RGBA16F : gl.R16F, width, height, 0,
                linear ? gl.RGBA : gl.RED, gl.HALF_FLOAT, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error("LiquidEther: framebuffer incompleto");
            }
            clear(result);
            return result;
        }

        function clear(destination) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, destination.framebuffer);
            gl.clearBufferfv(gl.COLOR, 0, [0, 0, 0, 0]);
        }

        function bind(unit, texture) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, texture);
        }

        function pass(name, destination, input, auxiliary, configure) {
            const { handle, uniforms } = programs[name];
            gl.useProgram(handle);
            gl.bindFramebuffer(gl.FRAMEBUFFER, destination?.framebuffer ?? null);
            gl.viewport(0, 0, destination ? width : viewportWidth, destination ? height : viewportHeight);
            bind(0, input.texture);
            bind(1, auxiliary?.texture ?? null);
            if (uniforms.cell) gl.uniform2f(uniforms.cell, 1 / width, 1 / height);
            configure?.(uniforms);
            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        function flip(pair) {
            const first = pair[0];
            pair[0] = pair[1];
            pair[1] = first;
        }

        function resize(cssWidth, cssHeight) {
            const compact = mobile.matches;
            const dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.15 : 2);
            const outputScale = Math.min(dpr, Math.sqrt((compact ? 360000 : 950000) / (cssWidth * cssHeight)));
            const outputWidth = Math.max(1, Math.round(cssWidth * outputScale));
            const outputHeight = Math.max(1, Math.round(cssHeight * outputScale));
            const gridScale = Math.min(compact ? 0.35 : 0.5, Math.sqrt((compact ? 29000 : 76000) / (outputWidth * outputHeight)));
            const gridWidth = Math.max(1, Math.floor(outputWidth * gridScale));
            const gridHeight = Math.max(1, Math.floor(outputHeight * gridScale));
            if (outputWidth === viewportWidth && outputHeight === viewportHeight && gridWidth === width && gridHeight === height) return;

            viewportWidth = canvas.width = outputWidth;
            viewportHeight = canvas.height = outputHeight;
            width = gridWidth;
            height = gridHeight;
            freeTargets();
            flow = [target(gl.LINEAR), target(gl.LINEAR)];
            pressure = [target(gl.NEAREST), target(gl.NEAREST)];
            divergence = target(gl.NEAREST);

            splat({ x: 0.23, y: 0.61, dx: 3, dy: -1, radius: 0.22, curl: 2.3, burst: 0 });
            splat({ x: 0.64, y: 0.33, dx: -2, dy: 2, radius: 0.25, curl: -3.2, burst: 0 });
            splat({ x: 0.80, y: 0.72, dx: -1, dy: -2, radius: 0.17, curl: 2, burst: 0 });
        }

        function splat({ x, y, dx, dy, radius, curl, burst }) {
            pass("splat", flow[1], flow[0], null, u => {
                gl.uniform4f(u.impulse, x, y, dx, dy);
                gl.uniform3f(u.shape, radius, curl, burst);
                gl.uniform1f(u.aspect, width / height);
            });
            flip(flow);
        }

        function step() {
            pass("advect", flow[1], flow[0]);
            flip(flow);
            pass("divergence", divergence, flow[0]);
            clear(pressure[0]);
            const iterations = mobile.matches ? 14 : 24;
            for (let index = 0; index < iterations; index++) {
                pass("pressure", pressure[1], pressure[0], divergence);
                flip(pressure);
            }
            pass("project", flow[1], flow[0], pressure[0]);
            flip(flow);
        }

        try {
            for (const [name, source] of Object.entries(sources)) {
                const program = programs[name] = build(source);
                gl.useProgram(program.handle);
                if (program.uniforms.field) gl.uniform1i(program.uniforms.field, 0);
                if (program.uniforms.auxiliary) gl.uniform1i(program.uniforms.auxiliary, 1);
            }
            const css = getComputedStyle(region);
            const palette = { navy: "--color-bg", deepBlue: "--color-primary-dark", electric: "--color-primary", highlight: "--color-text-secondary" };
            for (const [uniform, property] of Object.entries(palette)) {
                gl.uniform3fv(programs.display.uniforms[uniform], rgb(css.getPropertyValue(property)));
            }
            return {
                resize, splat, step, dispose,
                draw(fade) {
                    pass("display", null, flow[0], null, u => {
                        gl.uniform1f(u.fade, fade);
                        gl.uniform1f(u.cells, height);
                    });
                }
            };
        } catch (error) {
            dispose();
            throw error;
        }
    }

    let simulation;
    let observer;
    let inView = !("IntersectionObserver" in window);
    let frame = 0;
    let lastFrame = -Infinity;
    let lastInteraction = -Infinity;
    let elapsed = 0;
    let pendingSize = true;
    let lastPointer;
    const impulses = [];

    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
        lastFrame = -Infinity;
        lastPointer = undefined;
        impulses.length = 0;
    }

    function schedule() {
        if (!frame && simulation && inView && !document.hidden) frame = requestAnimationFrame(render);
    }

    function automatic(time) {
        const phase = time * 0.53;
        simulation.splat({
            x: 0.5 + Math.sin(phase * 0.73) * 0.29,
            y: 0.5 + Math.cos(phase * 0.94) * 0.28,
            dx: Math.cos(phase * 0.73) * 0.42,
            dy: -Math.sin(phase * 0.94) * 0.38,
            curl: mobile.matches ? 0.42 : 0.58,
            radius: mobile.matches ? 0.13 : 0.15,
            burst: 0
        });
    }

    function render(now) {
        frame = 0;
        if (!simulation || !inView || document.hidden || gl.isContextLost()) return;
        const interval = 1000 / (mobile.matches ? 24 : 30);
        const still = motion.matches;
        if (!still && !pendingSize && now - lastFrame < interval - 0.4) {
            schedule();
            return;
        }
        lastFrame = now;

        try {
            const resized = pendingSize;
            if (resized) {
                if (!canvas.clientWidth || !canvas.clientHeight) return;
                simulation.resize(canvas.clientWidth, canvas.clientHeight);
                pendingSize = false;
            }
            if (!still) {
                elapsed += interval / 1000;
                if (now - lastInteraction >= resumeDelay) automatic(elapsed);
                for (const impulse of impulses) simulation.splat(impulse);
                impulses.length = 0;
                simulation.step();
            }
            const intro = Math.min(1, elapsed / 2.4);
            simulation.draw(still ? 1 : intro * intro * (3 - 2 * intro));
            if (resized && gl.getError() !== gl.NO_ERROR) throw new Error("LiquidEther: WebGL no pudo dibujar");
            region.classList.add("is-liquid-ready");
            if (!still) schedule();
        } catch (error) {
            fallback(error);
        }
    }

    function fallback(error) {
        stop();
        simulation?.dispose();
        simulation = null;
        region.classList.remove("is-liquid-ready");
        if (error) console.warn(error);
    }

    function initialize() {
        try {
            simulation = createSimulation();
            pendingSize = true;
            schedule();
        } catch (error) {
            fallback(error);
        }
    }

    function resize() {
        pendingSize = true;
        schedule();
    }

    function point(event) {
        const bounds = canvas.getBoundingClientRect();
        return { x: (event.clientX - bounds.left) / bounds.width, y: 1 - (event.clientY - bounds.top) / bounds.height };
    }

    function addImpulse(impulse) {
        if (impulses.length >= maxSplats) impulses.shift();
        impulses.push(impulse);
    }

    region.addEventListener("pointermove", event => {
        if (!simulation || motion.matches || event.pointerType === "touch") return;
        const position = point(event);
        const previous = lastPointer;
        lastInteraction = performance.now();
        lastPointer = position;
        if (!previous) return;
        const force = delta => Math.max(-5, Math.min(5, delta * 115));
        addImpulse({ ...position, dx: force(position.x - previous.x), dy: force(position.y - previous.y),
            radius: mobile.matches ? 0.085 : 0.10, curl: 0.28, burst: 0 });
    }, { ...eventOptions, passive: true });

    region.addEventListener("pointerleave", () => { lastPointer = undefined; }, eventOptions);
    region.addEventListener("click", event => {
        if (!simulation || motion.matches || !event.detail || event.target.closest(controls)) return;
        lastInteraction = performance.now();
        addImpulse({ ...point(event), dx: 0, dy: 0, radius: 0.13, curl: 4.8, burst: 3.4 });
    }, eventOptions);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else schedule();
    }, eventOptions);
    motion.addEventListener("change", () => {
        stop();
        if (motion.matches) elapsed = 2.4;
        schedule();
    }, eventOptions);
    canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        fallback();
    }, eventOptions);
    canvas.addEventListener("webglcontextrestored", initialize, eventOptions);
    window.addEventListener("resize", resize, eventOptions);
    mobile.addEventListener("change", resize, eventOptions);

    const sizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    sizeObserver?.observe(canvas);
    if ("IntersectionObserver" in window) {
        observer = new IntersectionObserver(([entry]) => {
            inView = entry.isIntersecting;
            if (inView) schedule();
            else stop();
        });
        observer.observe(region);
    }

    window.addEventListener("pagehide", event => {
        stop();
        if (event.persisted) return;
        disposables.abort();
        sizeObserver?.disconnect();
        observer?.disconnect();
        simulation?.dispose();
    }, eventOptions);
    window.addEventListener("pageshow", schedule, eventOptions);
    initialize();
})();
