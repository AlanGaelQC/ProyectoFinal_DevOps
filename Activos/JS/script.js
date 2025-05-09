// ==============================================
//                CONSTANTES
// ==============================================
const API_URL = 'http://52.5.101.7:3000/eventos';
const MUSIC_VOLUME = 0.3;
const DEBOUNCE_DELAY = 300;

// ==============================================
//                VARIABLES GLOBALES
// ==============================================
let currentEventId = null;
let isPlaying = false;
let musicEnabled = false;

// ==============================================
//                ELEMENTOS DEL DOM
// ==============================================
const music = document.getElementById('bg-music');
const musicBtn = document.getElementById('music-btn');
const eventModal = document.getElementById('eventModal');
const eventForm = document.getElementById('eventForm');
const modalTitle = document.getElementById('modalTitle');
const addEventBtn = document.getElementById('addEventBtn');
const registerForm = document.getElementById('registerForm');
const dynamicEventsContainer = document.getElementById('dynamicEvents');
const eventsTableBody = document.getElementById('eventsTableBody');

// ==============================================
//                INICIALIZACIÓN
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    initAudio();
    loadEvents();
    initModal();
    initAnimations();
    setupEventListeners();
});

// ==============================================
//                MANEJO DE AUDIO
// ==============================================
function initAudio() {
    music.volume = MUSIC_VOLUME;
    
    // Desbloquear audio en la primera interacción
    document.body.addEventListener('click', () => {
        if (!musicEnabled) {
            music.play()
                .then(() => {
                    music.pause();
                    music.currentTime = 0;
                    musicEnabled = true;
                    updateMusicButton();
                })
                .catch(console.error);
        }
    }, { once: true });
}

function toggleMusic() {
    if (!musicEnabled) {
        showNotification('Haz clic en la página primero para activar el audio', 'warning');
        return;
    }

    if (music.paused) {
        music.play().catch(err => {
            console.error('Error al reproducir:', err);
            showNotification('Error al reproducir música', 'error');
        });
    } else {
        music.pause();
    }
    updateMusicButton();
}

function updateMusicButton() {
    if (music.paused) {
        musicBtn.innerHTML = '🎵 <span class="btn-text">Reproducir Música</span>';
    } else {
        musicBtn.innerHTML = '⏸ <span class="btn-text">Pausar Música</span>';
    }
}

// ==============================================
//                CRUD DE EVENTOS
// ==============================================
async function loadEvents() {
    showLoading('Cargando eventos...');
    
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const events = await response.json();
        renderEvents(events);
    } catch (error) {
        console.error('Error cargando eventos:', error);
        showNotification('No se pudieron cargar los eventos', 'error');
    }
}

function renderEvents(events) {
    // Limpiar contenedores
    dynamicEventsContainer.innerHTML = '';
    eventsTableBody.innerHTML = '';

    if (events.length === 0) {
        showEmptyState();
        return;
    }

    // Renderizar eventos en tarjetas
    events.forEach(event => {
        const eventCard = createEventCard(event);
        dynamicEventsContainer.appendChild(eventCard);
    });

    // Renderizar eventos en tabla
    events.forEach(event => {
        const tableRow = createEventTableRow(event);
        eventsTableBody.appendChild(tableRow);
    });

    // Agregar event listeners a los botones
    addEventListeners();
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'race scroll-animate';
    card.dataset.id = event.id;
    
    card.innerHTML = `
        <img src="${event.imagen_url || 'imagenes/default-race.jpg'}" 
             alt="${event.nombre}" 
             loading="lazy">
        <div class="race-content">
            <h2>${event.nombre}</h2>
            <p>${event.descripcion}</p>
            <div class="race-actions">
                <button class="edit-btn" data-id="${event.id}">✏️ Editar</button>
                <button class="delete-btn" data-id="${event.id}">🗑️ Eliminar</button>
            </div>
        </div>
    `;
    
    return card;
}

