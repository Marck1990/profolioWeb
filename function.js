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





