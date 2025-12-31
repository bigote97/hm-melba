/**
 * Aplicación principal usando el nuevo modelo de eventos
 * Mantiene compatibilidad con datos antiguos durante la transición
 */

import { FirebaseService } from './firebase-service.js';
import { EventsService } from './eventsService.js';
import { EVENT_TYPES } from './eventTypes.js';
import { formatTimestamp, inputDateToTimestamp, timestampToInputDate, now } from './dateUtils.js';
import { normalizeWeight, normalizeMedicationName } from './dataNormalizers.js';

let allEvents = [];
let allLegacyRecords = [];
let useEventsModel = false;

export class App {
    static async init() {
        try {
            await FirebaseService.initialize();
            EventsService.initialize();
            
            // Detectar qué modelo usar
            await this.detectDataModel();
            
            this.initializeEventListeners();
            await this.loadData();
        } catch (error) {
            let errorMessage = 'Error al inicializar la aplicación.';
            
            if (error.code?.startsWith('auth/')) {
                errorMessage = 'Error de autenticación. Por favor, recarga la página.';
            }
            
            document.getElementById('records').innerHTML = `
                <div class="error">
                    ${errorMessage}
                </div>
            `;
            this.showNotification(errorMessage);
        }
    }
    
    /**
     * Detecta si hay eventos (nuevo modelo) o solo registros antiguos
     */
    static async detectDataModel() {
        try {
            const events = await EventsService.listEvents('melba', { limit: 1 });
            useEventsModel = events.length > 0;
            
            // También cargar registros antiguos para compatibilidad
            try {
                allLegacyRecords = await FirebaseService.getAllRecords();
            } catch (e) {
                // Si falla, no hay datos antiguos, está bien
                allLegacyRecords = [];
            }
            
            if (useEventsModel) {
                console.log('✅ Usando modelo de eventos');
            } else if (allLegacyRecords.length > 0) {
                console.log('⚠️  Usando modelo antiguo (registros)');
            }
        } catch (error) {
            console.warn('No se pudo detectar modelo, usando compatibilidad:', error);
            useEventsModel = false;
        }
    }
    