function createEventTableRow(event) {
    const row = document.createElement('tr');
    row.className = 'scroll-animate';
    row.innerHTML = `
        <td>${event.nombre}</td>
        <td>${event.descripcion}</td>
        <td>
            ${event.imagen_url ? 
                `<a href="${event.imagen_url}" target="_blank" rel="noopener noreferrer">Ver imagen</a>` : 
                'Sin imagen'}
        </td>
        <td class="actions-cell">
            <button class="edit-btn" data-id="${event.id}">Editar</button>
            <button class="delete-btn" data-id="${event.id}">Eliminar</button>
        </td>
    `;
    
    return row;
}

function showEmptyState() {
    dynamicEventsContainer.innerHTML = `
        <div class="empty-state">
            <h3>No hay eventos disponibles</h3>
            <p>Crea tu primer evento usando el botón "Añadir Evento"</p>
        </div>
    `;
}

// ==============================================
//                OPERACIONES CRUD
// ==============================================
async function createEvent(eventData) {
    showLoading('Creando evento...');
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al crear evento');
        }
        
        const newEvent = await response.json();
        showNotification(`Evento "${newEvent.nombre}" creado con éxito`, 'success');
        return newEvent;
    } catch (error) {
        console.error('Error creando evento:', error);
        showNotification(`Error al crear evento: ${error.message}`, 'error');
        throw error;
    }
}

async function updateEvent(eventId, eventData) {
    showLoading('Actualizando evento...');
    
    try {
        const response = await fetch(`${API_URL}/${eventId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(eventData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al actualizar evento');
        }
        
        const updatedEvent = await response.json();
        showNotification(`Evento "${updatedEvent.nombre}" actualizado`, 'success');
        return updatedEvent;
    } catch (error) {
        console.error('Error actualizando evento:', error);
        showNotification(`Error al actualizar evento: ${error.message}`, 'error');
        throw error;
    }
}

async function deleteEvent(eventId) {
    showLoading('Eliminando evento...');
    
    try {
        const response = await fetch(`${API_URL}/${eventId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error al eliminar evento');
        }
        
        return true;
    } catch (error) {
        console.error('Error eliminando evento:', error);
        showNotification(`Error al eliminar evento: ${error.message}`, 'error');
        throw error;
    }
}

// ==============================================
//                MANEJO DE FORMULARIOS
// ==============================================
function initModal() {
    // Abrir modal para nuevo evento
    addEventBtn?.addEventListener('click', () => {
        currentEventId = null;
        modalTitle.textContent = 'Crear Nuevo Evento';
        eventForm.reset();
        openModal();
    });

    // Cerrar modal
    document.querySelector('.closeBtn')?.addEventListener('click', closeModal);

    // Cerrar al hacer clic fuera del modal
    eventModal.addEventListener('click', (e) => {
        if (e.target === eventModal) {
            closeModal();
        }
    });

    // Envío del formulario de evento
    eventForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const eventData = {
            nombre: document.getElementById('eventName').value.trim(),
            descripcion: document.getElementById('eventDescription').value.trim(),
            imagen_url: document.getElementById('eventImage').value.trim()
        };

        if (!validateEventForm(eventData)) return;

        try {
            if (currentEventId) {
                await updateEvent(currentEventId, eventData);
            } else {
                await createEvent(eventData);
            }
            
            closeModal();
            loadEvents(); // Recargar lista de eventos
        } catch (error) {
            console.error('Error en el formulario:', error);
        }
    });
}

function validateEventForm(eventData) {
    if (!eventData.nombre) {
        showNotification('El nombre del evento es obligatorio', 'warning');
        return false;
    }

    if (!eventData.descripcion) {
        showNotification('La descripción del evento es obligatoria', 'warning');
        return false;
    }

    if (eventData.imagen_url && !isValidUrl(eventData.imagen_url)) {
        showNotification('La URL de la imagen no es válida', 'warning');
        return false;
    }

    return true;
}

async function handleRegisterForm(e) {
    e.preventDefault();
    
    const user = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('password').value
    };

    if (!validateRegisterForm(user)) return;

    try {
        showLoading('Registrando usuario...');
        
        // Esta URL debería ser reemplazada por tu endpoint real de API Gateway
        const response = await fetch('https://TU_API_GATEWAY.execute-api.region.amazonaws.com/prod/register', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer tu_token_si_es_necesario'
            },
            body: JSON.stringify(user)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error en el servidor');
        }
        
        const data = await response.json();
        showNotification(data.message || '¡Registro exitoso!', 'success');
        registerForm.reset();
    } catch (error) {
        console.error('Error en el registro:', error);
        showNotification(`Error en el registro: ${error.message}`, 'error');
    }
}

