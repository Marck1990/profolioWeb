const form = document.querySelector(".contact-form");
const formStatus = document.getElementById("form-status");

form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const data = new FormData(form);

    try {
        const response = await fetch(form.action, {
            method: form.method,
            body: data,
            headers: {
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            formStatus.textContent = " Mensaje enviado correctamente";
            form.reset();
        } else {
            formStatus.textContent = " Ocurrió un error, intenta de nuevo";
        }

    } catch (error) {
        formStatus.textContent = "Error de conexión";
    }
});

const header = document.querySelector(".header");
const menuToggle = document.querySelector(".menu-toggle");
const menu = document.getElementById("site-menu");
const mobileMenu = window.matchMedia("(max-width: 768px)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function updateHeaderHeight() {
    document.documentElement.style.setProperty("--header-height", header.offsetHeight + "px");
}

function updateHeaderShadow() {
    header.classList.toggle("scrolled", window.scrollY > 50);
}

function closeMenu() {
    menuToggle.setAttribute("aria-expanded", "false");
}

menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
});

menu.addEventListener("click", (event) => {
    if (mobileMenu.matches && event.target.closest("a")) {
        closeMenu();
        menuToggle.focus({ preventScroll: true });
    }
});

header.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileMenu.matches && menuToggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
        menuToggle.focus();
    }
});

mobileMenu.addEventListener("change", closeMenu);
menuToggle.hidden = false;
updateHeaderHeight();
updateHeaderShadow();
window.addEventListener("scroll", updateHeaderShadow, { passive: true });
window.addEventListener("resize", updateHeaderHeight);

if ("ResizeObserver" in window) {
    new ResizeObserver(updateHeaderHeight).observe(header);
}

if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("show");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(".fade-in").forEach(section => observer.observe(section));
}

// Detalles de los proyectos en desarrollo
const modal = document.getElementById("projectModal");
const closeModal = document.getElementById("closeModal");

const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalTech = document.getElementById("modalTech");
const modalStatus = document.getElementById("modalStatus");

const openModalButtons = document.querySelectorAll(".open-modal");
let modalTrigger;

openModalButtons.forEach(button => {
    button.addEventListener("click", function () {
        modalTitle.textContent = this.dataset.title;
        modalDescription.textContent = this.dataset.description;
        modalTech.textContent = this.dataset.tech;
        modalStatus.textContent = this.dataset.status;

        modalTrigger = this;
        modal.showModal();
    });
});

closeModal.addEventListener("click", function () {
    modal.close();
});

modal.addEventListener("click", function (e) {
    if (e.target === modal) {
        modal.close();
    }
});

modal.addEventListener("close", () => {
    modalTrigger?.focus({ preventScroll: true });
});

/* efecto parallax */
const hero = document.querySelector(".hero");
const heroContainer = document.querySelector(".hero-container");
const heroVideo = document.querySelector(".hero-video");

function updateHeroMotion() {
    if (reducedMotion.matches) {
        heroContainer.style.removeProperty("transform");
    }
    if (reducedMotion.matches || hero.classList.contains("ghost-fibers-ready")) {
        heroVideo.pause();
    } else {
        heroVideo.play().catch(() => {});
    }
}

updateHeroMotion();
reducedMotion.addEventListener("change", updateHeroMotion);

if (hero && heroContainer) {
    hero.addEventListener("mousemove", function (e) {
        if (reducedMotion.matches) return;

        const x = (window.innerWidth / 2 - e.clientX) / 40;
        const y = (window.innerHeight / 2 - e.clientY) / 40;

        heroContainer.style.transform = `translate(${x}px, ${y}px)`;
    });

    hero.addEventListener("mouseleave", function () {
        heroContainer.style.transform = "translate(0, 0)";
    });
}

/* efecto moneda en titulos */
const sectionTitles = document.querySelectorAll(".section-title");

sectionTitles.forEach(function (title) {
    const text = title.textContent.trim();

    if (text.length > 0) {
        const firstLetter = text.charAt(0);
        const restText = text.slice(1);

        title.innerHTML = `<span class="coin-letter">${firstLetter}</span>${restText}`;
    }
});

/* efecto giro al abrir demo */
const flipButtons = document.querySelectorAll(".btn-flip");

flipButtons.forEach(button => {
    button.addEventListener("click", () => {
        if (reducedMotion.matches) return;

        button.classList.add("is-flipping");
        setTimeout(() => button.classList.remove("is-flipping"), 650);
    });
});

/* lanzamiento del sobre hacia contacto */

const envelopeLaunch = document.getElementById("envelopeLaunch");
const contactSection = document.getElementById("contacto");

if (envelopeLaunch && contactSection) {

    envelopeLaunch.addEventListener("click", function () {
        if (reducedMotion.matches) {
            contactSection.scrollIntoView({ behavior: "instant" });
            return;
        }

        const envelope = envelopeLaunch.querySelector(".envelope-icon");

        const envelopePosition = envelope.getBoundingClientRect();

        const flyingEnvelope = envelope.cloneNode(true);

        flyingEnvelope.classList.add("envelope-flight");

        flyingEnvelope.style.left = envelopePosition.left + "px";
        flyingEnvelope.style.top = envelopePosition.top + "px";

        document.body.appendChild(flyingEnvelope);

        /* movimiento de la pagina */

        const startPosition = window.scrollY;

        const targetPosition =
            contactSection.getBoundingClientRect().top +
            window.scrollY -
            header.offsetHeight;

        const distance = targetPosition - startPosition;

        const duration = 900;

        let startTime = null;

        function scrollAnimation(currentTime) {

            if (!startTime) {
                startTime = currentTime;
            }

            const elapsedTime = currentTime - startTime;

            const progress = Math.min(elapsedTime / duration, 1);

            const ease =
                progress < 0.5
                    ? 2 * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            window.scrollTo({
                top: startPosition + distance * ease,
                behavior: "instant"
            });

            if (progress < 1) {
                requestAnimationFrame(scrollAnimation);
            } else {
                flyingEnvelope.remove();
            }
        }

        requestAnimationFrame(scrollAnimation);
    });
}