    static async loadData() {
        try {
            if (useEventsModel) {
                // Cargar eventos
                allEvents = await EventsService.listEvents('melba');
                
                // Actualizar información actual desde eventos
                await this.updateCurrentInfoFromEvents();
                
                // Mostrar timeline
                this.displayEventsTimeline(allEvents);
                
                // Poblar filtros desde eventos
                this.populateFiltersFromEvents(allEvents);
            } else {
                // Modo compatibilidad: usar datos antiguos
                allLegacyRecords = await FirebaseService.getAllRecords();
                
                const currentData = await FirebaseService.getCurrentData();
                if (currentData) {
                    this.updateCurrentInfo(currentData);
                } else {
                    const lastRecord = allLegacyRecords[0];
                    if (lastRecord) {
                        this.updateCurrentInfo({
                            peso: lastRecord.peso,
                            date: lastRecord.date,
                            medicamentos: []
                        });
                    }
                }
                
                this.populateFilters(allLegacyRecords);
                this.displayRecords(allLegacyRecords);
            }
        } catch (error) {
            let errorMessage = 'Error al cargar los datos. Por favor, verifica tu conexión a internet.';
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/not-authorized') {
                errorMessage = 'Error de autenticación. Por favor, inicia sesión nuevamente.';
            }
            
            document.getElementById('records').innerHTML = `
                <div class="error">
                    ${errorMessage}
                </div>
            `;
            this.showNotification(errorMessage);
        }
    }
    
    /**
     * Actualiza la información actual derivada de eventos
     */
    static async updateCurrentInfoFromEvents() {
        try {
            // Obtener último peso
            const latestWeight = await EventsService.getLatestWeight('melba');
            if (latestWeight && latestWeight.data?.weightKg) {
                document.getElementById('currentWeight').textContent = `${latestWeight.data.weightKg} kg`;
                document.getElementById('lastUpdateDate').textContent = formatTimestamp(latestWeight.occurredAt);
            } else {
                document.getElementById('currentWeight').textContent = 'No registrado';
                document.getElementById('lastUpdateDate').textContent = '-';
            }
            
            // Obtener medicaciones activas
            const activeMeds = await EventsService.getActiveMedications('melba');
            const activeMedsContainer = document.getElementById('activeMeds');
            activeMedsContainer.innerHTML = '';
            
            if (activeMeds.length > 0) {
                activeMeds.forEach(med => {
                    const medElement = document.createElement('div');
                    medElement.classList.add('med-item');
                    
                    const endDate = med.data?.endAt 
                        ? formatTimestamp(med.data.endAt)
                        : 'Sin fecha de fin';
                    
                    medElement.innerHTML = `
                        <div class="med-name">${med.data?.name || 'Sin nombre'}</div>
                        <div class="med-date">Hasta: ${endDate}</div>
                        ${med.data?.instructions ? `<div class="med-info">${med.data.instructions}</div>` : ''}
                    `;
                    activeMedsContainer.appendChild(medElement);
                });
            } else {
                activeMedsContainer.innerHTML = '<div class="no-meds">Sin medicamentos activos</div>';
            }
        } catch (error) {
            console.error('Error al actualizar información actual:', error);
        }
    }
    
    /**
     * Muestra el timeline de eventos
     */
    static displayEventsTimeline(events) {
        const recordsContainer = document.getElementById('records');
        recordsContainer.innerHTML = '';
        
        if (events.length === 0) {
            recordsContainer.innerHTML = '<div class="no-events">No hay eventos registrados</div>';
            return;
        }
        
        // Agrupar eventos por fecha
        const eventsByDate = {};
        events.forEach(event => {
            const dateKey = formatTimestamp(event.occurredAt);
            if (!eventsByDate[dateKey]) {
                eventsByDate[dateKey] = [];
            }
            eventsByDate[dateKey].push(event);
        });
        
        // Ordenar fechas
        const sortedDates = Object.keys(eventsByDate).sort((a, b) => {
            const dateA = this.parseDate(a);
            const dateB = this.parseDate(b);
            return dateB - dateA; // Más reciente primero
        });
        
        // Renderizar eventos agrupados por fecha
        sortedDates.forEach(dateKey => {
            const dateEvents = eventsByDate[dateKey];
            
            const dateGroup = document.createElement('div');
            dateGroup.classList.add('event-date-group');
            dateGroup.innerHTML = `<h3 class="event-date-header">${dateKey}</h3>`;
            
            const eventsList = document.createElement('div');
            eventsList.classList.add('events-list');
            
            dateEvents.forEach(event => {
                const eventElement = this.createEventElement(event);
                eventsList.appendChild(eventElement);
            });
            
            dateGroup.appendChild(eventsList);
            recordsContainer.appendChild(dateGroup);
        });
    }
    
    /**
     * Crea el elemento DOM para un evento
     */
    static createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.classList.add('event', `event-${event.type.toLowerCase()}`);
        
        let content = '';
        
        switch (event.type) {
            case EVENT_TYPES.WEIGHT:
                content = `
                    <div class="event-icon">⚖️</div>
                    <div class="event-content">
                        <div class="event-title">Peso: ${event.data?.weightKg} kg</div>
                        ${event.notes ? `<div class="event-notes">${event.notes}</div>` : ''}
                    </div>
                `;
                break;
                
            case EVENT_TYPES.MEDICATION:
                const endDate = event.data?.endAt 
                    ? ` hasta ${formatTimestamp(event.data.endAt)}`
                    : ' (activa)';
                content = `
                    <div class="event-icon">💊</div>
                    <div class="event-content">
                        <div class="event-title">Medicación: ${event.data?.name}${endDate}</div>
                        ${event.data?.instructions ? `<div class="event-notes">${event.data.instructions}</div>` : ''}
                    </div>
                `;
                break;
                
            case EVENT_TYPES.VISIT:
                content = `
                    <div class="event-icon">🏥</div>
                    <div class="event-content">
                        <div class="event-title">Visita${event.data?.veterinarian ? ` - ${event.data.veterinarian}` : ''}</div>
                        ${event.notes ? `<div class="event-notes">${event.notes}</div>` : ''}
                    </div>
                `;
                break;
                
            case EVENT_TYPES.NOTE:
                content = `
                    <div class="event-icon">📝</div>
                    <div class="event-content">
                        <div class="event-title">Nota</div>
                        ${event.data?.text || event.notes ? `<div class="event-notes">${event.data?.text || event.notes}</div>` : ''}
                    </div>
                `;
                break;
                
            case EVENT_TYPES.LAB:
                content = `
                    <div class="event-icon">🔬</div>
                    <div class="event-content">
                        <div class="event-title">Laboratorio: ${event.data?.test} - ${event.data?.result}</div>
                        ${event.data?.findings?.length > 0 ? `<div class="event-notes">${event.data.findings.join(', ')}</div>` : ''}
                    </div>
                `;
                break;
                
            default:
                content = `
                    <div class="event-icon">📌</div>
                    <div class="event-content">
                        <div class="event-title">${event.type}</div>
                        ${event.notes ? `<div class="event-notes">${event.notes}</div>` : ''}
                    </div>
                `;
        }
        
        // Agregar tags si existen
        if (event.tags && event.tags.length > 0) {
            content += `<div class="event-tags">${event.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>`;
        }
        
        // Agregar acciones
        content += `
            <div class="event-actions">
                <button class="edit-event-btn" data-event-id="${event.id}">
                    <i class="ri-edit-line"></i>
                </button>
                <button class="delete-event-btn" data-event-id="${event.id}">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </div>
        `;
        
        eventElement.innerHTML = content;
        
        // Agregar listeners
        eventElement.querySelector('.delete-event-btn')?.addEventListener('click', () => {
            this.showDeleteConfirmation(event);
        });
        
        return eventElement;
    }
    
    // ... (mantener métodos de compatibilidad para datos antiguos)
    
    static initializeEventListeners() {
        // Filtros
        const applyFiltersBtn = document.getElementById('applyFilters');
        const clearFiltersBtn = document.getElementById('clearFilters');
        
        if (applyFiltersBtn) {
            applyFiltersBtn.addEventListener('click', () => this.filterData());
        }
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearFilters());
        }
        
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.filterData());
        }
        
        // Botón nuevo registro/evento
        const addRecordBtn = document.getElementById('addRecordBtn');
        if (addRecordBtn) {
            addRecordBtn.addEventListener('click', () => {
                if (useEventsModel) {
                    this.showAddEventPopup();
                } else {
                    this.showAddRecordPopup();
                }
            });
        }
        
        // Accordions
        document.querySelectorAll('.accordion-toggle').forEach(button => {
            button.addEventListener('click', () => {
                const section = button.closest('.accordion-section');
                section.classList.toggle('expanded');
            });
        });
    }
    
    static filterData() {
        if (useEventsModel) {
            this.filterEvents();
        } else {
            this.filterRecords();
        }
    }
    
    static filterEvents() {
        const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        
        let filtered = allEvents.filter(event => {
            const searchMatch = !searchText || 
                event.notes?.toLowerCase().includes(searchText) ||
                event.data?.name?.toLowerCase().includes(searchText) ||
                event.tags?.some(t => t.toLowerCase().includes(searchText));
            
            // Filtro de fechas (simplificado, se puede mejorar)
            let dateMatch = true;
            if (dateFrom || dateTo) {
                const eventDate = event.occurredAt.toDate();
                if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    dateMatch = dateMatch && eventDate >= fromDate;
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59);
                    dateMatch = dateMatch && eventDate <= toDate;
                }
            }
            
            return searchMatch && dateMatch;
        });
        
        this.displayEventsTimeline(filtered);
    }
    
    // Mantener métodos antiguos para compatibilidad
    static updateCurrentInfo(lastData) {
        if (lastData.peso) {
            document.getElementById('currentWeight').textContent = lastData.peso;
            document.getElementById('lastUpdateDate').textContent = this.formatDate(lastData.date);
        }
        
        const today = new Date();
        const activeMedsContainer = document.getElementById('activeMeds');
        activeMedsContainer.innerHTML = '';
        
        if (lastData.medicamentos && lastData.medicamentos.length > 0) {
            lastData.medicamentos.forEach(med => {
                const endDate = new Date(med.fechaFin);
                if (endDate > today) {
                    const medElement = document.createElement('div');
                    medElement.classList.add('med-item');
                    medElement.innerHTML = `
                        <div class="med-name">${med.nombre}</div>
                        <div class="med-date">Hasta: ${this.formatDate(med.fechaFin)}</div>
                        ${med.instrucciones ? `<div class="med-info">${med.instrucciones}</div>` : ''}
                    `;
                    activeMedsContainer.appendChild(medElement);
                }
            });
        }
        
        if (activeMedsContainer.children.length === 0) {
            activeMedsContainer.innerHTML = '<div class="no-meds">Sin medicamentos activos</div>';
        }
    }
    
    static filterRecords() {
        const searchText = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const dateFrom = document.getElementById('dateFrom')?.value;
        const dateTo = document.getElementById('dateTo')?.value;
        const selectedKeyword = document.getElementById('keywordSelect')?.value;
        const selectedDoctor = document.getElementById('doctorSelect')?.value;
        
        let filteredRecords = allLegacyRecords.filter(record => {
            const searchMatch = !searchText || 
                record.medico?.toLowerCase().includes(searchText) ||
                record.vacuna?.toLowerCase().includes(searchText) ||
                record.keywords?.some(k => k.toLowerCase().includes(searchText));
            
            const dateMatch = (!dateFrom || record.date >= dateFrom) && 
                            (!dateTo || record.date <= dateTo);
            
            const keywordMatch = !selectedKeyword || 
                record.keywords?.includes(selectedKeyword);
            
            const doctorMatch = !selectedDoctor || 
                record.medico === selectedDoctor;
            
            return searchMatch && dateMatch && keywordMatch && doctorMatch;
        });
        
        this.displayRecords(filteredRecords);
    }
    
    static displayRecords(records) {
        const recordsContainer = document.getElementById('records');
        recordsContainer.innerHTML = '';
        
        const sortOrder = document.getElementById('sortSelect')?.value || 'desc';
        const sortedRecords = [...records].sort((a, b) => {
            const dateA = this.parseDate(a.date);
            const dateB = this.parseDate(b.date);
            
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });
        
        sortedRecords.forEach(record => {
            const recordElement = document.createElement('div');
            recordElement.classList.add('record');
            recordElement.innerHTML = `
                <div class="record-header">
                    <h2>${record.date}</h2>
                </div>
                <p><strong>Consulta:</strong> ${record.consulta || "No registrada"}</p>
                <p><strong>Médico:</strong> ${record.medico || "No especificado"}</p>
                <p><strong>Vacuna:</strong> ${record.vacuna || "No aplicada"}</p>
                <p><strong>Peso:</strong> ${record.peso || "No registrado"}</p>
                <p><strong>Keywords:</strong> ${record.keywords?.join(", ") || "No hay keywords"}</p>
            `;
            recordsContainer.appendChild(recordElement);
        });
    }
    
    static populateFilters(records) {
        const keywordSet = new Set();
        records.forEach(record => {
            if (record.keywords) {
                record.keywords.forEach(keyword => keywordSet.add(keyword));
            }
        });
        
        const keywordSelect = document.getElementById('keywordSelect');
        if (keywordSelect) {
            keywordSelect.innerHTML = '<option value="">Seleccionar keyword...</option>';
            [...keywordSet].sort().forEach(keyword => {
                const option = document.createElement('option');
                option.value = keyword;
                option.textContent = keyword;
                keywordSelect.appendChild(option);
            });
        }
        
        const doctorSet = new Set();
        records.forEach(record => {
            if (record.medico) {
                doctorSet.add(record.medico);
            }
        });
        
        const doctorSelect = document.getElementById('doctorSelect');
        if (doctorSelect) {
            doctorSelect.innerHTML = '<option value="">Seleccionar médico...</option>';
            [...doctorSet].sort().forEach(doctor => {
                const option = document.createElement('option');
                option.value = doctor;
                option.textContent = doctor;
                doctorSelect.appendChild(option);
            });
        }
    }
    
    static populateFiltersFromEvents(events) {
        // Similar pero desde eventos
        const tagSet = new Set();
        events.forEach(event => {
            if (event.tags) {
                event.tags.forEach(tag => tagSet.add(tag));
            }
        });
        
        const keywordSelect = document.getElementById('keywordSelect');
        if (keywordSelect) {
            keywordSelect.innerHTML = '<option value="">Seleccionar tag...</option>';
            [...tagSet].sort().forEach(tag => {
                const option = document.createElement('option');
                option.value = tag;
                option.textContent = tag;
                keywordSelect.appendChild(option);
            });
        }
    }
    
    static clearFilters() {
        const searchInput = document.getElementById('searchInput');
        const dateFrom = document.getElementById('dateFrom');
        const dateTo = document.getElementById('dateTo');
        const keywordSelect = document.getElementById('keywordSelect');
        const doctorSelect = document.getElementById('doctorSelect');
        
        if (searchInput) searchInput.value = '';
        if (dateFrom) dateFrom.value = '';
        if (dateTo) dateTo.value = '';
        if (keywordSelect) keywordSelect.value = '';
        if (doctorSelect) doctorSelect.value = '';
        
        if (useEventsModel) {
            this.displayEventsTimeline(allEvents);
        } else {
            this.displayRecords(allLegacyRecords);
        }
    }
    
    static showAddEventPopup() {
        // Crear popup dinámico para crear eventos tipados
        const popup = document.createElement('div');
        popup.className = 'popup';
        popup.id = 'addEventPopup';
        popup.style.display = 'flex';
        
        popup.innerHTML = `
            <div class="popup-content" style="max-width: 600px;">
                <h2><i class="ri-add-line"></i> Nuevo Evento</h2>
                <form id="newEventForm">
                    <div class="form-group">
                        <label for="eventType">Tipo de Evento:</label>
                        <select id="eventType" required>
                            <option value="">Seleccionar tipo...</option>
                            <option value="WEIGHT">⚖️ Peso</option>
                            <option value="MEDICATION">💊 Medicación</option>
                            <option value="VISIT">🏥 Visita Veterinaria</option>
                            <option value="NOTE">📝 Nota</option>
                            <option value="LAB">🔬 Laboratorio</option>
                            <option value="DOSE">💉 Dosis</option>
                            <option value="FOOD">🍽️ Alimentación</option>
                            <option value="GROOMING">✂️ Aseo</option>
                            <option value="PURCHASE">🛒 Compra</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="eventDate">Fecha:</label>
                        <input type="date" id="eventDate" required>
                    </div>
                    
                    <div id="eventSpecificFields"></div>
                    
                    <div class="form-group">
                        <label for="eventTags">Tags (separados por coma):</label>
                        <input type="text" id="eventTags" placeholder="ej: control, vacunación">
                    </div>
                    
                    <div class="form-group">
                        <label for="eventNotes">Notas:</label>
                        <textarea id="eventNotes" rows="3"></textarea>
                    </div>
                    
                    <div class="popup-buttons">
                        <button type="submit" class="button-primary">
                            <i class="ri-save-line"></i> Guardar
                        </button>
                        <button type="button" class="button-secondary" onclick="this.closest('.popup').remove()">
                            <i class="ri-close-line"></i> Cancelar
                        </button>
                    </div>
                </form>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        // Configurar fecha por defecto (hoy)
        const dateInput = popup.querySelector('#eventDate');
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
        
        // Cambiar campos según el tipo de evento
        const typeSelect = popup.querySelector('#eventType');
        typeSelect.addEventListener('change', () => {
            this.updateEventFormFields(typeSelect.value, popup.querySelector('#eventSpecificFields'));
        });
        
        // Cerrar al hacer clic fuera
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                popup.remove();
            }
        });
        
        // Manejar envío del formulario
        const form = popup.querySelector('#newEventForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewEvent(e, popup);
        });
    }
    
    static updateEventFormFields(eventType, container) {
        container.innerHTML = '';
        
        switch (eventType) {
            case 'WEIGHT':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="weightKg">Peso (kg):</label>
                        <input type="number" id="weightKg" step="0.001" required>
                    </div>
                `;
                break;
                
            case 'MEDICATION':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="medName">Nombre del Medicamento:</label>
                        <input type="text" id="medName" required>
                    </div>
                    <div class="form-group">
                        <label for="medStartDate">Fecha de Inicio:</label>
                        <input type="date" id="medStartDate">
                    </div>
                    <div class="form-group">
                        <label for="medEndDate">Fecha de Fin (opcional):</label>
                        <input type="date" id="medEndDate">
                    </div>
                    <div class="form-group">
                        <label for="medInstructions">Instrucciones:</label>
                        <textarea id="medInstructions" rows="2"></textarea>
                    </div>
                `;
                break;
                
            case 'VISIT':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="visitVet">Veterinario:</label>
                        <input type="text" id="visitVet">
                    </div>
                    <div class="form-group">
                        <label for="visitReason">Motivo:</label>
                        <input type="text" id="visitReason">
                    </div>
                    <div class="form-group">
                        <label for="visitDiagnosis">Diagnóstico:</label>
                        <textarea id="visitDiagnosis" rows="2"></textarea>
                    </div>
                `;
                break;
                
            case 'NOTE':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="noteText">Texto:</label>
                        <textarea id="noteText" rows="3"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="noteSymptoms">Síntomas (separados por coma):</label>
                        <input type="text" id="noteSymptoms" placeholder="ej: diarrea, vómito">
                    </div>
                `;
                break;
                
            case 'LAB':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="labTest">Tipo de Prueba:</label>
                        <select id="labTest">
                            <option value="COPRO">Copro</option>
                            <option value="ORINA">Orina</option>
                            <option value="SANGRE">Sangre</option>
                            <option value="">Otro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="labResult">Resultado:</label>
                        <select id="labResult">
                            <option value="POSITIVE">Positivo</option>
                            <option value="NEGATIVE">Negativo</option>
                            <option value="UNKNOWN">Desconocido</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="labFindings">Hallazgos (separados por coma):</label>
                        <input type="text" id="labFindings">
                    </div>
                `;
                break;
                
            case 'DOSE':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="doseMedication">Medicamento:</label>
                        <input type="text" id="doseMedication" required>
                    </div>
                    <div class="form-group">
                        <label for="doseAmount">Cantidad:</label>
                        <input type="text" id="doseAmount">
                    </div>
                `;
                break;
                
            case 'FOOD':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="foodKind">Tipo:</label>
                        <select id="foodKind">
                            <option value="RECIPE">Receta</option>
                            <option value="RATION">Ración</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="foodIngredients">Ingredientes (uno por línea, formato: nombre cantidad unidad):</label>
                        <textarea id="foodIngredients" rows="5" placeholder="ej:&#10;pollo 600 g&#10;zanahoria 300 g&#10;aceite 30 ml"></textarea>
                    </div>
                `;
                break;
                
            case 'GROOMING':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="groomingService">Servicio:</label>
                        <input type="text" id="groomingService" value="BAÑO">
                    </div>
                    <div class="form-group">
                        <label for="groomingPrice">Precio (ARS):</label>
                        <input type="number" id="groomingPrice" step="0.01">
                    </div>
                `;
                break;
                
            case 'PURCHASE':
                container.innerHTML = `
                    <div class="form-group">
                        <label for="purchaseItem">Item:</label>
                        <input type="text" id="purchaseItem" required>
                    </div>
                    <div class="form-group">
                        <label for="purchasePrice">Precio (ARS):</label>
                        <input type="number" id="purchasePrice" step="0.01">
                    </div>
                `;
                break;
        }
    }
    
    static async handleNewEvent(e, popup) {
        e.preventDefault();
        
        try {
            const eventType = popup.querySelector('#eventType').value;
            const occurredAt = inputDateToTimestamp(popup.querySelector('#eventDate').value);
            const tags = popup.querySelector('#eventTags').value
                .split(',')
                .map(t => t.trim())
                .filter(t => t !== '');
            const notes = popup.querySelector('#eventNotes').value;
            
            let eventData = {};
            
            // Construir data según el tipo
            switch (eventType) {
                case 'WEIGHT':
                    const weightKg = parseFloat(popup.querySelector('#weightKg').value);
                    if (isNaN(weightKg)) {
                        throw new Error('Peso inválido');
                    }
                    eventData = { weightKg };
                    break;
                    
                case 'MEDICATION':
                    const medName = popup.querySelector('#medName').value;
                    if (!medName) {
                        throw new Error('Nombre del medicamento requerido');
                    }
                    const medStartDate = popup.querySelector('#medStartDate').value;
                    const medEndDate = popup.querySelector('#medEndDate').value;
                    eventData = {
                        name: normalizeMedicationName(medName),
                        startAt: medStartDate ? inputDateToTimestamp(medStartDate) : occurredAt,
                        endAt: medEndDate ? inputDateToTimestamp(medEndDate) : null,
                        instructions: popup.querySelector('#medInstructions').value || undefined
                    };
                    break;
                    
                case 'VISIT':
                    eventData = {
                        veterinarian: popup.querySelector('#visitVet').value || undefined,
                        reason: popup.querySelector('#visitReason').value || undefined,
                        diagnosis: popup.querySelector('#visitDiagnosis').value || undefined
                    };
                    break;
                    
                case 'NOTE':
                    const noteText = popup.querySelector('#noteText').value;
                    const noteSymptoms = popup.querySelector('#noteSymptoms').value
                        .split(',')
                        .map(s => s.trim())
                        .filter(s => s !== '');
                    eventData = {
                        text: noteText || undefined,
                        symptoms: noteSymptoms.length > 0 ? noteSymptoms : undefined
                    };
                    break;
                    
                case 'LAB':
                    eventData = {
                        test: popup.querySelector('#labTest').value || undefined,
                        result: popup.querySelector('#labResult').value || 'UNKNOWN',
                        findings: popup.querySelector('#labFindings').value
                            .split(',')
                            .map(f => f.trim())
                            .filter(f => f !== '')
                    };
                    break;
                    
                case 'DOSE':
                    eventData = {
                        medicationName: popup.querySelector('#doseMedication').value,
                        amount: popup.querySelector('#doseAmount').value || undefined
                    };
                    break;
                    
                case 'FOOD':
                    // Parsear ingredientes (formato simple)
                    const ingredientsText = popup.querySelector('#foodIngredients').value;
                    const ingredients = [];
                    if (ingredientsText) {
                        ingredientsText.split('\n').forEach(line => {
                            const trimmed = line.trim();
                            if (trimmed) {
                                // Intentar parsear: "nombre cantidad unidad" o "nombre cantidad"
                                const parts = trimmed.split(/\s+/);
                                if (parts.length >= 2) {
                                    const name = parts[0];
                                    const amount = parseFloat(parts[1]);
                                    const unit = parts[2] || 'g';
                                    ingredients.push({
                                        name,
                                        grams: unit === 'g' || unit === 'gramos' ? amount : undefined,
                                        ml: unit === 'ml' ? amount : undefined,
                                        amount: isNaN(amount) ? undefined : amount,
                                        unit: isNaN(amount) ? unit : undefined
                                    });
                                } else {
                                    ingredients.push({ note: trimmed });
                                }
                            }
                        });
                    }
                    eventData = {
                        kind: popup.querySelector('#foodKind').value || 'UNKNOWN',
                        ingredients
                    };
                    break;
                    
                case 'GROOMING':
                    eventData = {
                        service: popup.querySelector('#groomingService').value || 'BAÑO',
                        priceArs: popup.querySelector('#groomingPrice').value ? 
                            parseFloat(popup.querySelector('#groomingPrice').value) : undefined
                    };
                    break;
                    
                case 'PURCHASE':
                    eventData = {
                        item: popup.querySelector('#purchaseItem').value,
                        priceArs: popup.querySelector('#purchasePrice').value ? 
                            parseFloat(popup.querySelector('#purchasePrice').value) : undefined
                    };
                    break;
            }
            
            // Crear evento usando EventFactory
            const { EventFactory, EVENT_TYPES, EVENT_SOURCES } = await import('./eventTypes.js');
            
            let event;
            switch (eventType) {
                case 'WEIGHT':
                    event = EventFactory.createWeightEvent(
                        eventData.weightKg,
                        occurredAt,
                        { source: EVENT_SOURCES.MANUAL, tags, notes }
                    );
                    break;
                    
                case 'MEDICATION':
                    event = EventFactory.createMedicationEvent(
                        eventData.name,
                        eventData.startAt,
                        eventData.endAt,
                        {
                            instructions: eventData.instructions,
                            source: EVENT_SOURCES.MANUAL,
                            tags,
                            notes
                        }
                    );
                    break;
                    
                case 'VISIT':
                    event = EventFactory.createVisitEvent(occurredAt, {
                        veterinarian: eventData.veterinarian,
                        reason: eventData.reason,
                        diagnosis: eventData.diagnosis,
                        source: EVENT_SOURCES.MANUAL,
                        tags,
                        notes
                    });
                    break;
                    
                case 'NOTE':
                    event = EventFactory.createNoteEvent(occurredAt, {
                        text: eventData.text,
                        symptoms: eventData.symptoms,
                        source: EVENT_SOURCES.MANUAL,
                        tags,
                        notes
                    });
                    break;
                    
                case 'LAB':
                    event = EventFactory.createLabEvent(
                        eventData.test || 'UNKNOWN',
                        eventData.result || 'UNKNOWN',
                        occurredAt,
                        {
                            findings: eventData.findings,
                            source: EVENT_SOURCES.MANUAL,
                            tags,
                            notes
                        }
                    );
                    break;
                    
                default:
                    // Para otros tipos, crear estructura básica
                    event = {
                        type: eventType,
                        occurredAt,
                        createdAt: now(),
                        createdBy: 'manual',
                        source: EVENT_SOURCES.MANUAL,
                        tags,
                        notes,
                        data: eventData
                    };
            }
            
            // Guardar evento
            await EventsService.addEvent('melba', event);
            
            // Recargar datos
            await this.loadData();
            
            // Cerrar popup
            popup.remove();
            
            this.showNotification('Evento creado exitosamente');
            
        } catch (error) {
            console.error('Error al crear evento:', error);
            this.showNotification(`Error al crear el evento: ${error.message}`);
        }
    }
    
    static showAddRecordPopup() {
        // Mantener popup antiguo para compatibilidad
        const addRecordPopup = document.getElementById('addRecordPopup');
        if (addRecordPopup) {
            addRecordPopup.style.display = 'flex';
            const today = new Date();
            const dateStr = today.toISOString().split('T')[0];
            const dateInput = document.getElementById('recordDate');
            if (dateInput) {
                dateInput.value = dateStr;
            }
        }
    }
    
    static showDeleteConfirmation(event) {
        const popup = document.createElement('div');
        popup.className = 'popup-overlay';
        popup.innerHTML = `
            <div class="popup-content">
                <h3>Confirmar eliminación</h3>
                <p>¿Estás seguro que deseas eliminar este evento?</p>
                <div class="popup-buttons">
                    <button class="cancel-btn">Cancelar</button>
                    <button class="confirm-btn">Eliminar</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        popup.querySelector('.cancel-btn').addEventListener('click', () => {
            document.body.removeChild(popup);
        });
        
        popup.querySelector('.confirm-btn').addEventListener('click', async () => {
            try {
                await EventsService.deleteEvent('melba', event.id);
                await this.loadData();
                document.body.removeChild(popup);
                this.showNotification('Evento eliminado exitosamente');
            } catch (error) {
                this.showNotification('Error al eliminar el evento');
            }
        });
        
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                document.body.removeChild(popup);
            }
        });
    }
    
    static formatDate(dateString) {
        return dateString || '';
    }
    
    static parseDate(dateString) {
        if (!dateString) return new Date();
        const [day, month, year] = dateString.split('/');
        const fullYear = '20' + year;
        return new Date(`${fullYear}-${month}-${day}`);
    }
    
    static showNotification(message) {
        const notification = document.getElementById('errorNotification');
        if (!notification) return;
        
        const messageElement = notification.querySelector('.notification-message');
        if (messageElement) {
            messageElement.textContent = message;
        }
        
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 5000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