function validateRegisterForm(user) {
    if (!user.name || !user.email || !user.password) {
        showNotification('Todos los campos son obligatorios', 'warning');
        return false;
    }

    if (!validateEmail(user.email)) {
        showNotification('Por favor ingresa un email válido', 'warning');
        return false;
    }

    if (user.password.length < 8) {
        showNotification('La contraseña debe tener al menos 8 caracteres', 'warning');
        return false;
    }

    return true;
}

// ==============================================
//                MANEJO DE EVENTOS
// ==============================================
function setupEventListeners() {
    // Música
    musicBtn.addEventListener('click', debounce(toggleMusic, DEBOUNCE_DELAY));
    
    // Formulario de registro
    registerForm?.addEventListener('submit', handleRegisterForm);
    
    // Eventos globales
    window.addEventListener('scroll', handleScroll);
}

function addEventListeners() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', debounce(handleEditEvent, DEBOUNCE_DELAY));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', debounce(handleDeleteEvent, DEBOUNCE_DELAY));
    });
}

async function handleEditEvent(e) {
    const eventId = e.target.dataset.id;
    
    try {
        showLoading('Cargando evento...');
        const response = await fetch(`${API_URL}/${eventId}`);
        
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        
        const event = await response.json();
        
        // Llenar formulario con datos del evento
        document.getElementById('eventId').value = event.id;
        document.getElementById('eventName').value = event.nombre;
        document.getElementById('eventDescription').value = event.descripcion;
        document.getElementById('eventImage').value = event.imagen_url || '';
        
        currentEventId = event.id;
        modalTitle.textContent = 'Editar Evento';
        openModal();
    } catch (error) {
        console.error('Error cargando evento:', error);
        showNotification('Error al cargar evento para editar', 'error');
    }
}

async function handleDeleteEvent(e) {
    const eventId = e.target.dataset.id;
    const eventName = e.target.closest('.race')?.querySelector('h2')?.textContent || 
                     e.target.closest('tr')?.querySelector('td:first-child')?.textContent;
    
    if (!confirm(`¿Eliminar permanentemente el evento "${eventName}"?`)) return;
    
    try {
        await deleteEvent(eventId);
        showNotification(`Evento "${eventName}" eliminado`, 'success');
        
        // Eliminar de la vista
        const eventElement = e.target.closest('.race') || e.target.closest('tr');
        if (eventElement) {
            eventElement.classList.add('fade-out');
            setTimeout(() => eventElement.remove(), 300);
        }
        
        // Recargar eventos si no quedan más
        if (document.querySelectorAll('.race').length === 0 || 
            document.querySelectorAll('tbody tr').length === 0) {
            loadEvents();
        }
    } catch (error) {
        console.error('Error eliminando evento:', error);
    }
}

// ==============================================
//                NOTIFICACIONES
// ==============================================
function showNotification(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // Limpiar notificaciones anteriores
    toast.className = 'toast';
    void toast.offsetWidth; // Trigger reflow

    // Configurar nueva notificación
    toast.textContent = message;
    toast.classList.add('show', type);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading(message) {
    // En una implementación real, podrías mostrar un spinner
    console.log(message);
}

// ==============================================
//                ANIMACIONES
// ==============================================
function initAnimations() {
    // Observar elementos para animaciones al hacer scroll
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    // Observar todos los elementos con la clase scroll-animate
    document.querySelectorAll('.scroll-animate').forEach(el => {
        observer.observe(el);
    });
}

function handleScroll() {
    // Podrías agregar más lógica de scroll aquí
}

// ==============================================
//                UTILIDADES
// ==============================================
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function openModal() {
    eventModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    eventModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ==============================================
//                MANEJO DE ERRORES
// ==============================================
window.addEventListener('error', (e) => {
    console.error('Error global:', e.message);
    showNotification('Ocurrió un error inesperado', 'error');
    return true;
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Error no capturado:', e.reason);
    showNotification('Ocurrió un error inesperado', 'error');
    e.preventDefault();
});