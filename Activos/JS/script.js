// ==============================================
//                CONSTANTES
// ==============================================
const API_URL = 'http://52.5.101.7:3000/eventos';
const MUSIC_VOLUME = 0.3;
const DEBOUNCE_DELAY = 300;

// Configuración de Firebase (REEMPLAZA CON TUS DATOS)
const firebaseConfig = {
    apiKey: "TU_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.appspot.com",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID"
};

// ==============================================
//                VARIABLES GLOBALES
// ==============================================
let currentEventId = null;
let isPlaying = false;
let musicEnabled = false;
let cart = []; // Para el sistema de carrito

// ==============================================
//                INICIALIZACIÓN
// ==============================================
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();
    const auth = firebase.auth();
    
    initAudio();
    loadEvents();
    initModal();
    initAnimations();
    setupEventListeners();
    initStore(); // Inicializar la tienda/carrito
    
    // Escuchar cambios de autenticación
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Usuario logueado:", user.email);
        } else {
            console.log("Usuario no logueado");
        }
    });
});

// ==============================================
//                MANEJO DE AUDIO
// ==============================================
function initAudio() {
    const music = document.getElementById('bg-music');
    music.volume = MUSIC_VOLUME;
    
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
    const music = document.getElementById('bg-music');
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
    const musicBtn = document.getElementById('music-btn');
    const music = document.getElementById('bg-music');
    
    if (music.paused) {
        musicBtn.innerHTML = '🎵 <span class="btn-text">Reproducir Música</span>';
    } else {
        musicBtn.innerHTML = '⏸ <span class="btn-text">Pausar Música</span>';
    }
}

// ==============================================
//                AUTENTICACIÓN
// ==============================================
async function handleRegisterForm(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const name = document.getElementById('name').value.trim();

    try {
        showLoading('Creando cuenta...');
        const auth = firebase.auth();
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Guardar información adicional del usuario en Firestore
        const db = firebase.firestore();
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('¡Registro exitoso!', 'success');
        document.getElementById('registerForm').reset();
    } catch (error) {
        console.error('Error en registro:', error);
        showNotification(getAuthErrorMessage(error.code), 'error');
    }
}

function getAuthErrorMessage(errorCode) {
    const messages = {
        'auth/email-already-in-use': 'El email ya está registrado',
        'auth/invalid-email': 'Email no válido',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta'
    };
    return messages[errorCode] || 'Ocurrió un error inesperado';
}

// ==============================================
//                CRUD DE EVENTOS (FIRESTORE)
// ==============================================
async function loadEvents() {
    showLoading('Cargando eventos...');
    
    try {
        const db = firebase.firestore();
        const snapshot = await db.collection('events').get();
        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        renderEvents(events);
    } catch (error) {
        console.error('Error cargando eventos:', error);
        showNotification('No se pudieron cargar los eventos', 'error');
    }
}

async function createEvent(eventData) {
    try {
        showLoading('Creando evento...');
        const db = firebase.firestore();
        const docRef = await db.collection('events').add({
            ...eventData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: firebase.auth().currentUser?.uid || 'anonymous'
        });
        
        showNotification('Evento creado con éxito', 'success');
        return { id: docRef.id, ...eventData };
    } catch (error) {
        console.error('Error creando evento:', error);
        showNotification('Error al crear evento', 'error');
        throw error;
    }
}

async function updateEvent(eventId, eventData) {
    try {
        showLoading('Actualizando evento...');
        const db = firebase.firestore();
        await db.collection('events').doc(eventId).update(eventData);
        
        showNotification('Evento actualizado', 'success');
        return { id: eventId, ...eventData };
    } catch (error) {
        console.error('Error actualizando evento:', error);
        showNotification('Error al actualizar evento', 'error');
        throw error;
    }
}

async function deleteEvent(eventId) {
    try {
        showLoading('Eliminando evento...');
        const db = firebase.firestore();
        await db.collection('events').doc(eventId).delete();
        
        showNotification('Evento eliminado', 'success');
        return true;
    } catch (error) {
        console.error('Error eliminando evento:', error);
        showNotification('Error al eliminar evento', 'error');
        throw error;
    }
}

// ==============================================
//                SISTEMA DE CARRITO
// ==============================================
function initStore() {
    renderTickets();
    updateCartUI();
    
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart')) {
            const ticketId = e.target.dataset.id;
            addToCart(ticketId);
        }
        
        if (e.target.classList.contains('remove-from-cart')) {
            const ticketId = e.target.dataset.id;
            removeFromCart(ticketId);
        }
    });
    
    document.getElementById('checkoutBtn')?.addEventListener('click', proceedToCheckout);
}

