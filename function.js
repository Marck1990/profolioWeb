const form = document.querySelector(".contact-form");
const status = document.getElementById("form-status");

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
            status.innerHTML = " Mensaje enviado correctamente";
            form.reset();
        } else {
            status.innerHTML = " Ocurrió un error, intenta de nuevo";
        }

    } catch (error) {
        status.innerHTML = "Error de conexión";
    }
});



// PARA MEJORAR ANIMACION

// ANIMACION DEL NAV
window.addEventListener("scroll", () => {
 const nav = document.querySelector(".header");

  if (window.scrollY > 50) {
    nav.classList.add("scrolled");
  } else {
    nav.classList.remove("scrolled");
  }
});



const elements = document.querySelectorAll(".fade-in");

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("show");
    }
  });
}, {
  threshold: 0.1
});

elements.forEach(el => observer.observe(el));


// CAMBIOS AGREGADOS CON EL HTML MODAL
const modal = document.getElementById("projectModal");
const closeModal = document.getElementById("closeModal");

const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalTech = document.getElementById("modalTech");
const modalStatus = document.getElementById("modalStatus");

const openModalButtons = document.querySelectorAll(".open-modal");

openModalButtons.forEach(button => {
    button.addEventListener("click", function () {
        modalTitle.textContent = this.dataset.title;
        modalDescription.textContent = this.dataset.description;
        modalTech.textContent = this.dataset.tech;
        modalStatus.textContent = this.dataset.status;

        modal.classList.add("active");
    });
});

closeModal.addEventListener("click", function () {
    modal.classList.remove("active");
});

modal.addEventListener("click", function (e) {
    if (e.target === modal) {
        modal.classList.remove("active");
    }
});


// efectos agregados posteriormente

/* efecto parallax */
const hero = document.querySelector(".hero");
const heroContainer = document.querySelector(".hero-container");

if (hero && heroContainer) {
    hero.addEventListener("mousemove", function (e) {
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

/* efecto giro antes de abrir demo */

const flipButtons = document.querySelectorAll(".btn-flip");

flipButtons.forEach(function (button) {
    button.addEventListener("click", function (e) {
        e.preventDefault();

        const url = this.href;

        this.classList.add("is-flipping");

        setTimeout(function () {
            window.open(url, "_blank", "noopener,noreferrer");
            button.classList.remove("is-flipping");
        }, 650);
    });
});




/* lanzamiento del sobre hacia contacto */

const envelopeLaunch = document.getElementById("envelopeLaunch");
const contactSection = document.getElementById("contacto");

if (envelopeLaunch && contactSection) {

    envelopeLaunch.addEventListener("click", function () {

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
            70;

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

            window.scrollTo(
                0,
                startPosition + distance * ease
            );

            if (progress < 1) {
                requestAnimationFrame(scrollAnimation);
            } else {
                flyingEnvelope.remove();
            }
        }

        requestAnimationFrame(scrollAnimation);
    });
}