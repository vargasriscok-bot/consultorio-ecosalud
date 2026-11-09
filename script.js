/**
 * ==============================================================================
 * PROYECTO: CONSULTORIO MÉDICO ECOSALUD
 * ARCHIVO: script.js
 * NIVEL: BTH (Bachillerato Técnico Humanístico)
 * DESCRIPCIÓN: Lógica interactiva en JavaScript Vanilla (ES6 nativo).
 *              - Control del menú móvil responsivo.
 *              - Filtrado y búsqueda de servicios en tiempo real.
 *              - Asignación dinámica de médicos según especialidad.
 *              - Validación del formulario de reservas.
 *              - Almacenamiento local con LocalStorage (persistencia en cliente).
 *              - Integración con la API de enlaces de WhatsApp.
 *              - Acordeón de preguntas frecuentes.
 * ==============================================================================
 */

// Se ejecuta cuando el documento HTML está completamente cargado en memoria
document.addEventListener("DOMContentLoaded", () => {

    /* ==========================================================================
       1. NAVEGACIÓN Y MENÚ MÓVIL RESPONSIVO
       ========================================================================== */
    const menuBtn = document.getElementById("menu-toggle");
    const navLinks = document.getElementById("nav-links");

    if (menuBtn && navLinks) {
        // Alterna visibilidad del menú en pantallas pequeñas
        menuBtn.addEventListener("click", () => {
            navLinks.classList.toggle("active");
        });

        // Cierra el menú al presionar cualquier enlace
        document.querySelectorAll(".nav-links a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("active");
            });
        });
    }


    /* ==========================================================================
       2. FILTRO Y BÚSQUEDA DE SERVICIOS MÉDICOS
       ========================================================================== */
    const filterButtons = document.querySelectorAll(".filter-btn");
    const serviceCards = document.querySelectorAll(".service-card");
    const searchInput = document.getElementById("search-services");

    // Filtrar por categorías seleccionadas
    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const category = button.getAttribute("data-filter");
            const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
            filtrarServicios(category, query);
        });
    });

    // Búsqueda en tiempo real mediante el evento 'input'
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const query = e.target.value.toLowerCase().trim();
            const activeBtn = document.querySelector(".filter-btn.active");
            const category = activeBtn ? activeBtn.getAttribute("data-filter") : "all";
            filtrarServicios(category, query);
        });
    }

    function filtrarServicios(category, query) {
        serviceCards.forEach(card => {
            const cardCategory = card.getAttribute("data-category");
            const title = card.querySelector("h3").textContent.toLowerCase();
            const description = card.querySelector("p").textContent.toLowerCase();

            const coincideCategoria = (category === "all" || cardCategory === category);
            const coincideTexto = title.includes(query) || description.includes(query);

            if (coincideCategoria && coincideTexto) {
                card.style.display = "flex";
            } else {
                card.style.display = "none";
            }
        });
    }


    /* ==========================================================================
       3. SELECT DEPENDIENTE DE MÉDICOS Y RESTRICCIÓN DE FECHAS
       ========================================================================== */
    const specialtySelect = document.getElementById("specialty-select");
    const doctorSelect = document.getElementById("doctor-select");

    // Directorio de especialistas del consultorio médico
    const doctoresPorEspecialidad = {
        "medicina-general": [
            "Dr. Rodolfo Arturo Vargas Yuja (Turno Mañana y Tarde)"
        ],
        "laboratorio": [
            "Lic. Roberto Vargas (Analista Clínico)"
        ],
        "ecografia": [
            "Dr. Rodolfo Arturo Vargas Yuja (Imagenología y Ecografía)"
        ],
        "enfermeria": [
            "Lic. en Enfermería (Turno Mañana y Tarde)"
        ],
        "odontologia": [
            "Dr. Javier Ortiz (Odontología General)",
            "Dra. Valeria Castro (Ortodoncia)"
        ]
    };

    if (specialtySelect && doctorSelect) {
        specialtySelect.addEventListener("change", (e) => {
            const especialidad = e.target.value;
            doctorSelect.innerHTML = '<option value="">-- Seleccionar médico --</option>';

            if (doctoresPorEspecialidad[especialidad]) {
                doctoresPorEspecialidad[especialidad].forEach(doc => {
                    const opt = document.createElement("option");
                    opt.value = doc;
                    opt.textContent = doc;
                    doctorSelect.appendChild(opt);
                });
                doctorSelect.disabled = false;
            } else {
                doctorSelect.disabled = true;
            }
        });
    }

    // Configura la fecha mínima permitida para evitar citas en fechas pasadas
    const dateInput = document.getElementById("date-input");
    if (dateInput) {
        const fechaActual = new Date().toISOString().split("T")[0];
        dateInput.min = fechaActual;
    }


    /* ==========================================================================
       4. SISTEMA DE RESERVAS, PERSISTENCIA CON LOCALSTORAGE Y WHATSAPP
       ========================================================================== */
    const bookingForm = document.getElementById("booking-form");
    const appointmentsList = document.getElementById("appointments-list");
    const modal = document.getElementById("confirmation-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const btnSendWhatsApp = document.getElementById("modal-whatsapp-btn");

    let ultimaCita = null;

    // Cargar citas guardadas previamente en el navegador
    cargarCitas();

    if (bookingForm) {
        bookingForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const nombre = document.getElementById("patient-name").value.trim();
            const telefono = document.getElementById("patient-phone").value.trim();
            const especialidad = specialtySelect.options[specialtySelect.selectedIndex].text;
            const medico = doctorSelect.value;
            const fecha = dateInput.value;
            const hora = document.getElementById("time-select").value;
            const motivo = document.getElementById("patient-notes").value.trim() || "Consulta médica general";

            // Validación de seguridad en cliente
            if (!nombre || !telefono || !doctorSelect.value || !fecha || !hora) {
                mostrarNotificacion("Por favor completa todos los campos requeridos.");
                return;
            }

            // Estructura del turno registrado
            const nuevoTurno = {
                id: Date.now(),
                nombre,
                telefono,
                especialidad,
                medico,
                fecha,
                hora,
                motivo,
                fechaRegistro: new Date().toLocaleDateString("es-BO")
            };

            // Guardar en almacenamiento local
            guardarCitaEnStorage(nuevoTurno);
            cargarCitas();

            ultimaCita = nuevoTurno;
            mostrarModalResumen(nuevoTurno);

            // Reiniciar formulario
            bookingForm.reset();
            doctorSelect.disabled = true;
            doctorSelect.innerHTML = '<option value="">-- Elige primero una especialidad --</option>';

            mostrarNotificacion("Turno registrado correctamente en el sistema local.");
        });
    }

    function guardarCitaEnStorage(cita) {
        const citas = JSON.parse(localStorage.getItem("ecosalud_turnos")) || [];
        citas.unshift(cita);
        localStorage.setItem("ecosalud_turnos", JSON.stringify(citas));
    }

    function cargarCitas() {
        if (!appointmentsList) return;

        const citas = JSON.parse(localStorage.getItem("ecosalud_turnos")) || [];
        appointmentsList.innerHTML = "";

        if (citas.length === 0) {
            appointmentsList.innerHTML = `
                <div class="empty-tickets">
                    <p>No hay turnos registrados</p>
                    <span>Completa el formulario para reservar tu horario.</span>
                </div>
            `;
            return;
        }

        citas.forEach(cita => {
            const ticket = document.createElement("div");
            ticket.className = "appointment-ticket";
            ticket.innerHTML = `
                <button class="btn-cancel-ticket" title="Cancelar este turno" onclick="eliminarCita(${cita.id})">✕</button>
                <div class="ticket-header">
                    <span class="ticket-patient">${cita.nombre}</span>
                    <span class="ticket-status">Registrado</span>
                </div>
                <div class="ticket-body">
                    <strong>Especialidad:</strong> ${cita.especialidad}<br>
                    <strong>Médico:</strong> ${cita.medico}<br>
                    <strong>Fecha y Turno:</strong> ${cita.fecha} a las ${cita.hora}<br>
                    <strong>Contacto:</strong> ${cita.telefono}
                </div>
            `;
            appointmentsList.appendChild(ticket);
        });
    }

    // Función accesible de manera global para cancelar turno
    window.eliminarCita = function(id) {
        let citas = JSON.parse(localStorage.getItem("ecosalud_turnos")) || [];
        citas = citas.filter(c => c.id !== id);
        localStorage.setItem("ecosalud_turnos", JSON.stringify(citas));
        cargarCitas();
        mostrarNotificacion("El turno seleccionado fue cancelado.");
    };

    function mostrarModalResumen(cita) {
        const modalSummary = document.getElementById("modal-summary-content");
        if (modalSummary) {
            modalSummary.innerHTML = `
                <p><strong>Paciente:</strong> ${cita.nombre}</p>
                <p><strong>Especialidad:</strong> ${cita.especialidad}</p>
                <p><strong>Médico Asignado:</strong> ${cita.medico}</p>
                <p><strong>Fecha Programada:</strong> ${cita.fecha} (${cita.hora})</p>
                <p><strong>Teléfono Registrado:</strong> ${cita.telefono}</p>
                <p><strong>Motivo:</strong> ${cita.motivo}</p>
            `;
        }

        if (modal) {
            modal.classList.add("active");
        }
    }

    if (closeModalBtn) {
        closeModalBtn.addEventListener("click", () => {
            modal.classList.remove("active");
        });
    }

    // Envío del mensaje formal a la recepción de WhatsApp
    if (btnSendWhatsApp) {
        btnSendWhatsApp.addEventListener("click", () => {
            if (!ultimaCita) return;

            const mensaje = `Buenas tardes, Consultorio Médico Ecosalud.
Deseo confirmar el siguiente turno médico registrado:
- Paciente: ${ultimaCita.nombre}
- Especialidad: ${ultimaCita.especialidad}
- Profesional: ${ultimaCita.medico}
- Fecha: ${ultimaCita.fecha}
- Horario: ${ultimaCita.hora}
- Teléfono de contacto: ${ultimaCita.telefono}
- Motivo: ${ultimaCita.motivo}`;

            const numeroWhatsApp = "59157641628";
            const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(mensaje)}`;

            window.open(url, "_blank");
            modal.classList.remove("active");
        });
    }

    // Enlace de selección directa dentro de cada tarjeta de servicio
    document.querySelectorAll(".service-quick-select, .btn-link-action").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const servicio = e.target.getAttribute("data-target-service");
            if (specialtySelect && servicio) {
                specialtySelect.value = servicio;
                specialtySelect.dispatchEvent(new Event("change"));

                const seccionReserva = document.getElementById("reservas");
                if (seccionReserva) {
                    seccionReserva.scrollIntoView({ behavior: "smooth" });
                }
            }
        });
    });


    /* ==========================================================================
       5. PREGUNTAS FRECUENTES (FAQ ACORDEÓN)
       ========================================================================== */
    const faqCards = document.querySelectorAll(".faq-card");

    faqCards.forEach(card => {
        const headerBtn = card.querySelector(".faq-header");
        if (headerBtn) {
            headerBtn.addEventListener("click", () => {
                const estabaAbierto = card.classList.contains("active");

                faqCards.forEach(c => c.classList.remove("active"));

                if (!estabaAbierto) {
                    card.classList.add("active");
                }
            });
        }
    });


    /* ==========================================================================
       6. SISTEMA DE COMENTARIOS Y CALIFICACIÓN DE ESTRELLAS
       ========================================================================== */
    const starWidget = document.getElementById("star-rating-widget");
    const ratingInput = document.getElementById("comment-rating");
    const ratingLabel = document.getElementById("rating-label");
    const commentForm = document.getElementById("comment-form");
    const testimonialsGrid = document.getElementById("testimonials-grid");

    const textosRating = {
        1: "1 de 5 estrellas (Deficiente)",
        2: "2 de 5 estrellas (Regular)",
        3: "3 de 5 estrellas (Bueno)",
        4: "4 de 5 estrellas (Muy bueno)",
        5: "5 de 5 estrellas (Excelente)"
    };

    let actualizarEstrellas = function(valor) {};

    if (starWidget && ratingInput) {
        const starBtns = starWidget.querySelectorAll(".star-btn");

        actualizarEstrellas = function(valor) {
            starBtns.forEach(btn => {
                const btnVal = parseInt(btn.getAttribute("data-value"), 10);
                if (btnVal <= valor) {
                    btn.classList.add("active");
                } else {
                    btn.classList.remove("active");
                }
            });
            if (ratingLabel && textosRating[valor]) {
                ratingLabel.textContent = textosRating[valor];
            }
        };

        // Inicializar en 5 estrellas por defecto
        actualizarEstrellas(5);

        starBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                const valor = parseInt(btn.getAttribute("data-value"), 10);
                ratingInput.value = valor;
                actualizarEstrellas(valor);
            });

            btn.addEventListener("mouseenter", () => {
                const valor = parseInt(btn.getAttribute("data-value"), 10);
                starBtns.forEach(b => {
                    const bVal = parseInt(b.getAttribute("data-value"), 10);
                    if (bVal <= valor) {
                        b.classList.add("hovered");
                    } else {
                        b.classList.remove("hovered");
                    }
                });
            });
        });

        starWidget.addEventListener("mouseleave", () => {
            starBtns.forEach(b => b.classList.remove("hovered"));
            actualizarEstrellas(parseInt(ratingInput.value, 10));
        });
    }

    // Función para generar la tarjeta con el diseño idéntico a las existentes
    function crearTarjetaTestimonio(comentario) {
        const card = document.createElement("div");
        card.className = "testimonial-card";
        const estrellas = "★".repeat(comentario.rating) + "☆".repeat(5 - comentario.rating);

        card.innerHTML = `
            <div class="testimonial-stars">${estrellas}</div>
            <blockquote>"${comentario.texto}"</blockquote>
            <div class="patient-info">
                <strong>${comentario.nombre}</strong>
                <span>Paciente de ${comentario.servicio}</span>
            </div>
        `;
        return card;
    }

    function guardarComentarioEnStorage(comentario) {
        const comentarios = JSON.parse(localStorage.getItem("ecosalud_opiniones")) || [];
        comentarios.push(comentario);
        localStorage.setItem("ecosalud_opiniones", JSON.stringify(comentarios));
    }

    function cargarComentariosGuardados() {
        if (!testimonialsGrid) return;
        const comentarios = JSON.parse(localStorage.getItem("ecosalud_opiniones")) || [];
        comentarios.forEach(comentario => {
            const card = crearTarjetaTestimonio(comentario);
            testimonialsGrid.appendChild(card);
        });
    }

    // Cargar comentarios persistidos al iniciar la página
    cargarComentariosGuardados();

    if (commentForm && testimonialsGrid) {
        commentForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const nombre = document.getElementById("comment-name").value.trim();
            const servicio = document.getElementById("comment-service").value;
            const rating = parseInt(document.getElementById("comment-rating").value, 10) || 5;
            const texto = document.getElementById("comment-text").value.trim();

            if (!nombre || !servicio || !texto) {
                mostrarNotificacion("Por favor completa todos los campos del comentario.");
                return;
            }

            const nuevoComentario = {
                id: Date.now(),
                nombre,
                servicio,
                rating,
                texto,
                fecha: new Date().toLocaleDateString("es-BO")
            };

            // Guardar en LocalStorage para persistencia
            guardarComentarioEnStorage(nuevoComentario);

            // Agregar la nueva tarjeta al contenedor
            const tarjeta = crearTarjetaTestimonio(nuevoComentario);
            testimonialsGrid.appendChild(tarjeta);

            // Reiniciar formulario
            commentForm.reset();
            ratingInput.value = "5";
            actualizarEstrellas(5);

            mostrarNotificacion("¡Gracias por tu opinión! Tu comentario se ha publicado con éxito.");

            // Desplazamiento suave para ver el comentario publicado
            tarjeta.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
    }


    /* ==========================================================================
       7. NOTIFICACIONES TOAST DISCRETAS
       ========================================================================== */
    function mostrarNotificacion(mensaje) {
        let toast = document.getElementById("toast-notice");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "toast-notice";
            toast.className = "toast-notice";
            document.body.appendChild(toast);
        }

        toast.textContent = mensaje;
        toast.classList.add("show");

        setTimeout(() => {
            toast.classList.remove("show");
        }, 3200);
    }

});
