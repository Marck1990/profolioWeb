(() => {
    const canvas = document.querySelector(".ghost-fibers-canvas");
    if (!canvas) return;

    const hero = canvas.closest(".hero");
    const video = hero.querySelector(".hero-video");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const compact = matchMedia("(max-width: 768px)");
    const maxDimension = 2400;
    const introDuration = 2.5;

    // Cada vértice es un punto en una fibra, o una partícula de fondo.
    const fibersVertex = `#version 300 es
        precision highp float;
        uniform vec2 resolution;
        uniform vec2 pointer;
        uniform vec3 pulse;
        uniform float time;
        uniform float intro;
        uniform int threads;
        uniform int samples;
        out vec3 detail;

        float hash(float n) { return fract(sin(n * 127.1) * 43758.5453); }

        void main() {
            float aspect = resolution.x / resolution.y;
            float pixelScale = clamp(resolution.y / 620.0, 0.75, 2.4);
            int layerSize = threads * samples;
            int id = gl_VertexID;
            if (id >= 3 * layerSize) {
                float seed = float(id - 3 * layerSize);
                vec2 p = vec2(hash(seed + 11.0), hash(seed + 43.0));
                p.x = fract(p.x + time * (0.008 + 0.015 * hash(seed + 2.0)));
                p.y += sin(time * 0.31 + seed) * 0.025;
                gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
                gl_PointSize = (2.0 + 2.0 * hash(seed + 9.0)) * pixelScale;
                detail = vec3(hash(seed + 4.0), intro * (0.05 + 0.23 * hash(seed + 5.0)), 0.75);
                return;
            }

            float layer = float(id / layerSize);
            int local = id % layerSize;
            float strand = float(local / samples) / float(threads - 1) * 2.0 - 1.0;
            float along = (float(local % samples) + fract(time * 2.8 + layer * 0.31)) / float(samples - 1);
            float u = along * 2.0 - 1.0;
            float phase = u * 3.77 + layer * 1.55 + time * 0.32;
            float twist = phase + sin(u * 2.1 - time * 0.2) * 0.55;
            float fold = strand * (0.28 + 0.13 * cos(u * 3.0 + layer));
            float depth = sin(twist) * fold + 0.18 * cos(phase * 0.66) - layer * 0.17;
            float perspective = 1.0 / (1.0 - depth * 0.32);
            vec2 p = vec2(
                u * (aspect * 1.27 + 0.3),
                (layer - 1.0) * 0.43 + 0.22 * sin(u * 3.25 + layer * 1.3 - time * 0.25)
                    + cos(twist) * fold + 0.13 * sin(u * 6.0 + layer + time * 0.32)
            ) * perspective;

            // Inclinar las cintas sin estirarlas con la relación de aspecto.
            p = mat2(0.9511, 0.3090, -0.3090, 0.9511) * p;
            p += pointer * (0.06 + depth * 0.08);
            p.x /= aspect;
            float distanceToPulse = length((p - pulse.xy) * vec2(aspect, 1.0));
            float waveDistance = distanceToPulse - pulse.z * 0.86;
            float wave = exp(-90.0 * waveDistance * waveDistance)
                * exp(-pulse.z * 2.2) * step(0.0, pulse.z);
            p.y += wave * 0.025;

            float blur = clamp(abs(depth - pointer.y * 0.28) * 1.8, 0.0, 1.0);
            float flow = 0.66 + 0.34 * sin(along * 38.0 - time * 1.4 + layer + strand * 3.0);
            float sparkle = pow(max(0.0, sin(along * 34.7 + strand * 19.5 + time * 0.75 + layer)), 18.0);
            float crest = pow(abs(cos(twist)), 3.0);
            float reveal = smoothstep(max(0.0, along - 0.2), along + 0.05, intro * 1.12);
            float edge = smoothstep(0.0, 0.11, along) * (1.0 - smoothstep(0.9, 1.0, along));
            float opacity = (0.15 + crest * 0.22 + sparkle * 0.28 + wave * 0.4)
                * flow * (1.0 - blur * 0.48) * reveal * edge;
            gl_Position = vec4(p, 0.0, 1.0);
            gl_PointSize = (2.1 + blur * 2.1 + sparkle * 0.9) * pixelScale;
            detail = vec3(clamp(0.48 + depth * 0.8 + sparkle * 0.25, 0.0, 1.0), opacity, blur);
        }
    `;

    const fibersFragment = `#version 300 es
        precision highp float;
        uniform vec3 electric;
        uniform vec3 deepBlue;
        uniform vec3 highlight;
        in vec3 detail;
        out vec4 color;
        void main() {
            float r = length(gl_PointCoord - 0.5);
            float dotMask = 1.0 - smoothstep(mix(0.19, 0.06, detail.z), 0.49, r);
            vec3 tint = mix(deepBlue, electric, smoothstep(0.0, 0.66, detail.x));
            tint = mix(tint, highlight, smoothstep(0.62, 1.0, detail.x) * 0.8);
            color = vec4(tint * dotMask * detail.y, 1.0);
        }
    `;

    const screenVertex = `#version 300 es
        out vec2 uv;
        void main() {
            uv = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
            gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
        }
    `;

    const downsampleFragment = `#version 300 es
        precision highp float;
        uniform sampler2D source;
        in vec2 uv;
        out vec4 color;
        void main() {
            vec2 stepSize = 1.0 / vec2(textureSize(source, 0));
            vec3 light = texture(source, uv).rgb * 0.28;
            light += texture(source, uv + stepSize * vec2(-1.5, -1.5)).rgb * 0.18;
            light += texture(source, uv + stepSize * vec2( 1.5, -1.5)).rgb * 0.18;
            light += texture(source, uv + stepSize * vec2(-1.5,  1.5)).rgb * 0.18;
            light += texture(source, uv + stepSize * vec2( 1.5,  1.5)).rgb * 0.18;
            color = vec4(light, 1.0);
        }
    `;

    const compositeFragment = `#version 300 es
        precision highp float;
        uniform sampler2D scene;
        uniform sampler2D bloomNear;
        uniform sampler2D bloomFar;
        in vec2 uv;
        out vec4 color;
        void main() {
            // La interpolación bilineal devuelve los dos niveles de bloom a resolución completa.
            vec3 light = texture(scene, uv).rgb
                + texture(bloomNear, uv).rgb * 0.55 + texture(bloomFar, uv).rgb * 0.85;
            float vignette = 1.0 - smoothstep(0.12, 0.73, length(uv - 0.5)) * 0.32;
            float grain = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5;
            vec3 base = vec3(2.0, 6.0, 23.0) / 255.0;
            color = vec4(max(base + light * vignette * 0.86 + grain * 0.009, 0.0), 1.0);
        }
    `;

    const gl = canvas.getContext("webgl2", {
        alpha: false, antialias: false, depth: false, stencil: false,
        powerPreference: "low-power"
    });
    if (!gl) return;

    let renderer;
    let frame = 0;
    let elapsed = 0;
    let previous = 0;
    let inView = !("IntersectionObserver" in window);
    let needsResize = true;
    const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const pulse = { x: 0, y: 0, started: -Infinity };
    const events = new AbortController();
    const options = { signal: events.signal };

    function rgb(value) {
        return (value.trim().match(/[a-f\d]{2}/gi) || []).map(channel => parseInt(channel, 16) / 255);
    }

    function makeRenderer() {
        const programs = [];
        let targets = [];

        function program(vertexSource, fragmentSource, uniforms) {
            const shaders = [];
            const handle = gl.createProgram();
            programs.push(handle);
            try {
                for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
                    const shader = gl.createShader(type);
                    shaders.push(shader);
                    gl.shaderSource(shader, source);
                    gl.compileShader(shader);
                    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
                    gl.attachShader(handle, shader);
                }
                gl.linkProgram(handle);
                if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(handle));
                return { handle, uniforms: Object.fromEntries(uniforms.map(name => [name, gl.getUniformLocation(handle, name)])) };
            } finally {
                shaders.forEach(shader => {
                    gl.deleteShader(shader);
                });
            }
        }

        function freeTargets() {
            for (const { texture, framebuffer } of targets) {
                gl.deleteTexture(texture);
                gl.deleteFramebuffer(framebuffer);
            }
            targets = [];
        }

        function dispose() {
            freeTargets();
            programs.forEach(handle => gl.deleteProgram(handle));
        }

        function target(width, height) {
            const texture = gl.createTexture();
            const framebuffer = gl.createFramebuffer();
            targets.push({ width, height, texture, framebuffer });
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
                throw new Error("GhostFibers: framebuffer incompleto");
            }
        }

        try {
            const fibers = program(fibersVertex, fibersFragment, [
                "resolution", "pointer", "pulse", "time", "intro", "threads", "samples", "electric", "deepBlue", "highlight"
            ]);
            const downsample = program(screenVertex, downsampleFragment, ["source"]);
            const composite = program(screenVertex, compositeFragment, ["scene", "bloomNear", "bloomFar"]);
            const style = getComputedStyle(hero);
            gl.useProgram(fibers.handle);
            gl.uniform3fv(fibers.uniforms.electric, rgb(style.getPropertyValue("--color-primary")));
            gl.uniform3fv(fibers.uniforms.deepBlue, rgb(style.getPropertyValue("--color-primary-dark")));
            gl.uniform3fv(fibers.uniforms.highlight, rgb(style.getPropertyValue("--color-text-secondary")));

            function resize(width, height, mobile) {
                freeTargets();
                canvas.width = width;
                canvas.height = height;
                target(width, height);
                for (const scale of mobile ? [4] : [2, 4]) {
                    target(Math.max(1, Math.floor(width / scale)), Math.max(1, Math.floor(height / scale)));
                }
            }

            function bindTarget(destination) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, destination?.framebuffer ?? null);
                gl.viewport(0, 0, destination?.width ?? canvas.width, destination?.height ?? canvas.height);
            }

            function sample(unit, texture, uniform) {
                gl.activeTexture(gl.TEXTURE0 + unit);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.uniform1i(uniform, unit);
            }

            function draw(mobile, time, intro, x, y, pulseAge) {
                bindTarget(targets[0]);
                gl.clearColor(0, 0, 0, 1);
                gl.clear(gl.COLOR_BUFFER_BIT);
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE, gl.ONE);
                gl.useProgram(fibers.handle);
                const threads = mobile ? 16 : 24;
                const samples = mobile ? 100 : 172;
                const dust = mobile ? 35 : 80;
                const u = fibers.uniforms;
                gl.uniform2f(u.resolution, canvas.width, canvas.height);
                gl.uniform2f(u.pointer, x, y);
                gl.uniform3f(u.pulse, pulse.x, pulse.y, pulseAge < 2.5 ? pulseAge : -1);
                gl.uniform1f(u.time, time);
                gl.uniform1f(u.intro, intro);
                gl.uniform1i(u.threads, threads);
                gl.uniform1i(u.samples, samples);
                gl.drawArrays(gl.POINTS, 0, threads * samples * 3 + dust);
                gl.disable(gl.BLEND);

                gl.useProgram(downsample.handle);
                for (let index = 1; index < targets.length; index++) {
                    bindTarget(targets[index]);
                    sample(0, targets[index - 1].texture, downsample.uniforms.source);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                }

                bindTarget(null);
                gl.useProgram(composite.handle);
                sample(0, targets[0].texture, composite.uniforms.scene);
                sample(1, targets[1].texture, composite.uniforms.bloomNear);
                sample(2, targets.at(-1).texture, composite.uniforms.bloomFar);
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }

            return { draw, resize, dispose };
        } catch (error) {
            dispose();
            throw error;
        }
    }

    function stop() {
        cancelAnimationFrame(frame);
        frame = previous = 0;
    }

    function fallback() {
        stop();
        hero.classList.remove("ghost-fibers-ready");
        if (!reduced.matches) video.play().catch(() => {});
    }

    function schedule() {
        if (renderer && inView && !document.hidden && !frame) frame = requestAnimationFrame(render);
    }

    function render(now) {
        frame = 0;
        if (!renderer || !inView || document.hidden || gl.isContextLost()) return;

        const mobile = compact.matches;
        const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
        previous = now;
        try {
            const firstFrame = !hero.classList.contains("ghost-fibers-ready");
            if (needsResize) {
                const width = canvas.clientWidth;
                const height = canvas.clientHeight;
                if (!width || !height) return;
                const limit = mobile ? 1400 : maxDimension;
                const ratio = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2, limit / Math.max(width, height));
                renderer.resize(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)), mobile);
            }

            const still = reduced.matches;
            if (!still) elapsed += delta;
            const ease = 1 - Math.exp(-4 * delta);
            pointer.x += (pointer.targetX - pointer.x) * ease;
            pointer.y += (pointer.targetY - pointer.y) * ease;
            renderer.draw(mobile, still ? 0 : elapsed, still ? 1 : Math.min(1, elapsed / introDuration),
                still ? 0 : pointer.x, still ? 0 : pointer.y, still ? -1 : elapsed - pulse.started);

            if ((firstFrame || needsResize) && gl.getError() !== gl.NO_ERROR) {
                throw new Error("GhostFibers: WebGL no pudo dibujar el fondo");
            }
            needsResize = false;
            if (firstFrame) {
                video.pause();
                hero.classList.add("ghost-fibers-ready");
            }
            if (!still) schedule();
        } catch (error) {
            renderer.dispose();
            renderer = null;
            fallback();
            console.warn(error);
        }
    }

    function initialize() {
        try {
            renderer = makeRenderer();
            needsResize = true;
            schedule();
        } catch (error) {
            fallback();
            console.warn(error);
        }
    }

    function resize() {
        needsResize = true;
        schedule();
    }

    function position(event) {
        const bounds = hero.getBoundingClientRect();
        return [(event.clientX - bounds.left) / bounds.width * 2 - 1, 1 - (event.clientY - bounds.top) / bounds.height * 2];
    }

    hero.addEventListener("pointermove", event => {
        if (!renderer || !inView || reduced.matches || event.pointerType === "touch") return;
        [pointer.targetX, pointer.targetY] = position(event);
    }, { ...options, passive: true });

    hero.addEventListener("pointerleave", () => {
        pointer.targetX = pointer.targetY = 0;
    }, options);

    hero.addEventListener("click", event => {
        if (!renderer || reduced.matches || !event.detail) return;
        if (event.target !== hero && !event.target.classList.contains("hero-overlay")) return;
        [pulse.x, pulse.y] = position(event);
        pulse.started = elapsed;
    }, options);

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) stop();
        else schedule();
    }, options);
    reduced.addEventListener("change", () => {
        stop();
        pulse.started = -Infinity;
        pointer.x = pointer.y = pointer.targetX = pointer.targetY = 0;
        schedule();
    }, options);
    compact.addEventListener("change", resize, options);
    window.addEventListener("resize", resize, options);
    canvas.addEventListener("webglcontextlost", event => {
        event.preventDefault();
        renderer = null;
        fallback();
    }, options);
    canvas.addEventListener("webglcontextrestored", initialize, options);

    const sizeObserver = "ResizeObserver" in window ? new ResizeObserver(resize) : null;
    sizeObserver?.observe(hero);
    const viewObserver = "IntersectionObserver" in window ? new IntersectionObserver(([entry]) => {
        inView = entry.isIntersecting;
        if (inView) schedule();
        else stop();
    }) : null;
    viewObserver?.observe(hero);

    window.addEventListener("pagehide", event => {
        stop();
        if (event.persisted) return;
        events.abort();
        sizeObserver?.disconnect();
        viewObserver?.disconnect();
        renderer?.dispose();
        renderer = null;
    }, options);
    window.addEventListener("pageshow", schedule, options);
    initialize();
})();