function renderTickets() {
    const container = document.getElementById('ticketsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="ticket-card">
            <h3>Entrada General</h3>
            <p>Acceso a todas las carreras del día</p>
            <p class="ticket-price">$50.00</p>
            <button class="add-to-cart" data-id="general">Añadir al Carrito</button>
        </div>
        
        <div class="ticket-card">
            <h3>Entrada VIP</h3>
            <p>Acceso VIP + Área exclusiva</p>
            <p class="ticket-price">$120.00</p>
            <button class="add-to-cart" data-id="vip">Añadir al Carrito</button>
        </div>
        
        <div class="ticket-card">
            <h3>Pase de Temporada</h3>
            <p>Acceso a todas las carreras del año</p>
            <p class="ticket-price">$300.00</p>
            <button class="add-to-cart" data-id="season">Añadir al Carrito</button>
        </div>
    `;
}

function addToCart(ticketId) {
    const tickets = {
        general: { name: 'Entrada General', price: 50, id: 'general' },
        vip: { name: 'Entrada VIP', price: 120, id: 'vip' },
        season: { name: 'Pase de Temporada', price: 300, id: 'season' }
    };
    
    cart.push(tickets[ticketId]);
    updateCartUI();
    showNotification(`${tickets[ticketId].name} añadida al carrito`, 'success');
}

function removeFromCart(ticketId) {
    const index = cart.findIndex(item => item.id === ticketId);
    if (index !== -1) {
        cart.splice(index, 1);
        updateCartUI();
    }
}

function updateCartUI() {
    const cartItemsEl = document.getElementById('cartItems');
    const cartCountEl = document.getElementById('cartCount');
    const cartTotalEl = document.getElementById('cartTotal');
    
    if (!cartItemsEl || !cartCountEl || !cartTotalEl) return;
    
    const itemCounts = {};
    cart.forEach(item => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
    });
    
    cartItemsEl.innerHTML = Object.entries(itemCounts)
        .map(([name, count]) => `
            <div class="cart-item">
                <span>${name} x${count}</span>
                <button class="remove-from-cart" data-id="${name.toLowerCase().replace(' ', '-')}">Eliminar</button>
            </div>
        `).join('');
    
    cartCountEl.textContent = cart.length;
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    cartTotalEl.textContent = total.toFixed(2);
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        return;
    }
    
    showNotification('Redirigiendo a pasarela de pago...', 'info');
    // Aquí iría la integración con Stripe/PayPal en un entorno real
}

// ==============================================
//                MANEJO DE EVENTOS
// ==============================================
function setupEventListeners() {
    const musicBtn = document.getElementById('music-btn');
    const registerForm = document.getElementById('registerForm');
    
    if (musicBtn) musicBtn.addEventListener('click', debounce(toggleMusic, DEBOUNCE_DELAY));
    if (registerForm) registerForm.addEventListener('submit', handleRegisterForm);
    
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
        const db = firebase.firestore();
        const doc = await db.collection('events').doc(eventId).get();
        
        if (!doc.exists) {
            throw new Error('Evento no encontrado');
        }
        
        const event = { id: doc.id, ...doc.data() };
        
        document.getElementById('eventId').value = event.id;
        document.getElementById('eventName').value = event.nombre;
        document.getElementById('eventDescription').value = event.descripcion;
        document.getElementById('eventImage').value = event.imagen_url || '';
        
        currentEventId = event.id;
        document.getElementById('modalTitle').textContent = 'Editar Evento';
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
        
        const eventElement = e.target.closest('.race') || e.target.closest('tr');
        if (eventElement) {
            eventElement.classList.add('fade-out');
            setTimeout(() => eventElement.remove(), 300);
        }
        
        if (document.querySelectorAll('.race').length === 0 || 
            document.querySelectorAll('tbody tr').length === 0) {
            loadEvents();
        }
    } catch (error) {
        console.error('Error eliminando evento:', error);
    }
}

// ==============================================
//                MANEJO DE MODAL
// ==============================================
function initModal() {
    const addEventBtn = document.getElementById('addEventBtn');
    const eventModal = document.getElementById('eventModal');
    const eventForm = document.getElementById('eventForm');
    
    if (addEventBtn) {
        addEventBtn.addEventListener('click', () => {
            currentEventId = null;
            document.getElementById('modalTitle').textContent = 'Crear Nuevo Evento';
            eventForm.reset();
            openModal();
        });
    }

    document.querySelector('.closeBtn')?.addEventListener('click', closeModal);

    if (eventModal) {
        eventModal.addEventListener('click', (e) => {
            if (e.target === eventModal) {
                closeModal();
            }
        });
    }

    if (eventForm) {
        eventForm.addEventListener('submit', async (e) => {
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
                loadEvents();
            } catch (error) {
                console.error('Error en el formulario:', error);
            }
        });
    }
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

function openModal() {
    const eventModal = document.getElementById('eventModal');
    if (eventModal) {
        eventModal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const eventModal = document.getElementById('eventModal');
    if (eventModal) {
        eventModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// ==============================================
//                RENDERIZADO DE EVENTOS
// ==============================================
function renderEvents(events) {
    const container = document.getElementById('dynamicEvents');
    const tableBody = document.getElementById('eventsTableBody');
    
    if (!container || !tableBody) return;

    container.innerHTML = '';
    tableBody.innerHTML = '';

    if (events.length === 0) {
        showEmptyState();
        return;
    }

    events.forEach(event => {
        const raceDiv = document.createElement('div');
        raceDiv.className = 'race scroll-animate';
        raceDiv.dataset.id = event.id;
        
        raceDiv.innerHTML = `
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
        
        container.appendChild(raceDiv);
    });

    events.forEach(event => {
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
        
        tableBody.appendChild(row);
    });

    addEventListeners();
}

function showEmptyState() {
    const container = document.getElementById('dynamicEvents');
    if (container) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No hay eventos disponibles</h3>
                <p>Crea tu primer evento usando el botón "Añadir Evento"</p>
            </div>
        `;
    }
}

// ==============================================
//                NOTIFICACIONES
// ==============================================
function showNotification(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.className = 'toast';
    void toast.offsetWidth; // Trigger reflow

    toast.textContent = message;
    toast.classList.add('show', type);
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function showLoading(message) {
    console.log(message); // En producción podrías mostrar un spinner
}

// ==============================================
//                ANIMACIONES
// ==============================================
function initAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-animate').forEach(el => {
        observer.observe(el);
    });
}

function handleScroll() {
    // Lógica adicional de scroll si es necesaria
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